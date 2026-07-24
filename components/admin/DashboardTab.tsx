"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JOB_CATEGORIES } from "@/lib/types";
import DashboardTraffic from "@/components/admin/DashboardTab2";

interface LeadRow {
  brand_ids: string[];
  categories: string[];
  marketing_opt_in: boolean;
  unsubscribed: boolean;
  created_at: string;
}

interface PageViewRow {
  path: string;
  event_type: "view" | "deep_scroll";
  brand_id: string | null;
}

interface PathStat {
  path: string;
  views: number;
  deepScrolls: number;
  deepScrollPct: number;
}

interface Counts {
  brands: number | null;
  openJobs: number | null;
  applications: number | null;
  mediaLinks: number | null;
}

interface Bar {
  label: string;
  pct: number;
  display: string;
}

function toBars(rows: { label: string; value: number }[]): Bar[] {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => ({
    label: r.label,
    pct: (r.value / max) * 100,
    display: r.value.toLocaleString(),
  }));
}

export default function DashboardTab() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [newThisWeek, setNewThisWeek] = useState(0);
  const [brandNameById, setBrandNameById] = useState<Map<string, string>>(new Map());
  const [pageViews, setPageViews] = useState<PageViewRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [brands, openJobs, applications, mediaLinks, leadsRes, brandRows, pageViewsRes] =
        await Promise.all([
          supabase.from("brands").select("*", { count: "exact", head: true }),
          supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("career_applications").select("*", { count: "exact", head: true }),
          supabase.from("media_links").select("*", { count: "exact", head: true }),
          supabase.from("leads").select("brand_ids, categories, marketing_opt_in, unsubscribed, created_at"),
          supabase.from("brands").select("id, name"),
          supabase.from("page_views").select("path, event_type, brand_id"),
        ]);
      if (cancelled) return;
      setCounts({
        brands: brands.count,
        openJobs: openJobs.count,
        applications: applications.count,
        mediaLinks: mediaLinks.count,
      });
      const leadRows = (leadsRes.data as LeadRow[]) ?? [];
      setLeads(leadRows);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setNewThisWeek(
        leadRows.filter((l) => !l.unsubscribed && new Date(l.created_at).getTime() >= oneWeekAgo)
          .length
      );
      setBrandNameById(new Map((brandRows.data ?? []).map((b) => [b.id, b.name])));
      setPageViews((pageViewsRes.data as PageViewRow[]) ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = [
    { label: "등록 브랜드", value: counts?.brands },
    { label: "열린 브랜드 공고", value: counts?.openJobs },
    { label: "자사 채용 지원 (Tally 포함)", value: counts?.applications },
    { label: "MEDIA 링크", value: counts?.mediaLinks },
  ];

  const activeLeads = leads?.filter((l) => !l.unsubscribed) ?? [];
  const marketingOptInCount = activeLeads.filter((l) => l.marketing_opt_in).length;
  const marketingOptInPct =
    activeLeads.length > 0 ? Math.round((marketingOptInCount / activeLeads.length) * 100) : 0;

  const subscriberKpis = [
    { label: "총 알림 구독자", value: leads ? activeLeads.length.toLocaleString() : "–" },
    { label: "이번 주 신규", value: leads ? `+${newThisWeek}` : "–" },
    { label: "마케팅 수신 동의", value: leads ? `${marketingOptInPct}%` : "–" },
  ];

  const categoryCounts = new Map<string, number>(JOB_CATEGORIES.map((c) => [c, 0]));
  for (const lead of activeLeads) {
    for (const c of lead.categories ?? []) {
      categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
    }
  }
  const categoryBars = toBars(
    [...categoryCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  );

  const brandCounts = new Map<string, number>();
  for (const lead of activeLeads) {
    for (const id of lead.brand_ids ?? []) {
      const name = brandNameById.get(id);
      if (!name) continue;
      brandCounts.set(name, (brandCounts.get(name) ?? 0) + 1);
    }
  }
  const brandBars = toBars(
    [...brandCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  );

  const subscriptionStatusBars = leads
    ? toBars([
        { label: "구독 중", value: activeLeads.length },
        { label: "해지", value: leads.length - activeLeads.length },
      ])
    : [];

  const pathStatsMap = new Map<string, { views: number; deepScrolls: number }>();
  for (const pv of pageViews ?? []) {
    const entry = pathStatsMap.get(pv.path) ?? { views: 0, deepScrolls: 0 };
    if (pv.event_type === "view") entry.views += 1;
    else entry.deepScrolls += 1;
    pathStatsMap.set(pv.path, entry);
  }
  const pathStats: PathStat[] = [...pathStatsMap.entries()]
    .map(([path, v]) => ({
      path,
      views: v.views,
      deepScrolls: v.deepScrolls,
      deepScrollPct: v.views > 0 ? Math.round((v.deepScrolls / v.views) * 100) : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  const brandViewCounts = new Map<string, number>();
  for (const pv of pageViews ?? []) {
    if (pv.event_type !== "view" || !pv.brand_id) continue;
    const name = brandNameById.get(pv.brand_id);
    if (!name) continue;
    brandViewCounts.set(name, (brandViewCounts.get(name) ?? 0) + 1);
  }
  const brandViewBars = toBars(
    [...brandViewCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  );

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2.5">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight">대시보드</h1>
      </div>
      <p className="mb-5 text-[13px] text-gray-400">
        카톡 공고 알림 구독자와 사이트 현황을 Supabase에서 바로 조회한 실제 데이터예요.
      </p>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        {subscriberKpis.map((k) => (
          <div key={k.label} className="rounded-[14px] border border-gray-200 bg-white p-5">
            <div className="text-xs font-bold text-gray-500">{k.label}</div>
            <div className="brand-gradient-text mt-2 text-[30px] font-extrabold tracking-tight">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[14px] border border-gray-200 bg-white p-5">
            <div className="text-xs font-bold text-gray-500">{k.label}</div>
            <div className="brand-gradient-text mt-2 text-[30px] font-extrabold tracking-tight">
              {k.value ?? "–"}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-[22px]">
          <h2 className="mb-1 text-[15px] font-extrabold">구독 상태</h2>
          <p className="mb-4 text-[12.5px] text-gray-400">전체 리드 중 구독 유지 비율</p>
          <div className="grid gap-2.5">
            {subscriptionStatusBars.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-16 flex-none text-[13px] font-semibold text-gray-600">
                  {b.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, background: "var(--brand-gradient)" }}
                  />
                </div>
                <span className="w-11 flex-none text-right text-xs font-bold text-gray-500">
                  {b.display}
                </span>
              </div>
            ))}
            {leads && leads.length === 0 && (
              <p className="text-xs text-gray-400">아직 구독 리드가 없습니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-[22px]">
          <h2 className="mb-1 text-[15px] font-extrabold">관심 직군</h2>
          <p className="mb-4 text-[12.5px] text-gray-400">구독자가 선택한 관심 직무(중복 선택)</p>
          <div className="grid gap-3">
            {categoryBars.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-16 flex-none text-[13px] font-bold text-gray-700">
                  {b.label}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, background: "var(--brand-gradient)" }}
                  />
                </div>
                <span className="w-11 flex-none text-right text-xs font-bold text-gray-500">
                  {b.display}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-[22px]">
        <h2 className="mb-1 text-[15px] font-extrabold">관심 브랜드 순위</h2>
        <p className="mb-4 text-[12.5px] text-gray-400">
          구독자가 알림을 신청한 브랜드(중복 선택, 상위 12개)
        </p>
        {brandBars.length === 0 ? (
          <p className="text-xs text-gray-400">아직 브랜드를 선택한 구독자가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-7 gap-y-2.5 sm:grid-cols-2">
            {brandBars.map((b, i) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-5 flex-none text-xs font-extrabold text-gray-300">
                  {i + 1}
                </span>
                <span className="w-24 flex-none truncate text-[13px] font-semibold text-gray-700">
                  {b.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, background: "var(--brand-gradient)" }}
                  />
                </div>
                <span className="w-11 flex-none text-right text-xs font-bold text-gray-500">
                  {b.display}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-[22px]">
        <h2 className="mb-1 text-[15px] font-extrabold">관심 브랜드 순위 (조회수 기준)</h2>
        <p className="mb-4 text-[12.5px] text-gray-400">
          브랜드 공고 상세 페이지 조회수 기준(상위 12개) — 알림 신청과 별개 지표예요
        </p>
        {!pageViews ? (
          <p className="text-xs text-gray-400">불러오는 중…</p>
        ) : brandViewBars.length === 0 ? (
          <p className="text-xs text-gray-400">아직 집계된 조회 데이터가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-7 gap-y-2.5 sm:grid-cols-2">
            {brandViewBars.map((b, i) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-5 flex-none text-xs font-extrabold text-gray-300">
                  {i + 1}
                </span>
                <span className="w-24 flex-none truncate text-[13px] font-semibold text-gray-700">
                  {b.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, background: "var(--brand-gradient)" }}
                  />
                </div>
                <span className="w-11 flex-none text-right text-xs font-bold text-gray-500">
                  {b.display}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-[22px]">
        <h2 className="mb-1 text-[15px] font-extrabold">페이지별 조회수 · 딥스크롤</h2>
        <p className="mb-4 text-[12.5px] text-gray-400">
          조회수 상위 12개 페이지 — 딥스크롤은 페이지의 75% 이상을 스크롤한 방문 비율이에요
        </p>
        {!pageViews ? (
          <p className="text-xs text-gray-400">불러오는 중…</p>
        ) : pathStats.length === 0 ? (
          <p className="text-xs text-gray-400">아직 집계된 조회 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-400">
                  <th className="py-2 pr-3 font-bold">페이지</th>
                  <th className="py-2 pr-3 text-right font-bold">조회수</th>
                  <th className="py-2 pr-3 text-right font-bold">딥스크롤 횟수</th>
                  <th className="py-2 text-right font-bold">딥스크롤 비율</th>
                </tr>
              </thead>
              <tbody>
                {pathStats.map((s) => (
                  <tr key={s.path} className="border-b border-gray-50">
                    <td className="max-w-[280px] truncate py-2 pr-3 font-semibold text-gray-700">
                      {s.path}
                    </td>
                    <td className="py-2 pr-3 text-right font-bold text-gray-700">{s.views}</td>
                    <td className="py-2 pr-3 text-right text-gray-500">{s.deepScrolls}</td>
                    <td className="py-2 text-right font-bold text-gray-700">{s.deepScrollPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-[13px] leading-relaxed text-gray-500">
        <p className="m-0">
          <b className="font-bold text-gray-700">브랜드/공고</b>는 크롤링 파이프라인과 admin
          &quot;크롤링 검수&quot; 탭 승인을 거쳐 채워져요. Glovv·플릭스 자사 공고는
          &quot;채용 공고&quot; 탭에서 직접 작성합니다.
        </p>
        <p className="m-0">
          <b className="font-bold text-gray-700">자사 채용 지원</b>은 실제 지원자가 Tally 폼으로
          제출하면 웹훅(<code className="rounded bg-gray-100 px-1 py-0.5">/api/tally-webhook</code>)이
          자동으로 여기 반영해요.
        </p>
        <p className="m-0">
          <b className="font-bold text-gray-700">조회수·딥스크롤</b>은 자체 수집 데이터(Meta Pixel과
          별개)예요. 연령대·구직 상태 등은 여전히 수집하지 않아요.
        </p>
      </div>

      <DashboardTraffic />
    </div>
  );
}
