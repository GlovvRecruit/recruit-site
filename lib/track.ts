export type TrackEventType =
  | "view"
  | "deep_scroll"
  | "alert_cta_click"
  | "onboarding_submit"
  | "apply_click";

const VISITOR_ID_KEY = "br_visitor_id";

export function getVisitorId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function track(path: string, eventType: TrackEventType, brandId?: string) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, eventType, brandId, visitorId: getVisitorId() }),
    keepalive: true,
  }).catch(() => {});
}
