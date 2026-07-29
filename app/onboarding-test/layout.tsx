import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "[TEST] 신규 공고 알림 신청 시안",
  robots: { index: false, follow: false },
};

export default function OnboardingTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
