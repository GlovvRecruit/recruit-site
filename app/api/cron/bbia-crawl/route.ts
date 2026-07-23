import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";

const BASE_URL = "https://www.bbiacosmetic.com";
const SEARCH_URL = `${BASE_URL}/sub/sub04.php`;
const BRAND_NAME = "삐아";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith("/")) return `${BASE_URL}${href}`;
  return `${BASE_URL}/${href}`;
}

interface BbiaOpening {
  title: string;
  region: null;
  careerLevel: string | null;
  sourceUrl: string;
}

// 삐아(bbiacosmetic.com) 채용 섹션은 현재 공고가 없어(.cnt-none) 실제 행 마크업을 확인하지 못했다.
// 헤더 컬럼(부문/내용/직위) 구조를 근거로 파싱하며, 공고가 실제로 뜨면 구조를 재검증해야 한다.
function parseOpenings(html: string): BbiaOpening[] {
  const startIdx = html.indexOf('class="job-cnt"');
  const endIdx = html.indexOf('class="recruit-link"', startIdx);
  if (startIdx === -1 || endIdx === -1) return [];
  const block = html.slice(startIdx, endIdx);

  if (block.includes("cnt-none")) return [];

  const ulRe = /<ul>([\s\S]*?)<\/ul>/g;
  const uls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = ulRe.exec(block))) {
    uls.push(m[1]);
  }
  // 첫 <ul>은 헤더(부문/내용/직위) — 데이터 행은 그 이후.
  const rows = uls.slice(1);

  return rows
    .map((row, index) => {
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
      const cells: string[] = [];
      let lm: RegExpExecArray | null;
      while ((lm = liRe.exec(row))) {
        cells.push(stripTags(lm[1]));
      }
      const [division, title, position] = cells;
      if (!title) return null;

      const hrefMatch = row.match(/href="([^"]+)"/);
      const sourceUrl = hrefMatch
        ? toAbsoluteUrl(hrefMatch[1])
        : `${SEARCH_URL}#job-${index}`;

      return {
        title: division ? `[${division}] ${title}` : title,
        region: null,
        careerLevel: position || null,
        sourceUrl,
      };
    })
    .filter((o): o is BbiaOpening => o !== null);
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

  let listRes: Response;
  try {
    listRes = await fetch(SEARCH_URL, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
  } catch (e) {
    return Response.json({ error: "fetch threw", detail: String(e) }, { status: 502 });
  }
  if (!listRes.ok) {
    return Response.json(
      { error: "failed to fetch job list", status: listRes.status },
      { status: 502 }
    );
  }

  const html = await listRes.text();
  const openings = parseOpenings(html);

  const items: CrawledOpening[] = openings.map((o) => ({
    sourcePlatform: "bbiacosmetic-careers",
    brandName: BRAND_NAME,
    title: o.title,
    jobCategory: null,
    careerLevel: o.careerLevel,
    region: o.region,
    employmentType: null,
    sourceUrl: o.sourceUrl,
    description: null,
    descriptionImages: null,
  }));

  const result = await ingestCrawledOpenings(items, null);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result);
}
