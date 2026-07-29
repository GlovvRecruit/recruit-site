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
  Channel: {
    followChannel: (options: { channelPublicId: string }) => Promise<unknown>;
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

export const KAKAO_CHANNEL_PUBLIC_ID = "_PhxgfX";

export type ChannelFollowResult = "added" | "cancelled" | "error";

/**
 * 실제 카카오 채널 친구 추가 팝업을 띄우고 결과를 검증한다. 사용자가 취소하면 reject되고,
 * 이미 친구이거나 새로 추가하면 resolve된다 — 정확한 동작은 이 함수를 실제로 호출해봐야
 * 확인할 수 있어서 테스트 페이지의 핵심 검증 대상이다.
 */
export async function followKakaoChannel(): Promise<ChannelFollowResult> {
  const kakao = ensureKakaoInit();
  if (!kakao) return "error";
  try {
    await kakao.Channel.followChannel({ channelPublicId: KAKAO_CHANNEL_PUBLIC_ID });
    return "added";
  } catch (e) {
    console.error("[kakao] followChannel failed:", e);
    return "cancelled";
  }
}
