import { createAdminClient } from "@/lib/supabase/admin";

const VALID_EVENT_TYPES = [
  "view",
  "deep_scroll",
  "alert_cta_click",
  "onboarding_submit",
  "apply_click",
];

interface TrackPayload {
  path?: string;
  eventType?: string;
  brandId?: string;
  visitorId?: string;
}

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

function isExcludedIp(ip: string | null): boolean {
  if (!ip) return false;
  const excluded = (process.env.EXCLUDED_TRACK_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return excluded.includes(ip);
}

export async function POST(request: Request) {
  let payload: TrackPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { path, eventType, brandId, visitorId } = payload;
  if (typeof path !== "string" || !path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }
  if (typeof eventType !== "string" || !VALID_EVENT_TYPES.includes(eventType)) {
    return Response.json({ error: "invalid eventType" }, { status: 400 });
  }

  if (isExcludedIp(getClientIp(request))) {
    return Response.json({ ok: true, skipped: "excluded ip" });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ ok: true, skipped: "supabase not configured" });
  }

  const { error } = await supabase.from("page_views").insert({
    path,
    event_type: eventType,
    brand_id: brandId ?? null,
    visitor_id: visitorId ?? null,
  });

  if (error) {
    console.error("[track] insert failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
