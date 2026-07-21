"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DashboardTab from "@/components/admin/DashboardTab";
import JobsTab from "@/components/admin/JobsTab";
import MediaTab from "@/components/admin/MediaTab";
import ManagersTab from "@/components/admin/ManagersTab";
import CrawlReviewTab from "@/components/admin/CrawlReviewTab";

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "jobs", label: "채용 공고" },
  { key: "crawl-review", label: "크롤링 검수" },
  { key: "media", label: "MEDIA" },
  { key: "managers", label: "매니저" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminShell({ email }: { email: string }) {
  const [tab, setTab] = useState<TabKey>("dashboard");

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-2.5">
        <span
          className="h-[22px] w-[22px] rounded-full"
          style={{ background: "var(--brand-gradient)" }}
        />
        <span className="text-[15px] font-extrabold">
          <span className="brand-gradient-text">앤마들린</span>{" "}
          <span className="text-sm font-bold text-gray-400">채용 관리자</span>
        </span>

        <a
          href="https://tally.so/forms/RGzKbK/submissions"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-400 no-underline"
        >
          <i className="ph ph-arrow-square-out" /> Tally 원본 응답
        </a>
        <a
          href="https://brand-helper.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-400 no-underline"
        >
          <i className="ph ph-arrow-square-out" /> brand-helper (인턴 Q&A)
        </a>
        <a
          href="https://glovvrecruit.github.io/exam/admin.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-400 no-underline"
        >
          <i className="ph ph-arrow-square-out" /> exam 채점
        </a>
        <span className="text-xs text-gray-300">{email}</span>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500"
        >
          로그아웃
        </button>
      </header>

      <div className="mx-auto max-w-[900px] px-6 py-6">
        <div className="mb-6 inline-flex gap-1 rounded-full border border-gray-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "rounded-full px-[18px] py-2 text-[13.5px] font-bold " +
                (tab === t.key ? "text-white" : "text-gray-400")
              }
              style={tab === t.key ? { background: "var(--brand-gradient)" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <DashboardTab />}
        {tab === "jobs" && <JobsTab />}
        {tab === "crawl-review" && <CrawlReviewTab />}
        {tab === "media" && <MediaTab />}
        {tab === "managers" && <ManagersTab />}
      </div>
    </div>
  );
}
