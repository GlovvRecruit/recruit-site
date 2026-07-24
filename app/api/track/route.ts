import { createAdminClient } from "@/lib/supabase/admin";

const VALID_EVENT_TYPES = [
  "view",
  "deep_scroll",
  "alert_cta_click",
  "onboarding_submit",
  "apply_click",
  "page_duration",
];

// 이 이벤트들은 조회수와 달리 "같은 사람이 여러 번 클릭"해도 1건으로만 집계한다(같은 IP 기준).
const DEDUP_BY_IP_EVENT_TYPES = ["alert_cta_click", "onboarding_submit", "apply_click"];

const MAX_DURATION_MS = 30 * 60 * 1000; // 30분 — 백그라운드에 방치된 탭 등 이상치 방지

interface TrackPayload {
  path?: string;
  eventType?: string;
  brandId?: string;
  visitorId?: string;
  durationMs?: number;
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

  const { path, eventType, brandId, visitorId, durationMs } = payload;
  if (typeof path !== "string" || !path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }
  if (typeof eventType !== "string" || !VALID_EVENT_TYPES.includes(eventType)) {
    return Response.json({ error: "invalid eventType" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  if (isExcludedIp(clientIp)) {
    return Response.json({ ok: true, skipped: "excluded ip" });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ ok: true, skipped: "supabase not configured" });
  }

  if (DEDUP_BY_IP_EVENT_TYPES.includes(eventType) && clientIp) {
    const { data: existing } = await supabase
      .from("page_views")
      .select("id")
      .eq("event_type", eventType)
      .eq("ip", clientIp)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return Response.json({ ok: true, skipped: "duplicate ip click" });
    }
  }

  let cleanDurationMs: number | null = null;
  if (eventType === "page_duration") {
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
      return Response.json({ error: "invalid durationMs" }, { status: 400 });
    }
    cleanDurationMs = Math.min(durationMs, MAX_DURATION_MS);
  }

  const { error } = await supabase.from("page_views").insert({
    path,
    event_type: eventType,
    brand_id: brandId ?? null,
    visitor_id: visitorId ?? null,
    ip: DEDUP_BY_IP_EVENT_TYPES.includes(eventType) ? clientIp : null,
    duration_ms: cleanDurationMs,
  });

  if (error) {
    console.error("[track] insert failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
