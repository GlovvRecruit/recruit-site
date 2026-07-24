"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

interface PageViewRow {
  path: string;
  event_type:
    | "view"
    | "deep_scroll"
    | "alert_cta_click"
    | "onboarding_submit"
    | "apply_click"
    | "apply_submit";
  visitor_id: string | null;
  created_at: string;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    days.push(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
  }
  return days;
}

function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return months;
}

function shortDayLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${m}/${d}`;
}

function shortMonthLabel(key: string): string {
  const [, m] = key.split("-");
  return `${parseInt(m, 10)}월`;
}

function bucketCounts(
  rows: PageViewRow[],
  buckets: string[],
  keyOf: (d: Date) => string,
  labelOf: (key: string) => string,
  distinct: boolean
): { label: string; value: number }[] {
  const groups = new Map<string, Set<string> | number>();
  for (const b of buckets) groups.set(b, distinct ? new Set<string>() : 0);
  for (const r of rows) {
    const k = keyOf(new Date(r.created_at));
    if (!groups.has(k)) continue;
    if (distinct) {
      if (r.visitor_id) (groups.get(k) as Set<string>).add(r.visitor_id);
    } else {
      groups.set(k, (groups.get(k) as number) + 1);
    }
  }
  return buckets.map((b) => {
    const v = groups.get(b)!;
    return { label: labelOf(b), value: distinct ? (v as Set<string>).size : (v as number) };
  });
}

function isDetailPath(path: string): boolean {
  if (path.startsWith("/jobs/")) return true;
  if (path.startsWith("/careers/") && path !== "/careers") return true;
  return false;
}

function TrendCard({
  title,
  data,
  color = "#ff0099",
}: {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-[18px]">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-gray-500">{title}</span>
        <span className="text-lg font-extrabold text-gray-900">{total.toLocaleString()}</span>
      </div>
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              labelStyle={{ fontWeight: 700 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FunnelCard({
  title,
  startLabel,
  start,
  endLabel,
  end,
}: {
  title: string;
  startLabel: string;
  start: number;
  endLabel: string;
  end: number;
}) {
  const pct = start > 0 ? Math.round((end / start) * 1000) / 10 : 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-[22px]">
      <div className="mb-4 text-[15px] font-extrabold tracking-tight">{title}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="text-2xl font-extrabold text-gray-900">{start.toLocaleString()}</div>
          <div className="mt-1 text-xs font-bold text-gray-400">{startLabel}</div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <i className="ph-bold ph-arrow-right text-xl text-gray-300" />
          <span className="brand-gradient-text text-lg font-extrabold">{pct}%</span>
        </div>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-gray-900">{end.toLocaleString()}</div>
          <div className="mt-1 text-xs font-bold text-gray-400">{endLabel}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardTab2() {
  const [rows, setRows] = useState<PageViewRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const { data } = await supabase
        .from("page_views")
        .select("path, event_type, visitor_id, created_at")
        .gte("created_at", since.toISOString());
      if (!cancelled) setRows((data as PageViewRow[]) ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const days30 = useMemo(() => lastNDays(30), []);
  const days7 = useMemo(() => lastNDays(7), []);
  const months12 = useMemo(() => lastNMonths(12), []);
  const todayKey = useMemo(() => dateKey(new Date()), []);

  if (!rows) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  const viewRows = rows.filter((r) => r.event_type === "view");

  const todayVisitors = new Set(
    viewRows.filter((r) => dateKey(new Date(r.created_at)) === todayKey && r.visitor_id).map((r) => r.visitor_id)
  ).size;

  const weeklyVisitorTrend = bucketCounts(
    viewRows,
    days7,
    (d) => dateKey(d),
    shortDayLabel,
    true
  );
  const monthlyVisitorTrend = bucketCounts(
    viewRows,
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    true
  );
  const yearlyVisitorTrend = bucketCounts(
    viewRows,
    months12,
    (d) => monthKey(d),
    shortMonthLabel,
    true
  );

  const brandJobsViewTrend = bucketCounts(
    viewRows.filter((r) => r.path === "/brand-jobs"),
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    false
  );
  const careersViewTrend = bucketCounts(
    viewRows.filter((r) => r.path === "/careers"),
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    false
  );
  const detailViewTrend = bucketCounts(
    viewRows.filter((r) => isDetailPath(r.path)),
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    false
  );

  const applyClickTrend = bucketCounts(
    rows.filter((r) => r.event_type === "apply_click"),
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    false
  );
  const alertCtaClickTrend = bucketCounts(
    rows.filter((r) => r.event_type === "alert_cta_click"),
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    false
  );
  const onboardingSubmitTrend = bucketCounts(
    rows.filter((r) => r.event_type === "onboarding_submit"),
    days30,
    (d) => dateKey(d),
    shortDayLabel,
    false
  );

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const in30d = (r: PageViewRow) => new Date(r.created_at) >= last30;

  const alertCtaClicks30 = rows.filter((r) => r.event_type === "alert_cta_click" && in30d(r)).length;
  const onboardingSubmits30 = rows.filter((r) => r.event_type === "onboarding_submit" && in30d(r)).length;
  const applyClicks30 = rows.filter((r) => r.event_type === "apply_click" && in30d(r)).length;
  const applySubmits30 = rows.filter((r) => r.event_type === "apply_submit" && in30d(r)).length;

  return (
    <div className="mt-9 border-t border-dashed border-gray-300 pt-8">
      <h2 className="mb-1 text-[19px] font-extrabold tracking-tight">트래픽 · 퍼널</h2>
      <p className="mb-6 text-sm text-gray-500">
        방문자·조회수·클릭 퍼널 추이입니다. 방문자 수는 우리 IP를 제외한 값이며, 방문자 식별은{" "}
        {new Date().toLocaleDateString("ko-KR")}부터 수집된 데이터를 기준으로 합니다.
      </p>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-[22px]">
        <div className="text-[13px] font-bold text-gray-500">오늘 접속자 (우리 IP 제외)</div>
        <div className="brand-gradient-text mt-1 text-3xl font-extrabold">
          {todayVisitors.toLocaleString()}
        </div>
      </div>

      <h2 className="mb-2.5 text-base font-extrabold tracking-tight">접속자 수 변화</h2>
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <TrendCard title="주간 (최근 7일)" data={weeklyVisitorTrend} />
        <TrendCard title="월간 (최근 30일)" data={monthlyVisitorTrend} />
        <TrendCard title="연간 (최근 12개월)" data={yearlyVisitorTrend} />
      </div>

      <h2 className="mb-2.5 text-base font-extrabold tracking-tight">페이지별 조회수 변화 (최근 30일)</h2>
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <TrendCard title="메이저 뷰티 브랜드 공고" data={brandJobsViewTrend} />
        <TrendCard title="자사 채용" data={careersViewTrend} />
        <TrendCard title="채용 공고 상세(브랜드/자사)" data={detailViewTrend} />
      </div>

      <h2 className="mb-2.5 text-base font-extrabold tracking-tight">클릭 수 변화 (최근 30일)</h2>
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <TrendCard title="지원 버튼 클릭" data={applyClickTrend} color="#fa7035" />
        <TrendCard title="카카오 알림 받기 클릭 (시작)" color="#ffcd00" data={alertCtaClickTrend} />
        <TrendCard title="알림 받고 시작하기 클릭 (최종)" color="#00b894" data={onboardingSubmitTrend} />
      </div>

      <h2 className="mb-2.5 text-base font-extrabold tracking-tight">전환 퍼널 (최근 30일)</h2>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FunnelCard
          title="카카오 알림 신청 퍼널"
          startLabel="알림 받기 클릭 (시작)"
          start={alertCtaClicks30}
          endLabel="알림 받고 시작하기 (최종)"
          end={onboardingSubmits30}
        />
        <FunnelCard
          title="채용 지원 퍼널"
          startLabel="지원하기 버튼 클릭"
          start={applyClicks30}
          endLabel="최종 지원 완료"
          end={applySubmits30}
        />
      </div>
    </div>
  );
}
