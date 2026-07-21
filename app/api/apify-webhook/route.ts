import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";

interface ApifyWebhookPayload {
  eventType?: string;
  resource?: {
    id?: string;
    defaultDatasetId?: string;
    status?: string;
  };
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

  const result = await ingestCrawledOpenings(items, payload.resource?.id ?? null);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result);
}
