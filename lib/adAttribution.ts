// Meta/구글 광고 클릭 파라미터를 붙잡아뒀다가 Tally 지원서 폼으로 넘겨주기 위한 유틸.
// glovvrecruit.github.io/intern/ 사이트의 검증된 방식을 참고했다 — 다만 그 사이트는 정적
// 단일 페이지라 광고 파라미터가 URL에 계속 남아있지만, 이 사이트는 여러 페이지를 거쳐
// 지원 모달까지 도달하는 경우가 많아 fbclid도 utm 파라미터와 함께 저장소에 남겨둔다.
const STORAGE_KEY = "glovv_attr";
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7일 — 이 기간 내 방문이면 마지막 광고 클릭 정보를 재사용
const TRACKED_KEYS = ["utm_source", "utm_medium", "utm_campaign", "adset", "ad", "fbclid", "gclid"];

interface StoredAttribution {
  data: Record<string, string>;
  ts: number;
}

function readStored(): StoredAttribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (Date.now() - parsed.ts > WINDOW_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

// 페이지 로드마다 호출 — 이번 방문 URL에 광고 파라미터가 있으면 최신 값으로 갱신 저장한다.
export function captureAdAttribution(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const current: Record<string, string> = {};
  for (const key of TRACKED_KEYS) {
    const value = params.get(key);
    if (value) current[key] = value;
  }
  if (Object.keys(current).length === 0) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: current, ts: Date.now() }));
  } catch {
    // 저장 실패해도 지원 흐름 자체는 막지 않는다.
  }
}

function getAdAttributionParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const stored = readStored();
  return { ...(stored?.data ?? {}), ref: document.referrer || "" };
}

export function appendAttributionToUrl(baseUrl: string): string {
  const attr = getAdAttributionParams();
  const qs = Object.entries(attr)
    .filter(([, v]) => v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  if (!qs) return baseUrl;
  return baseUrl + (baseUrl.includes("?") ? "&" : "?") + qs;
}
