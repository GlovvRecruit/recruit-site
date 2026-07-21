import { createAdminClient } from "@/lib/supabase/admin";

interface ApifyWebhookPayload {
  eventType?: string;
  resource?: {
    id?: string;
    defaultDatasetId?: string;
    status?: string;
  };
}

interface CrawledOpening {
  sourcePlatform: string;
  brandName: string;
  title: string;
  jobCategory?: string | null;
  careerLevel?: string | null;
  region?: string | null;
  employmentType?: string | null;
  sourceUrl: string;
  raw?: unknown;
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

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ error: "supabase not configured" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const rows = items
    .filter((item) => item.sourceUrl && item.title && item.brandName)
    .map((item) => ({
      crawl_run_id: payload.resource?.id ?? null,
      source_platform: item.sourcePlatform,
      brand_name: item.brandName,
      title: item.title,
      job_category: item.jobCategory ?? null,
      career_level: item.careerLevel ?? null,
      region: item.region ?? null,
      employment_type: item.employmentType ?? null,
      source_url: item.sourceUrl,
      raw_payload: item.raw ?? null,
      last_seen_at: now,
    }));

  if (rows.length === 0) {
    return Response.json({ ok: true, upserted: 0 });
  }

  const { error } = await supabase
    .from("crawled_jobs_staging")
    .upsert(rows, { onConflict: "source_url" });

  if (error) {
    console.error("[apify-webhook] upsert failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, upserted: rows.length });
}
