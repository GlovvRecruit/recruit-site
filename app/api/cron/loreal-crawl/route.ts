import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";
import { parseDeadline } from "@/lib/crawler/deadline";

/**
 * 로레알 자사 채용 페이지(careers.loreal.com) 크롤러.
 *
 * 로레알 채용팀이 자사 공고 게재를 요청해 추가했다(2026-08-27). 로레알은 글로브 이용 브랜드가
 * 아니므로 `/brand-jobs/for-interns`(글로브 이용 브랜드 전용) 에서는 제외된다 —
 * `NON_GLOVV_BRANDS` 참고.
 *
 * 이 사이트는 PeopleFluent 계열 포털이라 목록이 JSON 엔드포인트로 내려온다.
 *  - 목록: /en_US/jobs/SearchJobsAJAXJSON?s=1&<필터>&jobOffset=<0,20,40...>
 *  - 상세: /en_US/jobs/JobDetail?jobId=<id>
 * `jobOffset`만 페이지네이션으로 동작한다(page/pageIndex/startrow 등은 무시되고 1페이지가 다시 온다).
 */

const BASE_URL = "https://careers.loreal.com";
/**
 * 근무지 국가 = South Korea 필터. 로레알 검색 페이지의 국가 패싯 값이다.
 * 사용자 요청은 "location이 South Korea 인 것만" 이므로 제목의 Korea 표기가 아니라 이 필터를 쓴다.
 */
const KOREA_FILTER = "3_110_3=18066";
const LIST_URL = `${BASE_URL}/en_US/jobs/SearchJobsAJAXJSON?s=1&${KOREA_FILTER}`;
const PAGE_SIZE = 20;
const MAX_PAGES = 15; // 안전장치 — 한국 공고는 20~30건 수준이다
const BRAND_NAME = "로레알코리아";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface LorealListItem {
  id: number;
  value?: string;
  label?: string;
  category?: string;
  location?: string;
  postedDate?: string;
}

function htmlToText(html: string | null): string {
  return (html || "")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "Seongnam-si - " 처럼 뒤에 구분자가 붙어 오므로 다듬는다. */
function cleanRegion(raw: string | null | undefined): string | null {
  const text = (raw || "").replace(/\s*-\s*$/, "").trim();
  return text || null;
}

async function fetchListPage(offset: number): Promise<LorealListItem[]> {
  const res = await fetch(`${LIST_URL}&jobOffset=${offset}`, {
    headers: { "User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data) ? (data as LorealListItem[]) : [];
}

/**
 * 상세 페이지에서 본문과 근무지 국가를 읽는다.
 *
 * 목록의 `location`은 도시만 주고 비어 있는 건도 있어서, 국가 확인은 상세 본문의
 * "South Korea" 표기로 한 번 더 한다. 상세를 못 읽으면 국가를 확정할 수 없으므로
 * 목록 필터를 신뢰해 통과시킨다(필터 자체가 국가 패싯이다).
 */
async function fetchDetail(
  jobId: number
): Promise<{ description: string | null; isKorea: boolean | null }> {
  const res = await fetch(`${BASE_URL}/en_US/jobs/JobDetail?jobId=${jobId}`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) return { description: null, isKorea: null };
  const html = await res.text();
  const body =
    html.match(/class="article__content"[^>]*>([\s\S]*?)<\/div>\s*<div class="article__/)?.[1] ??
    html.match(/id="job-details"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ??
    null;
  return {
    description: htmlToText(body) || null,
    isKorea: /South Korea/i.test(html),
  };
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

  const listed: LorealListItem[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    let batch: LorealListItem[];
    try {
      batch = await fetchListPage(page * PAGE_SIZE);
    } catch (e) {
      return Response.json({ error: "fetch threw", detail: String(e) }, { status: 502 });
    }
    listed.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  // 같은 공고가 페이지 경계에서 중복돼 오는 경우가 있어 id 기준으로 한 번 거른다.
  const unique = [...new Map(listed.map((j) => [j.id, j])).values()];

  const items: CrawledOpening[] = [];
  let skippedNonKorea = 0;
  for (const job of unique) {
    const title = (job.value ?? job.label ?? "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    const { description, isKorea } = await fetchDetail(job.id);
    if (isKorea === false) {
      skippedNonKorea++;
      continue;
    }
    items.push({
      sourcePlatform: "loreal-careers",
      brandName: BRAND_NAME,
      title,
      jobCategory: job.category ?? null,
      careerLevel: null,
      region: cleanRegion(job.location),
      employmentType: null,
      sourceUrl: `${BASE_URL}/en_US/jobs/JobDetail?jobId=${job.id}`,
      description,
      descriptionImages: null,
      deadline: parseDeadline([title, description].filter(Boolean).join(" ")),
    });
  }

  // 로레알은 사용자가 직접 요청한 사이트라 검수 없이 공개한다(사이트 단위 승인).
  const result = await ingestCrawledOpenings(items, null, {
    publish: true,
    publishBrands: [BRAND_NAME],
  });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ...result, listed: unique.length, skippedNonKorea });
}
