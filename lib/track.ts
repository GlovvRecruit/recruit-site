export type TrackEventType =
  | "view"
  | "deep_scroll"
  | "alert_cta_click"
  | "onboarding_submit"
  // 채널 추가를 신청 관문에서 뺀 뒤(2026-07-30), 어디서 이탈하는지 구분해서 보기 위한 이벤트.
  // 이전에는 채널 추가 실패와 신청 포기가 구분되지 않아 원인 파악이 불가능했다.
  | "onboarding_done_confirm"
  | "channel_add_success"
  | "channel_add_cancelled"
  | "channel_add_error"
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

// 페이지 이탈(라우트 이동/탭 숨김/닫기) 시점에 호출된다. sendBeacon은 페이지가 언로드되는
// 도중에도 요청을 안정적으로 흘려보내므로 이 용도에 fetch보다 적합하다.
export function trackDuration(path: string, durationMs: number, brandId?: string) {
  const payload = JSON.stringify({
    path,
    eventType: "page_duration",
    brandId,
    visitorId: getVisitorId(),
    durationMs,
  });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/track", blob)) return;
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
