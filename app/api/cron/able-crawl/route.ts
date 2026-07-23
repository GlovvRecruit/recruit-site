import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";

const BASE_URL = "https://able-cnc.com";
// 그누보드5 표준 채용 게시판 테이블명 관례("recruit")를 가정한 추정 URL.
// 아직 이 게시판 자체가 개설되어 있지 않아(존재하지 않는 게시판입니다) 확정된 값이 아니며,
// 실제로 채용공고가 열리면 bo_table 값을 재확인해야 한다.
const BO_TABLE = "recruit";
const SEARCH_URL = `${BASE_URL}/bbs/board.php?bo_table=${BO_TABLE}`;
const BRAND_NAME = "에이블씨엔씨";
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

interface AbleOpening {
  title: string;
  sourceUrl: string;
}

function parseOpenings(html: string): AbleOpening[] {
  if (html.includes("존재하지 않는 게시판") || html.includes("게시판이 존재하지")) {
    return [];
  }
  // 그누보드5 표준 목록 마크업: td.td_subject 안의 <a href="...wr_id=...">제목</a>
  const rowRe = /<td[^>]*class="[^"]*td_subject[^"]*"[^>]*>([\s\S]*?)<\/td>/g;
  const openings: AbleOpening[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const anchorMatch = m[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!anchorMatch) continue;
    const href = anchorMatch[1].replace(/&amp;/g, "&");
    const title = htmlToText(anchorMatch[2]);
    if (!title) continue;
    const sourceUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    openings.push({ title, sourceUrl });
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
  const match = html.match(/id="bo_v_con"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
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
      sourcePlatform: "able-cnc-careers",
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
