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
  /** 공고 마감일(ISO). 원본이 마감일을 제공하지 않으면 null — "상시"로 취급한다. */
  deadline?: string | null;
}

/**
 * 공고 **제목**만 보고 직무를 판별한다. 제목에 직무가 분명히 적혀 있으면 플랫폼이 준 카테고리보다
 * 이쪽을 우선한다 — 실제로 "온라인 MD(경력)"이 플랫폼 카테고리("글로벌세일즈") 때문에 세일즈로
 * 분류되는 문제가 있었다(2026-08-11 지적).
 *
 * 약어도 함께 본다: AMD(어시스턴트 MD)·VMD → MD, ABM(어시스턴트 BM) → BM·PM.
 * 확실하지 않으면 null을 돌려 플랫폼 카테고리·본문 추정에 맡긴다.
 */
function categoryFromTitle(title: string): string | null {
  // 앞뒤가 영문자가 아닌 위치를 단어 경계로 본다(정규식 이스케이프 없이 표현).
  const t = " " + title.toLowerCase() + " ";
  const word = (w: string) => new RegExp("(^|[^a-z])(" + w + ")([^a-z]|$)").test(t);
  if (word("a?md|vmd") || t.includes("엠디")) return "MD";
  if (word("a?bm|pm") || /브랜드 *매니저|상품 *기획|사업 *기획|프로덕트 *매니저/.test(t)) {
    return "BM·PM";
  }
  if (/marketing|marketer|마케팅|마케터|퍼포먼스/.test(t)) return "마케팅";
  if (/영업|세일즈|sales|채널 *관리|바이어/.test(t)) return "세일즈";
  if (word("scm") || /운영|operation|물류|고객 *(지원|경험)/.test(t)) return "운영";
  return null;
}

/**
 * 게시판형 원본에서 제목에 줄바꿈·탭이 그대로 딸려오는 경우가 있어(코리아나화장품 등)
 * 목록·카카오 메시지가 깨져 보인다. 공백을 하나로 접어 저장한다.
 */
function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function guessCategory(raw: string | null, title: string): string {
  const text = " " + `${raw ?? ""} ${title}`.toLowerCase() + " ";
  const word = (w: string) => new RegExp("(^|[^a-z])(" + w + ")([^a-z]|$)").test(text);
  if (word("a?md|vmd") || text.includes("엠디")) return "MD";
  if (/marketing|marketer|마케팅|마케터/.test(text)) return "마케팅";
  if (word("a?bm|pm") || text.includes("기획")) return "BM·PM";
  if (word("cs") || /operation|운영|customer service|customer experience/.test(text)) return "운영";
  if (/영업|세일즈|sales/.test(text)) return "세일즈";
  return "기타";
}

/**
 * 수집 결과를 staging에 적재하고, 공개 가능한 것만 jobs로 발행한다.
 *
 * options.publish === false 이면 **staging에만 적재하고 절대 공개하지 않는다**(사람이 검수해
 * review_status='approved'로 표시한 것만 공개된다). 조사 자동화로 붙인 대상은 잘못된 회사가
 * 섞일 수 있어(광고대행사·동명 업체) 검수 전 공개는 사고다 — 2026-07-30에 실제로 발생했다.
 */
