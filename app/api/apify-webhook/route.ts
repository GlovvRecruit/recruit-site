import { createAdminClient } from "@/lib/supabase/admin";
import { JOB_CATEGORIES } from "@/lib/types";

interface ApifyWebhookPayload {
  eventType?: string;
  resource?: {
    id?: string;
    defaultDatasetId?: string;
    status?: string;
  };
}

interface CrawledOpening {
  sourcePlatform: string;
  brandName: string;
  title: string;
  jobCategory?: string | null;
  careerLevel?: string | null;
  region?: string | null;
  employmentType?: string | null;
  sourceUrl: string;
  description?: string | null;
  descriptionImages?: string[] | null;
}

function guessCategory(raw: string | null, title: string): string {
  const text = `${raw ?? ""} ${title}`.toLowerCase();
  if (/(변호사|법무|legal|compliance|컴플라이언스)/.test(text)) return "기타";
  if (/(회계|재무|finance|accounting|\bir\b|공시)/.test(text)) return "기타";
  if (/(인사|hr|총무|human resource)/.test(text)) return "기타";
  if (/(연구|r&d|개발자|엔지니어|\bit\b|디자이너|design|생산|제조|품질|qc\b)/.test(text)) return "기타";
  if (/(sales|영업|세일즈)/.test(text)) return "세일즈";
  if (/\bmd\b/.test(text)) return "MD";
  if (/(marketing|마케팅|\bpr\b|홍보|콘텐츠)/.test(text)) return "마케팅";
  if (/(\bbd\b|\bpm\b|제휴|사업개발)/.test(text)) return "BD·PM";
  if (/(operations|scm|운영|물류|\bcs\b)/.test(text)) return "운영";
  return "기타";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  if (secret && url.searchParams.get("secret") !== secret) {
    return Response.json({ error: "invalid secret" }, { status: 401 });
  }

  let payload: ApifyWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const datasetId = payload.resource?.defaultDatasetId;
  if (payload.resource?.status !== "SUCCEEDED" || !datasetId) {
    return Response.json({ ok: true, skipped: "run not succeeded" });
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    return Response.json({ error: "apify not configured" }, { status: 500 });
  }

  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&clean=true`
  );
  if (!datasetRes.ok) {
    return Response.json({ error: "failed to fetch dataset" }, { status: 502 });
  }
  const items: CrawledOpening[] = await datasetRes.json();

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ error: "supabase not configured" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const rows = items
    .filter((item) => item.sourceUrl && item.title && item.brandName)
    .map((item) => ({
      crawl_run_id: payload.resource?.id ?? null,
      source_platform: item.sourcePlatform,
      brand_name: item.brandName,
      title: item.title,
      job_category: item.jobCategory ?? null,
      career_level: item.careerLevel ?? null,
      region: item.region ?? null,
      employment_type: item.employmentType ?? null,
      source_url: item.sourceUrl,
      description: item.description ?? null,
      description_images: item.descriptionImages ?? null,
      last_seen_at: now,
    }));

  if (rows.length === 0) {
    return Response.json({ ok: true, upserted: 0 });
  }

  const { error } = await supabase
    .from("crawled_jobs_staging")
    .upsert(rows, { onConflict: "source_url" });

  if (error) {
    console.error("[apify-webhook] upsert failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 이미 승인된 공고는 admin 재승인 없이 최신 크롤링 내용(설명·경력 표기 등)으로 자동 갱신한다.
  // 아직 대기 중(신규)인 공고는 admin 검수 전까지 실제 jobs 테이블에 반영하지 않는다.
  const sourceUrls = rows.map((r) => r.source_url);
  const { data: approvedRows } = await supabase
    .from("crawled_jobs_staging")
    .select(
      "brand_name, title, job_category, career_level, region, source_url, description, description_images"
    )
    .in("source_url", sourceUrls)
    .eq("review_status", "approved");

  if (approvedRows && approvedRows.length > 0) {
    const distinctBrandNames = [...new Set(approvedRows.map((r) => r.brand_name))];
    const { data: brandRows, error: brandError } = await supabase
      .from("brands")
      .upsert(
        distinctBrandNames.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id, name");

    if (!brandError && brandRows) {
      const brandIdByName = new Map(brandRows.map((b) => [b.name, b.id]));
      const jobRows = approvedRows.map((r) => ({
        brand_id: brandIdByName.get(r.brand_name),
        title: r.title,
        job_category: JOB_CATEGORIES.includes(r.job_category as (typeof JOB_CATEGORIES)[number])
          ? r.job_category
          : guessCategory(r.job_category, r.title),
        career_level: r.career_level,
        region: r.region,
        source_url: r.source_url,
        description: r.description,
        description_images: r.description_images,
        status: "open",
      }));
      await supabase.from("jobs").upsert(jobRows, { onConflict: "source_url" });
    }
  }

  // 이번 크롤링에서 더 이상 보이지 않는(=마감/삭제된) 공고는 브랜드·플랫폼 단위로 정리한다.
  // 브랜드별로 하나도 못 가져온 경우(크롤링 실패 가능성)는 안전하게 건너뛴다 —
  // 그렇지 않으면 사이트 점검 등으로 크롤링이 실패했을 때 그 브랜드 공고가 전부 삭제될 수 있다.
  const groups = new Map<string, { platform: string; brand: string; urls: Set<string> }>();
  for (const r of rows) {
    const key = `${r.source_platform}::${r.brand_name}`;
    if (!groups.has(key)) {
      groups.set(key, { platform: r.source_platform, brand: r.brand_name, urls: new Set() });
    }
    groups.get(key)!.urls.add(r.source_url);
  }

  let staleJobsDeleted = 0;
  let staleStagingDeleted = 0;
  for (const { platform, brand, urls } of groups.values()) {
    if (urls.size === 0) continue;

    const { data: brandRow } = await supabase
      .from("brands")
      .select("id")
      .eq("name", brand)
      .maybeSingle();

    if (brandRow) {
      const { data: existingJobs } = await supabase
        .from("jobs")
        .select("id, source_url")
        .eq("brand_id", brandRow.id);
      const staleJobIds = (existingJobs ?? [])
        .filter((j) => !urls.has(j.source_url))
        .map((j) => j.id);
      if (staleJobIds.length > 0) {
        await supabase.from("jobs").delete().in("id", staleJobIds);
        staleJobsDeleted += staleJobIds.length;
      }
    }

    const { data: existingStaging } = await supabase
      .from("crawled_jobs_staging")
      .select("id, source_url")
      .eq("source_platform", platform)
      .eq("brand_name", brand);
    const staleStagingIds = (existingStaging ?? [])
      .filter((s) => !urls.has(s.source_url))
      .map((s) => s.id);
    if (staleStagingIds.length > 0) {
      await supabase.from("crawled_jobs_staging").delete().in("id", staleStagingIds);
      staleStagingDeleted += staleStagingIds.length;
    }
  }

  return Response.json({
    ok: true,
    upserted: rows.length,
    autoRefreshed: approvedRows?.length ?? 0,
    staleJobsDeleted,
    staleStagingDeleted,
  });
}
