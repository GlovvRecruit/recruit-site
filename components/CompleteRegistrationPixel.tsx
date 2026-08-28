"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * 지원 완료 페이지에서 Meta 표준 이벤트 `CompleteRegistration`을 발화한다.
 *
 * 예전에는 이 페이지의 PageView를 Events Manager의 URL 규칙으로 전환에 매핑했는데, 규칙이
 * 무엇으로 잡히는지가 콘솔 설정에 달려 있어 실제로는 Lead로 집계되고 있었다(2026-08-27 확인).
 * 어떤 이벤트로 잡을지는 코드에서 명시하는 편이 확실하므로 여기서 직접 쏜다.
 *
 * **픽셀 스니펫보다 이 컴포넌트가 먼저 실행될 수 있다.** 스니펫은 next/script(afterInteractive)로
 * body 뒤에 붙는데, 이 effect는 그보다 먼저 도는 경우가 있다. 예전에는 그때 그냥 return 해서
 * 이벤트가 통째로 유실됐다(2026-08-28 실측). 그래서 fbq가 준비될 때까지 짧게 기다린다.
 *
 * 중복 집계 방지: React Strict Mode의 이중 실행, 뒤로가기 후 재진입, 새로고침 모두
 * 같은 지원 1건을 여러 번 전환으로 올릴 수 있어 세션당 한 번만 보낸다.
 */
const ONCE_KEY = "cr_fired";
const WAIT_INTERVAL_MS = 150;
const WAIT_TIMEOUT_MS = 15000;

export default function CompleteRegistrationPixel() {
  useEffect(() => {
    let alreadyFired = false;
    try {
      alreadyFired = window.sessionStorage.getItem(ONCE_KEY) === "1";
    } catch {
      // 시크릿 모드·저장소 차단 환경에서는 읽기 자체가 예외를 던진다. 그때는 그냥 한 번 보낸다.
    }
    if (alreadyFired) return;

    let cancelled = false;
    let waited = 0;

    const fire = () => {
      if (cancelled || typeof window.fbq !== "function") return false;
      window.fbq("track", "CompleteRegistration");
      try {
        window.sessionStorage.setItem(ONCE_KEY, "1");
      } catch {
        // 저장 실패는 무시 — 최악의 경우 새로고침 시 한 번 더 잡히는 정도다.
      }
      return true;
    };

    if (fire()) return;

    const timer = window.setInterval(() => {
      waited += WAIT_INTERVAL_MS;
      if (fire() || waited >= WAIT_TIMEOUT_MS) window.clearInterval(timer);
    }, WAIT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
