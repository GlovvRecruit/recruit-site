"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track as trackEvent, trackDuration } from "@/lib/track";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const DEEP_SCROLL_RATIO = 0.75;

function getCurrentBrandId(): string | undefined {
  return document.getElementById("__brand_marker")?.getAttribute("data-brand-id") ?? undefined;
}

function track(path: string, eventType: "view" | "deep_scroll") {
  trackEvent(path, eventType, getCurrentBrandId());
}

export default function Analytics() {
  const pathname = usePathname();
  const deepScrollFiredRef = useRef(false);

  useEffect(() => {
    track(pathname, "view");
    window.fbq?.("track", "PageView");
    deepScrollFiredRef.current = false;

    const enteredAt = Date.now();
    let durationSent = false;
    function sendDuration() {
      if (durationSent) return;
      durationSent = true;
      trackDuration(pathname, Date.now() - enteredAt, getCurrentBrandId());
    }

    function handleScroll() {
      if (deepScrollFiredRef.current) return;
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const ratio = doc.scrollHeight > 0 ? scrolled / doc.scrollHeight : 0;
      if (ratio >= DEEP_SCROLL_RATIO) {
        deepScrollFiredRef.current = true;
        track(pathname, "deep_scroll");
        window.fbq?.("trackCustom", "DeepScroll", { path: pathname });
      }
    }

    // 탭 전환/최소화/닫기 — SPA 라우트 이동이 아닌 "완전한 이탈"을 잡아낸다.
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") sendDuration();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", sendDuration);

    return () => {
      // 같은 앱 안에서 다른 경로로 이동하는 경우 — 이 클린업이 "이전 페이지"의 체류시간을 보낸다.
      sendDuration();
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", sendDuration);
    };
  }, [pathname]);

  return null;
}
