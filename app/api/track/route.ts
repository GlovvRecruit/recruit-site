import { createAdminClient } from "@/lib/supabase/admin";

interface TrackPayload {
  path?: string;
  eventType?: string;
  brandId?: string;
}

export async function POST(request: Request) {
  let payload: TrackPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { path, eventType, brandId } = payload;
  if (typeof path !== "string" || !path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }
  if (eventType !== "view" && eventType !== "deep_scroll") {
    return Response.json({ error: "invalid eventType" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ ok: true, skipped: "supabase not configured" });
  }

  const { error } = await supabase.from("page_views").insert({
    path,
    event_type: eventType,
    brand_id: brandId ?? null,
  });

  if (error) {
    console.error("[track] insert failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
