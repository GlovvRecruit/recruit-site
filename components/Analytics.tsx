"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, eventType, brandId: getCurrentBrandId() }),
    keepalive: true,
  }).catch(() => {});
}

export default function Analytics() {
  const pathname = usePathname();
  const deepScrollFiredRef = useRef(false);

  useEffect(() => {
    track(pathname, "view");
    window.fbq?.("track", "PageView");
    deepScrollFiredRef.current = false;

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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  return null;
}
