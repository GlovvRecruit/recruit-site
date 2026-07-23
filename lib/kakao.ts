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

export {};
