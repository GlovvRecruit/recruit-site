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
 * 중복 집계 방지: React Strict Mode의 이중 실행, 뒤로가기 후 재진입, 새로고침 모두
 * 같은 지원 1건을 여러 번 전환으로 올릴 수 있어 세션당 한 번만 보낸다.
 */
const ONCE_KEY = "cr_fired";

export default function CompleteRegistrationPixel() {
  useEffect(() => {
    let alreadyFired = false;
    try {
      alreadyFired = window.sessionStorage.getItem(ONCE_KEY) === "1";
    } catch {
      // 시크릿 모드·저장소 차단 환경에서는 읽기 자체가 예외를 던진다. 그때는 그냥 한 번 보낸다.
    }
    if (alreadyFired) return;

    // 픽셀 스니펫은 afterInteractive로 늦게 붙지만, fbq는 로드 전에도 큐에 쌓이도록
    // 정의되므로 존재하면 그대로 호출해도 된다. 아직 없으면 이번 방문은 건너뛴다.
    if (typeof window.fbq !== "function") return;
    window.fbq("track", "CompleteRegistration");

    try {
      window.sessionStorage.setItem(ONCE_KEY, "1");
    } catch {
      // 저장 실패는 무시 — 최악의 경우 새로고침 시 한 번 더 잡히는 정도다.
    }
  }, []);

  return null;
}
