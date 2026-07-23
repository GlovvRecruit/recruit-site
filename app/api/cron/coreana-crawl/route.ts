import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";

const BASE_URL = "https://www.coreana.com";
const SEARCH_URL = `${BASE_URL}/recruit/list`;
const BRAND_NAME = "코리아나화장품";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function htmlToText(html: string | null): string {
  return (html || "")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toAbsoluteUrl(href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith("/")) return `${BASE_URL}${href}`;
  return `${BASE_URL}/${href}`;
}

interface CoreanaOpening {
  title: string;
  sourceUrl: string;
}

// coreana.com/recruit/list는 현재 0건(.recruitList가 빈 컨테이너)이라 실제 항목 마크업을
// 확인하지 못했다. .recruitList 안의 앵커를 일반적으로 파싱하며, 실 공고가 뜨면 재검증 필요.
function parseOpenings(html: string): CoreanaOpening[] {
  const startIdx = html.indexOf('class="recruitList"');
  if (startIdx === -1) return [];
  const endIdx = html.indexOf("</div>", startIdx);
  const closeSectionIdx = html.indexOf('<div class="layerInBox">', startIdx);
  const block = html.slice(startIdx, closeSectionIdx > -1 ? closeSectionIdx : endIdx + 1000);

  const anchorRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const openings: CoreanaOpening[] = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(block))) {
    const href = m[1];
    const title = htmlToText(m[2]);
    if (!title) continue;
    openings.push({ title, sourceUrl: toAbsoluteUrl(href) });
  }
  return openings;
}

async function fetchDescription(detailUrl: string): Promise<string | null> {
  const res = await fetch(detailUrl, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/<div id="content">([\s\S]*?)<\/div>\s*<!-- \/\/content -->/);
  if (!match) return null;
  return htmlToText(match[1]) || null;
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

  const listHtml = await listRes.text();
  const openings = parseOpenings(listHtml);

  const items: CrawledOpening[] = [];
  for (const o of openings) {
    const description = await fetchDescription(o.sourceUrl);
    items.push({
      sourcePlatform: "coreana-careers",
      brandName: BRAND_NAME,
      title: o.title,
      jobCategory: null,
      careerLevel: null,
      region: null,
      employmentType: null,
      sourceUrl: o.sourceUrl,
      description,
      descriptionImages: null,
    });
  }

  const result = await ingestCrawledOpenings(items, null);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result);
}
