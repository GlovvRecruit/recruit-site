/**
 * 그리팅(career.greetinghr.com)·나인하이어(ninehire.site) 공통 크롤러.
 *
 * 두 서비스는 브랜드마다 서브도메인을 발급하지만 **구조가 동일**해서, 크롤러 하나로
 * `crawl_candidate_brands`에 조사된 모든 브랜드를 처리할 수 있다(브랜드별 크롤러를 따로 만들
 * 필요가 없다). 대상 목록은 `scripts/research-career-pages.mjs`가 채운다.
 *
 * - 그리팅: 채용 홈페이지 HTML의 `__NEXT_DATA__`에 react-query 캐시가 그대로 들어 있고
 *   `["openings"]` 쿼리에 공고 목록(제목·마감일·경력·근무지)이 다 있다.
 * - 나인하이어: 홈페이지에서 companyId를 얻어 공개 API
 *   `api.ninehire.com/identity-access/homepage/recruitments?companyId=...` 를 호출한다.
 */

import type { CrawledOpening } from "@/lib/crawler/ingest";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getText(url: string, timeoutMs = 15000): Promise<string | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
      cache: "no-store",
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseNextData(html: string): unknown | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** 사이트 표기와 맞춘다: "신입" / "3년차 이상" / "2~7년차" */
function formatCareer(from: number | null, to: number | null, type: string | null): string {
  const t = (type ?? "").toUpperCase();
  if (t.includes("NEWCOMER") || t === "NEW") return "신입";
  if (t.includes("IRRELEVANT")) return "경력 무관";
  if (t.includes("INTERN")) return "인턴";
  const lo = from ?? 0;
  const hi = to ?? 0;
  if (lo > 0 && hi > lo) return `${lo}~${hi}년차`;
  if (lo > 0) return `${lo}년차 이상`;
  if (hi > 0) return `${hi}년차 이하`;
  return "경력";
}

function formatEmployment(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.toUpperCase();
  if (v.includes("INTERN")) return "인턴";
  if (v.includes("CONTRACT") || v.includes("TEMPORARY")) return "계약직";
  if (v.includes("PART")) return "파트타임";
  if (v.includes("FULL")) return "정규직";
  return null;
}

/**
 * 그리팅 공고 URL을 하나의 형태로 고정한다.
 *
 * 그리팅은 `/o/<id>` 와 `/ko/o/<id>` 를 모두 서비스하는데, 두 형태가 섞이면 같은 공고가
 * source_url이 다른 별개 행으로 두 번 저장된다(실제로 애경산업 36건·달바 42건·위시컴퍼니 8건이
 * 이렇게 중복됐다). 로케일 없는 `/o/<id>` 를 정규형으로 쓴다.
 */
export function greetingUrl(host: string, openingId: number | string): string {
  return `https://${host}/o/${openingId}`;
}

