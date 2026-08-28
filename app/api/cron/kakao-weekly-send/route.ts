import { SolapiMessageService } from "solapi";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchesInterest } from "@/lib/interest";

interface LeadRow {
  id: string;
  phone: string;
  brand_ids: string[];
  categories: string[];
  last_sent_at: string | null;
  created_at: string;
  /** 링크에서 구독 정보를 복원하기 위한 불투명 토큰(0020 마이그레이션) */
  access_token: string | null;
  /** 카카오 채널 친구 여부. 이 값으로 브랜드 메시지/알림톡을 갈라 보낸다. */
  is_channel_friend: boolean | null;
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

// 상시 인재풀/인재 Pool 등록 공고는 "신규 채용 공고"가 아니라 상시 접수용 안내이므로 발송에서 제외한다.
const TALENT_POOL_PATTERN = /인재\s*풀|인재\s*pool|talent\s*pool/i;

function isTalentPool(title: string): boolean {
  return TALENT_POOL_PATTERN.test(title);
}

// SOLAPI 브랜드 메시지(TEXT형)는 치환변수 적용 후 전체 본문이 1300자를 넘으면 발송 자체가
// 실패한다. 관심 카테고리를 넓게 선택한 구독자는 신규 공고가 수십~수백 건까지 잡힐 수 있어서,
// 변수 하나당 최대 10건까지 보여주되 글자수 예산을 넘기면 그 전에 멈추고 나머지는
// "더보기" 링크로 유도한다.
const MAX_ITEMS_PER_SECTION = 10;
const SECTION_CHAR_BUDGET = 550;

/**
 * moreUrl이 null이면 넘치는 건수·빈 상태에서 URL을 붙이지 않는다 — 메시지 하단에 카카오 템플릿
 * 버튼이 있어서 본문에 같은 링크를 또 넣으면 중복이다(2026-07-30 사용자 피드백).
 */
/**
 * 알림톡 본문용 — 제목만 나열한다.
 *
 * 알림톡은 정보성 메시지라 본문에 링크를 넣으면 심사에서 광고성으로 걸릴 여지가 있어,
 * 링크는 템플릿 버튼(내 관심 공고 보기)으로만 제공한다.
 */
function formatJobTitles(jobs: { title: string; brandName?: string }[]): string {
  const lines: string[] = [];
  let used = 0;
  for (const j of jobs) {
    if (lines.length >= MAX_ITEMS_PER_SECTION) break;
    const line = `· ${j.brandName ? `[${j.brandName}] ` : ""}${j.title}`;
    if (used + line.length > SECTION_CHAR_BUDGET) break;
    lines.push(line);
    used += line.length + 1;
  }
  const remaining = jobs.length - lines.length;
  if (remaining > 0) lines.push(`· 외 ${remaining}건`);
  return lines.join("\n");
}

function formatJobLines(
  jobs: { title: string; url: string; brandName?: string }[],
  moreUrl: string | null
): string {
  // 공고 줄과 같은 모양(앞에 점)으로 맞춘다.
  if (jobs.length === 0) return "· 이번 주 신규 공고가 없어요.";
  const lines: string[] = [];
  let used = 0;
  for (const j of jobs) {
    if (lines.length >= MAX_ITEMS_PER_SECTION) break;
    const line = `· ${j.brandName ? `[${j.brandName}] ` : ""}${j.title}\n  ${j.url}`;
    if (lines.length > 0 && used + line.length > SECTION_CHAR_BUDGET) break;
    lines.push(line);
    used += line.length + 1;
  }
  const remaining = jobs.length - lines.length;
  if (remaining > 0) {
    lines.push(
      moreUrl ? `…외 ${remaining}건 더보기\n  ${moreUrl}` : `· 외 ${remaining}건은 아래 버튼에서 볼 수 있어요.`
    );
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
  // ?template=<ID> — 새 템플릿을 운영 환경변수를 바꾸기 전에 시험 발송해보기 위한 override.
  // 확정되면 SOLAPI_TEMPLATE_ID 환경변수를 바꾸는 게 맞다(이 파라미터는 테스트 용도).
  const templateId = url.searchParams.get("template") || process.env.SOLAPI_TEMPLATE_ID;
  // 채널 친구가 아닌 구독자에게 보낼 **알림톡** 템플릿. 브랜드 메시지는 targeting "I"라
  // 채널 친구에게만 도달하는데, 실제 친구 추가율이 8%대라 나머지는 알림톡으로 보낸다
  // (알림톡은 채널 추가 없이 발송되지만 정보성 문구만 허용 — 자사 공고 홍보는 넣지 않는다).
  // 템플릿 승인 전에는 비워두면 되고, 그 동안 비친구는 발송 대상에서 조용히 빠진다.
  const alimtalkTemplateId =
    url.searchParams.get("alimtalkTemplate") || process.env.SOLAPI_ALIMTALK_TEMPLATE_ID || null;
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
      .select(
        "id, phone, brand_ids, categories, last_sent_at, created_at, access_token, is_channel_friend"
      )
      .eq("unsubscribed", false)
      // 마케팅성 메시지이므로 마케팅 수신 동의가 없으면 절대 발송하지 않는다(가입 폼에서도
      // 필수로 막아두지만, 과거 데이터·직접 DB 수정 등에 대비해 발송 단계에서도 다시 확인).
      .eq("marketing_opt_in", true),
    supabase.from("careers_jobs").select("id, title, created_at").eq("status", "open"),
    supabase
      .from("jobs")
      .select("id, title, brand_id, job_category, created_at")
      .eq("status", "open"),
    supabase.from("brands").select("id, name"),
  ]);

