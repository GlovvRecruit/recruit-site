"use client";

import { useEffect, useState } from "react";

interface ActorCost {
  label: string;
  today: number;
  last7Days: number;
  last30Days: number;
  runCount30d: number;
}

interface CrawlCostData {
  total: { today: number; last7Days: number; last30Days: number };
  perActor: ActorCost[];
}

function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

export default function CrawlCostSection() {
  const [data, setData] = useState<CrawlCostData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/crawl-cost")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-9 border-t border-dashed border-gray-300 pt-8">
      <h2 className="mb-1 text-[19px] font-extrabold tracking-tight">크롤링 비용</h2>
      <p className="mb-6 text-sm text-gray-500">
        네이티브 정규식 크롤러 5개(LG·APR그룹·삐아·코리아나·에이블씨엔씨)는 외부 API를 쓰지 않아
        비용이 없어요. 나머지 브랜드는 Apify에서 매일 도는 그리팅HR·나인하이어 크롤러가 채우는데,
        그 실사용 비용(USD)만 집계한 값이에요.
      </p>

      {error ? (
        <p className="text-sm text-gray-400">비용 정보를 불러오지 못했습니다.</p>
      ) : !data ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="rounded-[14px] border border-gray-200 bg-white p-5">
              <div className="text-xs font-bold text-gray-500">오늘</div>
              <div className="brand-gradient-text mt-2 text-[26px] font-extrabold tracking-tight">
                {formatUsd(data.total.today)}
              </div>
            </div>
            <div className="rounded-[14px] border border-gray-200 bg-white p-5">
              <div className="text-xs font-bold text-gray-500">최근 7일</div>
              <div className="brand-gradient-text mt-2 text-[26px] font-extrabold tracking-tight">
                {formatUsd(data.total.last7Days)}
              </div>
            </div>
            <div className="rounded-[14px] border border-gray-200 bg-white p-5">
              <div className="text-xs font-bold text-gray-500">최근 30일</div>
              <div className="brand-gradient-text mt-2 text-[26px] font-extrabold tracking-tight">
                {formatUsd(data.total.last30Days)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-[22px]">
            <table className="w-full min-w-[480px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-400">
                  <th className="py-2 pr-3 font-bold">크롤러</th>
                  <th className="py-2 pr-3 text-right font-bold">오늘</th>
                  <th className="py-2 pr-3 text-right font-bold">최근 7일</th>
                  <th className="py-2 pr-3 text-right font-bold">최근 30일</th>
                  <th className="py-2 text-right font-bold">최근 30일 실행 횟수</th>
                </tr>
              </thead>
              <tbody>
                {data.perActor.map((a) => (
                  <tr key={a.label} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-semibold text-gray-700">{a.label}</td>
                    <td className="py-2 pr-3 text-right font-bold text-gray-700">
                      {formatUsd(a.today)}
                    </td>
                    <td className="py-2 pr-3 text-right font-bold text-gray-700">
                      {formatUsd(a.last7Days)}
                    </td>
                    <td className="py-2 pr-3 text-right font-bold text-gray-700">
                      {formatUsd(a.last30Days)}
                    </td>
                    <td className="py-2 text-right text-gray-500">{a.runCount30d}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