/** 이미 저장된 URL을 정규형으로 바꾼다(로케일 구간 제거). 중복 비교·정리에 쓴다. */
export function canonicalizeAtsUrl(url: string): string {
  return url.replace(/\/(ko|en|ja|zh)\/o\//, "/o/");
}

// ---------------------------------------------------------------- 그리팅

interface GreetingOpening {
  openingId: number;
  title: string;
  dueDate?: string | null;
  openingJobPosition?: {
    openingJobPositions?: {
      workspaceOccupation?: { occupation?: string } | null;
      workspacePlace?: { location?: string } | null;
      jobPositionCareer?: { careerFrom?: number; careerTo?: number; careerType?: string } | null;
      jobPositionEmployment?: { employmentType?: string } | null;
    }[];
  } | null;
}

export async function crawlGreeting(
  brandName: string,
  careerUrl: string
): Promise<CrawledOpening[]> {
  const host = new URL(careerUrl).host;
  const html = await getText(`https://${host}/`);
  if (!html) return [];
  const data = parseNextData(html) as {
    props?: {
      pageProps?: {
        dehydratedState?: { queries?: { queryKey: unknown; state?: { data?: unknown } }[] };
      };
    };
  } | null;
  const queries = data?.props?.pageProps?.dehydratedState?.queries ?? [];
  const openingsQuery = queries.find((q) => JSON.stringify(q.queryKey) === '["openings"]');
  const openings = (openingsQuery?.state?.data as GreetingOpening[] | undefined) ?? [];

  return openings
    .filter((o) => o?.openingId && o?.title)
    .map((o) => {
      const position = o.openingJobPosition?.openingJobPositions?.[0];
      return {
        sourcePlatform: "greetinghr",
        brandName,
        title: o.title.trim(),
        jobCategory: position?.workspaceOccupation?.occupation ?? null,
        careerLevel: formatCareer(
          position?.jobPositionCareer?.careerFrom ?? null,
          position?.jobPositionCareer?.careerTo ?? null,
          position?.jobPositionCareer?.careerType ?? null
        ),
        region: position?.workspacePlace?.location ?? null,
        employmentType: formatEmployment(position?.jobPositionEmployment?.employmentType ?? null),
        sourceUrl: greetingUrl(host, o.openingId),
        description: null,
        descriptionImages: null,
        // 그리팅은 마감일을 그대로 내려준다("채용시 마감"이면 없음).
        deadline: o.dueDate ?? null,
      };
    });
}

// ---------------------------------------------------------------- 나인하이어

interface NinehireRecruitment {
  recruitmentId: string;
  addressKey: string;
  status: string;
  title?: string | null;
  externalTitle?: string | null;
  deadlineValue?: string | null;
  deadlineType?: string | null;
  employmentType?: string[] | null;
  career?: { type?: string; range?: { over?: number; below?: number } } | null;
  jobLocations?: { placeName?: string | null }[] | null;
  jobGroup?: { title?: string | null } | null;
}

export async function crawlNinehire(
  brandName: string,
  careerUrl: string
): Promise<CrawledOpening[]> {
  const host = new URL(careerUrl).host;
  const html = await getText(`https://${host}/`);
  if (!html) return [];

  // companyId는 홈페이지 __NEXT_DATA__ 안에 있다(공개 API 호출에 필요).
  const companyId = html.match(/"companyId":"([0-9a-f-]{20,})"/)?.[1];
  if (!companyId) return [];

  const json = await getText(
    `https://api.ninehire.com/identity-access/homepage/recruitments?companyId=${companyId}&page=1&countPerPage=100`
  );
  if (!json) return [];
  let results: NinehireRecruitment[] = [];
  try {
    results = (JSON.parse(json) as { results?: NinehireRecruitment[] }).results ?? [];
  } catch {
    return [];
  }

  return results
    .filter((r) => r?.addressKey && (r.externalTitle || r.title) && r.status === "in_progress")
    .map((r) => ({
      sourcePlatform: "ninehire",
      brandName,
      title: (r.externalTitle || r.title || "").trim(),
      jobCategory: r.jobGroup?.title ?? null,
      careerLevel: formatCareer(
        r.career?.range?.over ?? null,
        r.career?.range?.below ?? null,
        r.career?.type ?? null
      ),
      region: r.jobLocations?.[0]?.placeName ?? null,
      employmentType: formatEmployment(r.employmentType?.[0] ?? null),
      // 상세 공고는 /job_posting/<addressKey> 다. /recruit?id= 는 목록으로만 가서 해당 공고로
      // 이동하지 않는다(2026-08-11 확인).
      sourceUrl: `https://${host}/job_posting/${r.addressKey}`,
      description: null,
      descriptionImages: null,
      // deadlineType이 until_filled면 "채용시 마감"이라 마감일이 없다.
      deadline: r.deadlineType === "until_filled" ? null : (r.deadlineValue ?? null),
    }));
}

// ---------------------------------------------------------------- 상세 본문

/** HTML 본문을 화면에 넣기 좋은 텍스트로 정리한다(이미지 URL은 따로 뽑아 쓴다). */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "· ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function imagesFrom(html: string): string[] {
  return [...new Set([...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))].slice(
    0,
    12
  );
}

/** JSON 문자열에서 특정 키의 값 중 **가장 긴 것**을 뽑는다(본문은 보통 가장 길다). */
function longestJsonString(blob: string, key: string): string {
  const q = String.fromCharCode(34);
  const bs = String.fromCharCode(92);
  // "key":"...(이스케이프 포함)..."
  const re = new RegExp(q + key + q + ":" + q + "((?:[^" + q + bs + "]|" + bs + ".)*)" + q, "g");
  const values = [...blob.matchAll(re)].map((m) => m[1]).sort((a, b) => b.length - a.length);
  if (!values[0]) return "";
  try {
    return JSON.parse(q + values[0] + q) as string;
  } catch {
    return "";
  }
}

export interface OpeningDetail {
  description: string | null;
  descriptionImages: string[] | null;
}

/**
 * 공고 상세 본문을 가져온다. 목록 API에는 본문이 없어서 공고마다 한 번 더 호출해야 한다
 * (그래서 **신규 공고에만** 쓴다 — 전체를 매번 받으면 크롤링 1회에 요청이 1,200건을 넘는다).
 */
export async function fetchOpeningDetail(sourceUrl: string): Promise<OpeningDetail> {
  const empty = { description: null, descriptionImages: null };
  const html = await getText(sourceUrl, 20000);
  if (!html) return empty;
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!nd) return empty;

  let raw = "";
  try {
    const json = JSON.parse(nd[1]) as {
      props?: {
        pageProps?: {
          jobPosting?: unknown;
          dehydratedState?: { queries?: { queryKey: unknown; state?: { data?: unknown } }[] };
        };
      };
    };
    const pageProps = json.props?.pageProps;

    // 그리팅: ["career","getOpeningById",…] 쿼리의 detail(본문 HTML)
    const q = (pageProps?.dehydratedState?.queries ?? []).find((x) =>
      JSON.stringify(x.queryKey).includes("getOpeningById")
    );
    // 본문(detail)은 openingsInfo 안쪽 등 버전마다 위치가 달라 전체에서 가장 긴 값을 고른다.
    const detail = longestJsonString(JSON.stringify(q?.state?.data ?? {}), "detail");
    if (detail) raw = detail;

    // 나인하이어: pageProps.jobPosting 안에 본문(content)이 있다.
    if (!raw && pageProps?.jobPosting) {
      const blob = JSON.stringify(pageProps.jobPosting);
      raw = longestJsonString(JSON.stringify(pageProps.jobPosting), "content");
    }
  } catch {
    return empty;
  }

  if (!raw) return empty;
  const text = htmlToText(raw);
  const images = imagesFrom(raw);
  return {
    description: text.length >= 30 ? text.slice(0, 12000) : null,
    descriptionImages: images.length > 0 ? images : null,
  };
}
