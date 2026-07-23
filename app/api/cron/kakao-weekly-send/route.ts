import { SolapiMessageService } from "solapi";
import { createAdminClient } from "@/lib/supabase/admin";

interface LeadRow {
  id: string;
  phone: string;
  brand_ids: string[];
  categories: string[];
  last_sent_at: string | null;
}

interface CareersJobRow {
  id: string;
  title: string;
  created_at: string;
}

interface JobRow {
  id: string;
  title: string;
  brand_id: string;
  job_category: string;
  created_at: string;
}

const EPOCH = "1970-01-01T00:00:00Z";

// 상시 인재풀/인재 Pool 등록 공고는 "신규 채용 공고"가 아니라 상시 접수용 안내이므로 발송에서 제외한다.
const TALENT_POOL_PATTERN = /인재\s*풀|인재\s*pool|talent\s*pool/i;

function isTalentPool(title: string): boolean {
  return TALENT_POOL_PATTERN.test(title);
}

// SOLAPI 브랜드 메시지(TEXT형)는 치환변수 적용 후 전체 본문이 1300자를 넘으면 발송 자체가
// 실패한다. 관심 카테고리를 넓게 선택한 구독자는 신규 공고가 수십~수백 건까지 잡힐 수 있어서,
// 변수 하나당 보여줄 공고 수를 제한하고 나머지는 "더보기" 링크로 유도한다.
const MAX_ITEMS_PER_SECTION = 3;

function formatJobLines(
  jobs: { title: string; url: string; brandName?: string }[],
  moreUrl: string
): string {
  if (jobs.length === 0) return "이번 주 신규 공고가 없어요.";
  const shown = jobs.slice(0, MAX_ITEMS_PER_SECTION);
  const lines = shown.map(
    (j) => `· ${j.brandName ? `[${j.brandName}] ` : ""}${j.title}\n  ${j.url}`
  );
  const remaining = jobs.length - shown.length;
  if (remaining > 0) {
    lines.push(`…외 ${remaining}건 더보기\n  ${moreUrl}`);
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;
  const manualSecret = process.env.APIFY_WEBHOOK_SECRET;
  const isVercelCron =
    cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  const isManualCall = manualSecret && url.searchParams.get("secret") === manualSecret;
  if (!isVercelCron && !isManualCall) {
    return Response.json({ error: "invalid secret" }, { status: 401 });
  }

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PF_ID;
  const templateId = process.env.SOLAPI_TEMPLATE_ID;
  const siteUrl = process.env.SITE_BASE_URL;
  if (!apiKey || !apiSecret || !pfId || !templateId || !siteUrl) {
    return Response.json(
      {
        error:
          "solapi not fully configured (SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_PF_ID/SOLAPI_TEMPLATE_ID/SITE_BASE_URL)",
      },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ error: "supabase not configured" }, { status: 500 });
  }

  const [leadsRes, careersJobsRes, jobsRes, brandsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, phone, brand_ids, categories, last_sent_at")
      .eq("unsubscribed", false)
      .eq("is_channel_friend", true),
    supabase.from("careers_jobs").select("id, title, created_at").eq("status", "open"),
    supabase
      .from("jobs")
      .select("id, title, brand_id, job_category, created_at")
      .eq("status", "open"),
    supabase.from("brands").select("id, name"),
  ]);

  const leads = (leadsRes.data as LeadRow[]) ?? [];
  const careersJobs = (careersJobsRes.data as CareersJobRow[]) ?? [];
  const jobs = (jobsRes.data as JobRow[]) ?? [];
  const brandNameById = new Map((brandsRes.data ?? []).map((b) => [b.id, b.name as string]));

  if (leads.length === 0) {
    return Response.json({ ok: true, targeted: 0, sent: 0, skipped: 0 });
  }

  const messageService = new SolapiMessageService(apiKey, apiSecret);

  const messages: {
    to: string;
    from: string;
    kakaoOptions: {
      pfId: string;
      templateId: string;
      variables: Record<string, string>;
      disableSms: boolean;
      bms: { targeting: "I"; chatBubbleType: "TEXT" };
    };
  }[] = [];
  const leadByPhone = new Map<string, LeadRow>();
  let skipped = 0;

  for (const lead of leads) {
    const since = lead.last_sent_at ?? EPOCH;
    const globeNew = careersJobs
      .filter((j) => j.created_at > since && !isTalentPool(j.title))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const interestNew = jobs
      .filter(
        (j) =>
          j.created_at > since &&
          !isTalentPool(j.title) &&
          (lead.brand_ids?.includes(j.brand_id) || lead.categories?.includes(j.job_category))
      )
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    if (globeNew.length === 0 && interestNew.length === 0) {
      skipped += 1;
      continue;
    }

    const globeLines = formatJobLines(
      globeNew.map((j) => ({ title: j.title, url: `${siteUrl}/careers/${j.id}` })),
      `${siteUrl}/careers`
    );
    const interestLines = formatJobLines(
      interestNew.map((j) => ({
        title: j.title,
        url: `${siteUrl}/jobs/${j.id}`,
        brandName: brandNameById.get(j.brand_id),
      })),
      `${siteUrl}/brand-jobs`
    );

    const digits = lead.phone.replace(/[^0-9]/g, "");
    leadByPhone.set(digits, lead);
    messages.push({
      to: digits,
      from: "01099712034",
      kakaoOptions: {
        pfId,
        templateId,
        variables: {
          "#{글로브공고}": globeLines,
          "#{관심공고}": interestLines,
        },
        disableSms: true,
        bms: { targeting: "I", chatBubbleType: "TEXT" },
      },
    });
  }

  if (messages.length === 0) {
    return Response.json({ ok: true, targeted: leads.length, sent: 0, skipped });
  }

  let result;
  try {
    result = await messageService.send(messages);
  } catch (error) {
    const failedList =
      error && typeof error === "object" && "failedMessageList" in error
        ? (error as { failedMessageList: unknown }).failedMessageList
        : null;
    console.error("[kakao-weekly-send] send failed:", error, failedList);
    return Response.json(
      { error: "send failed", detail: String(error), failedMessageList: failedList },
      { status: 502 }
    );
  }

  const failedPhones = new Set((result.failedMessageList ?? []).map((f) => f.to));
  if (failedPhones.size > 0) {
    console.error(
      "[kakao-weekly-send] failed recipients:",
      (result.failedMessageList ?? []).map((f) => ({
        to: f.to,
        statusCode: f.statusCode,
        statusMessage: f.statusMessage,
      }))
    );
  }

  const now = new Date().toISOString();
  const succeededLeadIds = [...leadByPhone.entries()]
    .filter(([phone]) => !failedPhones.has(phone))
    .map(([, lead]) => lead.id);

  if (succeededLeadIds.length > 0) {
    await supabase.from("leads").update({ last_sent_at: now }).in("id", succeededLeadIds);
  }

  return Response.json({
    ok: true,
    targeted: leads.length,
    attempted: messages.length,
    succeeded: succeededLeadIds.length,
    failed: failedPhones.size,
    skipped,
  });
}