  // ?only=01099712034 — 그 번호 한 명에게만 보낸다(실발송 테스트용). preview와 함께 쓸 수 있다.
  // 전체 구독자에게 잘못 보내는 사고를 막기 위한 안전장치이므로 숫자만 비교한다.
  const onlyDigits = (url.searchParams.get("only") ?? "").replace(/[^0-9]/g, "");
  const allLeads = (leadsRes.data as LeadRow[]) ?? [];
  const leads = onlyDigits
    ? allLeads.filter((l) => l.phone.replace(/[^0-9]/g, "") === onlyDigits)
    : allLeads;
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
      // 알림톡에는 bms 옵션을 붙이지 않는다 — 붙이면 브랜드 메시지로 처리된다.
      bms?: { targeting: "I"; chatBubbleType: "TEXT" };
    };
    // 메시지 하단 버튼("전체 브랜드 공고")은 **카카오 브랜드 메시지 템플릿에 등록된 버튼**이고,
    // 발송 API로 buttons를 같이 보내도 템플릿 쪽이 우선해 무시된다(2026-07-30 실발송으로 확인).
    // 버튼 링크를 바꾸려면 SOLAPI 콘솔에서 템플릿을 수정해야 한다. 템플릿 버튼 URL은 고정이라
    // 사람별 토큰을 실을 수 없으므로 토큰 없이도 동작하는 /my-jobs로 걸어야 한다
    // (그 화면은 localStorage에 저장된 구독 정보로 열린다).
  }[] = [];
  const leadByPhone = new Map<string, LeadRow>();
  let skipped = 0;
  // 알림톡 템플릿이 아직 없어서 비친구에게 보내지 못하고 건너뛴 수(승인 전 상태 파악용).
  let skippedNoAlimtalk = 0;

  for (const lead of leads) {
    // 첫 발송(last_sent_at 없음)에는 가입 이후 새로 열린 공고만 보낸다 — 가입 시점 이전부터
    // 열려있던 공고까지 전부 "신규"로 보이면 매칭 범위를 넓게 잡은 구독자일수록 첫 메시지가
    // 지나치게 커진다.
    const since = lead.last_sent_at ?? lead.created_at;
    // 글로브(자사) 공고는 발송할 때마다 **신규 여부와 무관하게 전부** 맨 위에 넣는다 — 이 발송의
    // 목적 자체가 자사 채용 공고 홍보이기 때문이다(순서는 템플릿에서 글로브 → 관심 공고 순).
    const globeAll = careersJobs
      .filter((j) => !isTalentPool(j.title))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const interestNew = jobs
      .filter(
        (j) =>
          j.created_at > since &&
          !isTalentPool(j.title) &&
          matchesInterest(j.brand_id, j.job_category, lead.brand_ids, lead.categories)
      )
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    // **신규 관심 공고가 없으면 아예 보내지 않는다**(2026-07-30 결정). 글로브 공고를 항상 싣긴
    // 하지만 그것만으로 메시지를 보내면 매주 같은 내용이 반복돼 광고로만 읽힌다 — 새 소식이
    // 있을 때 그 메시지 맨 위에 자사 공고를 함께 노출하는 방식으로 홍보 목적을 달성한다.
    if (interestNew.length === 0) {
      skipped += 1;
      continue;
    }

    const globeLines = formatJobLines(
      globeAll.map((j) => ({ title: j.title, url: `${siteUrl}/careers/${j.id}` })),
      `${siteUrl}/careers`
    );
    // 관심 공고 섹션은 본문에 링크를 넣지 않는다 — 하단 템플릿 버튼이 /my-jobs로 보내주므로.
    // 버튼 링크를 `.../my-jobs?t=#{토큰}`으로 등록해야 사람별 화면이 열린다(변수는 아래에서 채움).
    const interestLines = formatJobLines(
      interestNew.map((j) => ({
        title: j.title,
        url: `${siteUrl}/jobs/${j.id}`,
        brandName: brandNameById.get(j.brand_id),
      })),
      null
    );

    const digits = lead.phone.replace(/[^0-9]/g, "");

    // 채널 친구가 아니면 브랜드 메시지가 도달하지 않는다. 알림톡 템플릿이 준비돼 있으면
    // 그쪽으로 보내고(정보성 — 관심 공고만), 아직 없으면 발송 대상에서 뺀다.
    if (lead.is_channel_friend !== true) {
      if (!alimtalkTemplateId) {
        skippedNoAlimtalk += 1;
        continue;
      }
      leadByPhone.set(digits, lead);
      messages.push({
        to: digits,
        from: "01099712034",
        kakaoOptions: {
          pfId,
          templateId: alimtalkTemplateId,
          variables: {
            "#{건수}": String(interestNew.length),
            "#{공고목록}": formatJobTitles(
              interestNew.map((j) => ({
                title: j.title,
                brandName: brandNameById.get(j.brand_id),
              }))
            ),
            "#{토큰}": lead.access_token ?? "",
          },
          disableSms: true,
        },
      });
      continue;
    }

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
          // 템플릿 버튼 링크를 `https://.../my-jobs?t=#{토큰}` 으로 등록해두면 버튼도 사람별로
          // 정확한 관심 공고 화면을 열 수 있다(템플릿 버튼 URL 자체는 고정이라 변수가 유일한 방법).
          // 템플릿에 이 변수가 없으면 그냥 사용되지 않는다. 변수명은 템플릿 표기와 정확히 같아야 함.
          "#{토큰}": lead.access_token ?? "",
        },
        disableSms: true,
        bms: { targeting: "I", chatBubbleType: "TEXT" },
      },
    });
  }

  // ?preview=1 — 실제로 발송하지 않고 각 수신자에게 갈 본문·버튼 링크를 그대로 돌려준다.
  // 링크가 제대로 실렸는지 눈으로 확인할 방법이 없어서 추가했다(발송은 되돌릴 수 없으므로
  // 템플릿·링크를 건드린 뒤에는 이걸로 먼저 확인할 것).
  if (url.searchParams.get("preview") === "1") {
    return Response.json({
      ok: true,
      preview: true,
      // 어떤 템플릿으로 나가는지 확인할 수 있게 같이 돌려준다(?template= override 여부 판별용).
      templateId,
      alimtalkTemplateId,
      targeted: leads.length,
      wouldSend: messages.length,
      skipped,
      skippedNoAlimtalk,
      messages: messages.map((m) => ({
        to: `${m.to.slice(0, 5)}****${m.to.slice(-2)}`,
        product: m.kakaoOptions.bms ? "브랜드메시지" : "알림톡",
        variables: m.kakaoOptions.variables,
      })),
    });
  }

  if (messages.length === 0) {
    return Response.json({ ok: true, targeted: leads.length, sent: 0, skipped, skippedNoAlimtalk });
  }

  // 브랜드 메시지와 알림톡을 **따로 보낸다**. 한 번에 묶어 보내면 한쪽 상품이 통째로
  // 거절될 때(예: 알림톡 템플릿 미승인) SDK가 예외를 던져 다른 상품까지 결과를 잃는다.
  // 그러면 성공한 사람의 last_sent_at도 못 남겨 다음 발송에서 같은 내용을 또 받게 된다
  // (알림톡 템플릿 심사 중에 실제로 확인, 2026-08-27).
  const brandMessages = messages.filter((m) => m.kakaoOptions.bms);
  const alimtalkMessages = messages.filter((m) => !m.kakaoOptions.bms);

  interface FailedMessage {
    to: string;
    statusCode?: string;
    statusMessage?: string;
  }

  const failedPhones = new Set<string>();
  const failures: FailedMessage[] = [];

  async function sendBatch(batch: typeof messages, label: string) {
    if (batch.length === 0) return;
    const collect = (list: readonly FailedMessage[] | null | undefined) => {
      for (const item of list ?? []) {
        failedPhones.add(item.to);
        failures.push(item);
      }
    };
    try {
      const res = await messageService.send(batch);
      collect(res.failedMessageList as readonly FailedMessage[] | undefined);
    } catch (error) {
      const list =
        error && typeof error === "object" && "failedMessageList" in error
          ? ((error as { failedMessageList: FailedMessage[] }).failedMessageList ?? [])
          : [];
      // 실패 목록조차 없으면 어느 건이 나갔는지 알 수 없다 — 배치 전체를 실패로 본다.
      collect(list.length > 0 ? list : batch.map((m) => ({ to: m.to, statusMessage: String(error) })));
      console.error(`[kakao-weekly-send] ${label} 배치 실패:`, error);
    }
  }

  await sendBatch(brandMessages, "브랜드메시지");
  await sendBatch(alimtalkMessages, "알림톡");

  if (failures.length > 0) {
    console.error(
      "[kakao-weekly-send] failed recipients:",
      failures.map((x) => ({ to: x.to, statusCode: x.statusCode, statusMessage: x.statusMessage }))
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
    attemptedBrandMessage: brandMessages.length,
    attemptedAlimtalk: alimtalkMessages.length,
    succeeded: succeededLeadIds.length,
    failed: failedPhones.size,
    failures: failures.slice(0, 5).map((x) => ({ statusCode: x.statusCode, statusMessage: x.statusMessage })),
    skipped,
    skippedNoAlimtalk,
  });
}
