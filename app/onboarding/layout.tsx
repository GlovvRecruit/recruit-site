import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "신규 공고 알림 신청",
  robots: { index: false, follow: true },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
