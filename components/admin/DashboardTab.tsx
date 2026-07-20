"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Counts {
  brands: number | null;
  openJobs: number | null;
  leads: number | null;
  applications: number | null;
  mediaLinks: number | null;
}

export default function DashboardTab() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [brands, openJobs, leads, applications, mediaLinks] = await Promise.all([
        supabase.from("brands").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("unsubscribed", false),
        supabase.from("career_applications").select("*", { count: "exact", head: true }),
        supabase.from("media_links").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setCounts({
        brands: brands.count,
        openJobs: openJobs.count,
        leads: leads.count,
        applications: applications.count,
        mediaLinks: mediaLinks.count,
      });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = [
    { label: "등록 브랜드 (크롤링 예정)", value: counts?.brands },
    { label: "열린 브랜드 공고 (크롤링 예정)", value: counts?.openJobs },
    { label: "알림 구독 리드", value: counts?.leads },
    { label: "자사 채용 지원 (Tally 포함)", value: counts?.applications },
    { label: "MEDIA 링크", value: counts?.mediaLinks },
  ];

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2.5">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight">대시보드</h1>
      </div>
      <p className="mb-5 text-[13px] text-gray-400">Supabase에서 바로 조회한 실제 카운트예요.</p>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[14px] border border-gray-200 bg-white p-5">
            <div className="text-xs font-bold text-gray-500">{k.label}</div>
            <div className="brand-gradient-text mt-2 text-[30px] font-extrabold tracking-tight">
              {k.value ?? "–"}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-[13px] leading-relaxed text-gray-500">
        <p className="m-0">
          <b className="font-bold text-gray-700">브랜드/공고</b>는 아직 admin에서 직접 입력하지
          않아요 — 각 브랜드의 자사 채용 페이지를 크롤링하는 파이프라인이 채울 예정이에요(구축 전).
        </p>
        <p className="m-0">
          <b className="font-bold text-gray-700">자사 채용 지원</b>은 실제 지원자가 Tally 폼으로
          제출하면 웹훅(<code className="rounded bg-gray-100 px-1 py-0.5">/api/tally-webhook</code>)이
          자동으로 여기 반영해요. Tally 원본 응답은 상단 &quot;Tally 원본 응답&quot; 링크에서도
          확인할 수 있어요.
        </p>
        <p className="m-0">
          연령대·구직 상태 등 방문자 인구통계는 별도 분석 도구를 연결하기 전까지는 수집하지
          않아요.
        </p>
      </div>
    </div>
  );
}
