import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";

const SEARCH_URL =
  "https://careers.apgroup.com/search/?createNewAlert=false&q=&optionsFacetsDD_customfield1=&optionsFacetsDD_customfield2=&optionsFacetsDD_shifttype=";
const TARGET_BRAND = "아모레퍼시픽";

interface ApgroupTile {
  id: string;
  href: string;
  title: string;
  brand: string | null;
  region: string | null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

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

function parseCareerLevel(title: string): string | null {
  if (title.startsWith("[신입]")) return "신입";
  if (title.startsWith("[경력]")) return "경력";
  return null;
}

function parseJobTiles(html: string): ApgroupTile[] {
  const tileRe = /<li class="job-tile job-id-(\d+)[^"]*"[^>]*data-url="([^"]+)"/g;
  const tiles: ApgroupTile[] = [];
  let m: RegExpExecArray | null;
  while ((m = tileRe.exec(html))) {
    const id = m[1];
    const href = decodeEntities(m[2]);
    const titleRe = new RegExp(
      `class="jobTitle-link[^>]*data-focus-tile="\\.job-id-${id}"[^>]*>([\\s\\S]*?)<\\/a>`
    );
    const brandRe = new RegExp(`id="job-${id}-desktop-section-customfield2-value">([^<]*)<`);
    const locRe = new RegExp(`id="job-${id}-desktop-section-location-value">([^<]*)<`);
    const title = decodeEntities(html.match(titleRe)?.[1] ?? "").replace(/\s+/g, " ");
    const brand = html.match(brandRe)?.[1]?.trim() ?? null;
    const region = html.match(locRe)?.[1]?.trim() ?? null;
    if (title && href) {
      tiles.push({ id, href, title, brand, region });
    }
  }
  return tiles;
}

async function fetchDescription(detailUrl: string): Promise<string | null> {
  const res = await fetch(detailUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/<span class="jobdescription">([\s\S]*?)<\/span>\s*<\/span>/);
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
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
  const tiles = parseJobTiles(listHtml).filter((t) => t.brand === TARGET_BRAND);

  const items: CrawledOpening[] = [];
  for (const tile of tiles) {
    const detailUrl = `https://careers.apgroup.com${tile.href}`;
    const description = await fetchDescription(detailUrl);
    items.push({
      sourcePlatform: "apgroup-careers",
      brandName: TARGET_BRAND,
      title: tile.title,
      jobCategory: null,
      careerLevel: parseCareerLevel(tile.title),
      region: tile.region,
      employmentType: null,
      sourceUrl: detailUrl,
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
