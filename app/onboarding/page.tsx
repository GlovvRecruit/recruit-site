import { permanentRedirect } from "next/navigation";

// 알림 신청 플로우는 /brand-jobs 안에 인라인으로 통합됐다(AlertOnboardingFlow) — 이 페이지는
// 기존 링크·북마크가 새 위치로 이어지도록 리다이렉트만 담당한다.
export default function OnboardingPage() {
  permanentRedirect("/brand-jobs");
}
