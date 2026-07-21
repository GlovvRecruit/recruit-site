import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";

interface LgJobNotice {
  jobNoticeId: number;
  jobNoticeName: string;
  careerTypeName: string;
  noticeStatus: string;
}

interface LgRecSector {
  jobGroupName: string;
  detailContext: string | null;
  requiredItem: string | null;
  preferredItem: string | null;
  locationName: string | null;
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

async function fetchJobList(): Promise<LgJobNotice[]> {
  const res = await fetch("https://api.careers.lg.com/rmk/job/retrieveJobNoticesList", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lnbSearch: "",
      hashTagText: "",
      recDate: "CREATION_DATE",
      order: "DESC",
      careerList: [],
      companyCodeList: ["LGHH"],
      desireLocList: [],
      jobGroupList: [],
    }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.jobNoticeList ?? [];
}

async function fetchJobDetail(jobNoticeId: number): Promise<LgRecSector[]> {
  const res = await fetch("https://api.careers.lg.com/rmk/job/retrieveJobNoticesDetail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobNoticeId }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.recList ?? [];
}

function buildDescription(sectors: LgRecSector[]): string {
  return sectors
    .map((s) => {
      const parts = [`[${s.jobGroupName}]`];
      const duty = htmlToText(s.detailContext);
      if (duty) parts.push(`담당업무\n${duty}`);
      const required = htmlToText(s.requiredItem);
      if (required) parts.push(`자격요건\n${required}`);
      const preferred = htmlToText(s.preferredItem);
      if (preferred) parts.push(`우대사항\n${preferred}`);
      return parts.join("\n\n");
    })
    .join("\n\n---\n\n");
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

  const notices = await fetchJobList();
  const openPostings = notices.filter((n) => n.noticeStatus === "POSTING");

  const items: CrawledOpening[] = [];
  for (const notice of openPostings) {
    const sectors = await fetchJobDetail(notice.jobNoticeId);
    const regions = [...new Set(sectors.map((s) => s.locationName).filter(Boolean))];
    items.push({
      sourcePlatform: "lg-careers",
      brandName: "LG생활건강",
      title: notice.jobNoticeName,
      jobCategory: null,
      careerLevel: notice.careerTypeName || null,
      region: regions.length > 0 ? regions.join("·") : null,
      employmentType: null,
      sourceUrl: `https://careers.lg.com/apply/detail?id=${notice.jobNoticeId}`,
      description: sectors.length > 0 ? buildDescription(sectors) : null,
      descriptionImages: null,
    });
  }

  const result = await ingestCrawledOpenings(items, null);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result);
}
