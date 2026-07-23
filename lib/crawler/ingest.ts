import { createAdminClient } from "@/lib/supabase/admin";
import { JOB_CATEGORIES } from "@/lib/types";

export interface CrawledOpening {
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
  if (/\bmd\b/.test(text)) return "MD";
  if (/(marketing|marketer|마케팅|마케터)/.test(text)) return "마케팅";
  if (/(\bbm\b|기획)/.test(text)) return "BM·PM";
  if (/(operation|운영|oper|customer service|customer experience|\bcs\b)/.test(text)) return "운영";
  if (/(영업|세일즈|sales)/.test(text)) return "세일즈";
  return "기타";
}

export async function ingestCrawledOpenings(items: CrawledOpening[], crawlRunId: string | null) {
  const supabase = createAdminClient();
  if (!supabase) {
    return { error: "supabase not configured", status: 500 } as const;
  }

  const now = new Date().toISOString();
  const rows = items
    .filter((item) => item.sourceUrl && item.title && item.brandName)
    .map((item) => ({
      crawl_run_id: crawlRunId,
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
    return { ok: true, upserted: 0, published: 0, staleJobsDeleted: 0, staleStagingDeleted: 0 } as const;
  }

  const { error } = await supabase
    .from("crawled_jobs_staging")
    .upsert(rows, { onConflict: "source_url" });

  if (error) {
    console.error("[ingest] upsert failed:", error);
    return { error: error.message, status: 500 } as const;
  }

  // 크롤링된 공고는 admin 승인 없이 바로 게시한다. admin은 이후 개별 공고를
  // "숨김"(review_status='hidden') 또는 "수정"(review_status='edited')으로 표시해 관리한다.
  // 숨김 처리된 공고는 게시에서 제외하고, 수정된 공고는 admin이 입력한 내용을 크롤링 결과로 덮어쓰지 않는다.
  const sourceUrls = rows.map((r) => r.source_url);
  const { data: statusRows } = await supabase
    .from("crawled_jobs_staging")
    .select("source_url, review_status")
    .in("source_url", sourceUrls);
  const statusByUrl = new Map((statusRows ?? []).map((r) => [r.source_url, r.review_status]));

  const hiddenUrls = rows
    .filter((r) => statusByUrl.get(r.source_url) === "hidden")
    .map((r) => r.source_url);
  if (hiddenUrls.length > 0) {
    await supabase.from("jobs").delete().in("source_url", hiddenUrls);
  }

  const publishRows = rows.filter((r) => {
    const status = statusByUrl.get(r.source_url);
    return status !== "hidden" && status !== "edited";
  });

  if (publishRows.length > 0) {
    const distinctBrandNames = [...new Set(publishRows.map((r) => r.brand_name))];
    const { data: brandRows, error: brandError } = await supabase
      .from("brands")
      .upsert(
        distinctBrandNames.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id, name");

    if (!brandError && brandRows) {
      const brandIdByName = new Map(brandRows.map((b) => [b.name, b.id]));
      const jobRows = publishRows.map((r) => ({
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

  return {
    ok: true,
    upserted: rows.length,
    published: publishRows.length,
    staleJobsDeleted,
    staleStagingDeleted,
  } as const;
}
