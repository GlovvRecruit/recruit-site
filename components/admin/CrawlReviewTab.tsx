"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JOB_CATEGORIES } from "@/lib/types";

interface StagingRow {
  id: string;
  source_platform: string;
  brand_name: string;
  title: string;
  job_category: string | null;
  career_level: string | null;
  region: string | null;
  employment_type: string | null;
  source_url: string;
  created_at: string;
}

function guessCategory(raw: string | null, title: string): string {
  const text = `${raw ?? ""} ${title}`.toLowerCase();
  if (/(sales|영업|세일즈)/.test(text)) return "세일즈";
  if (/(md\b)/.test(text)) return "MD";
  if (/(marketing|마케팅|pr|홍보)/.test(text)) return "마케팅";
  if (/(bd|pm|제휴|사업개발)/.test(text)) return "BD·PM";
  if (/(operations|scm|운영|물류|cs)/.test(text)) return "운영";
  return JOB_CATEGORIES[0];
}

export default function CrawlReviewTab() {
  const supabase = createClient();
  const [items, setItems] = useState<StagingRow[]>([]);
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [categoryPicks, setCategoryPicks] = useState<Record<string, string>>({});
  const [regionEdits, setRegionEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase
      .from("crawled_jobs_staging")
      .select("*")
      .eq("review_status", "pending")
      .order("brand_name", { ascending: true })
      .order("created_at", { ascending: false });
    const rows = (data as StagingRow[]) ?? [];
    setItems(rows);
    setCategoryPicks((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (!next[r.id]) next[r.id] = guessCategory(r.job_category, r.title);
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 데이터 조회
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approveAll() {
    if (items.length === 0) return;
    setBulkBusy(true);
    try {
      const distinctBrandNames = [...new Set(items.map((r) => r.brand_name))];
      const { data: brandRows, error: brandError } = await supabase
        .from("brands")
        .upsert(
          distinctBrandNames.map((name) => ({ name })),
          { onConflict: "name" }
        )
        .select("id, name");
      if (brandError || !brandRows) {
        alert(`브랜드 저장 실패: ${brandError?.message}`);
        return;
      }
      const brandIdByName = new Map(brandRows.map((b) => [b.name, b.id]));

      const jobRows = items.map((row) => ({
        brand_id: brandIdByName.get(row.brand_name),
        title: titleEdits[row.id] ?? row.title,
        job_category: categoryPicks[row.id] ?? guessCategory(row.job_category, row.title),
        career_level: row.career_level,
        region: regionEdits[row.id] ?? row.region,
        source_url: row.source_url,
        status: "open",
      }));
      const { error: jobsError } = await supabase
        .from("jobs")
        .upsert(jobRows, { onConflict: "source_url" });
      if (jobsError) {
        alert(`공고 저장 실패: ${jobsError.message}`);
        return;
      }

      await supabase
        .from("crawled_jobs_staging")
        .update({ review_status: "approved", reviewed_at: new Date().toISOString() })
        .in(
          "id",
          items.map((r) => r.id)
        );

      setItems([]);
    } finally {
      setBulkBusy(false);
    }
  }

  async function deleteRow(row: StagingRow) {
    setDeletingId(row.id);
    try {
      await supabase.from("crawled_jobs_staging").delete().eq("id", row.id);
      setItems((prev) => prev.filter((r) => r.id !== row.id));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-extrabold tracking-tight">크롤링 검수</h1>
      <p className="mb-1 text-sm text-gray-500">
        크롤러가 수집한 브랜드 공고입니다. 아직은 제목·직무·경력·지역·원문 링크만 수집되고, 상세
        설명(주요 업무·자격 요건)은 원문 사이트에서 링크아웃으로만 확인할 수 있어요.
      </p>
      <p className="mb-5 text-sm text-gray-500">
        이상한 항목은 삭제하고, 필요하면 제목·직무·지역을 고친 뒤 한 번에 승인하세요. 대기 중{" "}
        {items.length}건
      </p>

      <button
        type="button"
        disabled={bulkBusy || items.length === 0}
        onClick={approveAll}
        className="mb-4 w-full rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
        style={{ background: "var(--brand-gradient)" }}
      >
        {bulkBusy ? "승인 처리 중..." : `전체 승인 (${items.length}건)`}
      </button>

      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          검수 대기 중인 공고가 없습니다.
        </p>
      )}

      <div className="grid gap-2.5">
        {items.map((row) => (
          <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-[18px]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">
                {row.source_platform}
              </span>
              <span className="text-[13px] font-extrabold text-gray-700">{row.brand_name}</span>
              <a
                href={row.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-gray-400 no-underline"
              >
                원문 보기 <i className="ph-bold ph-arrow-up-right" />
              </a>
            </div>
            <input
              value={titleEdits[row.id] ?? row.title}
              onChange={(e) => setTitleEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
              className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-[15px] font-bold"
            />
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_140px]">
              <select
                value={categoryPicks[row.id] ?? guessCategory(row.job_category, row.title)}
                onChange={(e) =>
                  setCategoryPicks((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={regionEdits[row.id] ?? row.region ?? ""}
                onChange={(e) => setRegionEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
                placeholder="지역"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <div className="flex items-center rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                {row.career_level ?? "-"} · {row.employment_type ?? "-"}
              </div>
            </div>
            <button
              type="button"
              disabled={deletingId === row.id}
              onClick={() => deleteRow(row)}
              className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-500 disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