export async function ingestCrawledOpenings(
  items: CrawledOpening[],
  crawlRunId: string | null,
  options: { publish?: boolean; publishBrands?: string[] } = {}
) {
  const autoPublish = options.publish !== false;
  // 사이트 단위로 한 번 승인되면 이후 재크롤링은 검수 없이 그대로 공개된다(2026-07-30 결정).
  // 매번 공고를 검수하는 건 대량 신규 등록 때만 필요하다.
  const approvedBrands = options.publishBrands ? new Set(options.publishBrands) : null;
  const supabase = createAdminClient();
  if (!supabase) {
    return { error: "supabase not configured", status: 500 } as const;
  }

  const now = new Date().toISOString();
  const rawRows = items
    .filter((item) => item.sourceUrl && item.title && item.brandName)
    .map((item) => ({
      crawl_run_id: crawlRunId,
      source_platform: item.sourcePlatform,
      brand_name: item.brandName,
      title: normalizeTitle(item.title),
      job_category: item.jobCategory ?? null,
      career_level: item.careerLevel ?? null,
      region: item.region ?? null,
      employment_type: item.employmentType ?? null,
      source_url: item.sourceUrl,
      description: item.description ?? null,
      description_images: item.descriptionImages ?? null,
      deadline: item.deadline ?? null,
      last_seen_at: now,
    }));

  // 같은 source_url이 한 배치에 두 번 들어오면 Postgres가 upsert를 거부한다
  // ("ON CONFLICT DO UPDATE command cannot affect row a second time"). 실제로 한 그리팅
  // 워크스페이스를 두 브랜드명이 공유하는 경우(달바 / 달바(재팬))가 있어서 먼저 걸러낸다.
  const rows = Array.from(new Map(rawRows.map((r) => [r.source_url, r])).values());

  if (rows.length === 0) {
    return { ok: true, upserted: 0, published: 0, staleJobsDeleted: 0 } as const;
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
    .select("source_url, review_status, created_at")
    .in("source_url", sourceUrls);
  const statusByUrl = new Map((statusRows ?? []).map((r) => [r.source_url, r.review_status]));
  // 공고를 **처음 본 날**. jobs는 채용이 끝나면 삭제되지만 staging은 남기 때문에, 같은 공고가
  // 다시 올라와도 이 값으로 원래 날짜를 되돌려준다. 카톡 발송이 "마지막 발송 이후 생성된 공고"를
  // 신규로 보므로, 이게 없으면 이미 보낸 공고가 다시 나간다.
  const firstSeenByUrl = new Map((statusRows ?? []).map((r) => [r.source_url, r.created_at]));

  const hiddenUrls = rows
    .filter((r) => statusByUrl.get(r.source_url) === "hidden")
    .map((r) => r.source_url);
  if (hiddenUrls.length > 0) {
    await supabase.from("jobs").delete().in("source_url", hiddenUrls);
  }

  const publishRows = rows.filter((r) => {
    const status = statusByUrl.get(r.source_url);
    if (status === "hidden" || status === "edited") return false;
    if (autoPublish) return true;
    // 승인된 사이트의 공고는 그대로 공개, 그 외에는 개별 승인된 것만 공개.
    if (approvedBrands?.has(r.brand_name)) return true;
    return status === "approved";
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
        // 제목 판별 → 플랫폼 카테고리 → 본문 추정 순.
        job_category:
          categoryFromTitle(r.title) ??
          (JOB_CATEGORIES.includes(r.job_category as (typeof JOB_CATEGORIES)[number])
            ? r.job_category
            : guessCategory(r.job_category, r.title)),
        career_level: r.career_level,
        region: r.region,
        source_url: r.source_url,
        description: r.description,
        description_images: r.description_images,
        deadline: r.deadline,
        status: "open",
        // 처음 수집한 날로 고정 — 삭제 후 재등록돼도 "신규"로 되살아나지 않게 한다.
        created_at: firstSeenByUrl.get(r.source_url) ?? now,
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
  for (const { brand, urls } of groups.values()) {
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
        // 원본에서 사라진 공고는 채용이 끝난 것이므로 그대로 지운다(2026-08-27 결정).
        // 다시 들어오더라도 created_at 은 staging의 최초 수집일에서 가져오므로(위 jobRows)
        // "신규 공고"로 오인되어 카톡이 다시 나가는 일은 없다.
        await supabase.from("jobs").delete().in("id", staleJobIds);
        staleJobsDeleted += staleJobIds.length;
      }
    }

    // staging은 **지우지 않는다.** 이 테이블이 공고의 최초 수집일(created_at)과 사람이 매긴
    // 검수 상태(review_status)를 보관하는 유일한 곳이다. 지워버리면
    //  - 같은 공고가 다시 들어올 때 최초 수집일이 오늘로 바뀌어 "신규"로 오인되고(중복 카톡)
    //  - admin에서 "숨김" 처리한 공고가 숨김 상태를 잃고 다시 공개된다.
    // 사라진 공고는 last_seen_at이 더 이상 갱신되지 않으므로 그 값으로 구분한다.
  }

  return {
    ok: true,
    upserted: rows.length,
    published: publishRows.length,
    staleJobsDeleted,
  } as const;
}
