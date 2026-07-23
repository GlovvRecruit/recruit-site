export interface KakaoShareLink {
  mobileWebUrl: string;
  webUrl: string;
}

export interface KakaoSDK {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (options: {
      objectType: "text";
      text: string;
      link: KakaoShareLink;
      buttons?: { title: string; link: KakaoShareLink }[];
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

/** Kakao SDK 스크립트가 이미 로드돼 있다면 초기화하고 SDK 인스턴스를 반환한다. */
export function ensureKakaoInit(): KakaoSDK | null {
  if (typeof window === "undefined" || !window.Kakao) return null;
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (jsKey && !window.Kakao.isInitialized()) {
    window.Kakao.init(jsKey);
  }
  return window.Kakao;
}
