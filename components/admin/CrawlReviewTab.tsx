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
  description: string | null;
  description_images: string[] | null;
  created_at: string;
}

function guessCategory(raw: string | null, title: string): string {
  const text = `${raw ?? ""} ${title}`.toLowerCase();
  if (/\bmd\b/.test(text)) return "MD";
  if (/(marketing|marketer|마케팅|마케터)/.test(text)) return "마케팅";
  if (/(\bbm\b|\bpm\b|기획)/.test(text)) return "BM·PM";
  if (/(operation|운영|oper|customer service|\bcs\b)/.test(text)) return "운영";
  if (/(영업|세일즈|sales)/.test(text)) return "세일즈";
  return "기타";
}

export default function CrawlReviewTab() {
  const supabase = createClient();
  const [items, setItems] = useState<StagingRow[]>([]);
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [categoryPicks, setCategoryPicks] = useState<Record<string, string>>({});
  const [regionEdits, setRegionEdits] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState<"main" | "other" | null>(null);
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

  function categoryOf(row: StagingRow) {
    return categoryPicks[row.id] ?? guessCategory(row.job_category, row.title);
  }

  async function approveRows(rows: StagingRow[], group: "main" | "other") {
    if (rows.length === 0) return;
    setBulkBusy(group);
    try {
      const distinctBrandNames = [...new Set(rows.map((r) => r.brand_name))];
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

      const jobRows = rows.map((row) => ({
        brand_id: brandIdByName.get(row.brand_name),
        title: titleEdits[row.id] ?? row.title,
        job_category: categoryOf(row),
        career_level: row.career_level,
        region: regionEdits[row.id] ?? row.region,
        source_url: row.source_url,
        description: row.description,
        description_images: row.description_images,
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
          rows.map((r) => r.id)
        );

      const approvedIds = new Set(rows.map((r) => r.id));
      setItems((prev) => prev.filter((r) => !approvedIds.has(r.id)));
    } finally {
      setBulkBusy(null);
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

  const mainItems = items.filter((r) => categoryOf(r) !== "기타");
  const otherItems = items.filter((r) => categoryOf(r) === "기타");

  function renderRow(row: StagingRow) {
    return (
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
            value={categoryOf(row)}
            onChange={(e) => setCategoryPicks((prev) => ({ ...prev, [row.id]: e.target.value }))}
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
          <div className="flex items-center rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            {row.career_level ?? "-"}
          </div>
        </div>
        {row.description && (
          <button
            type="button"
            onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
            className="mb-3 text-xs font-bold text-gray-500"
          >
            {expandedId === row.id ? "상세 설명 접기" : "상세 설명 보기"}
          </button>
        )}
        {expandedId === row.id && row.description && (
          <p className="mb-3 max-h-[260px] overflow-y-auto whitespace-pre-line rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
            {row.description}
          </p>
        )}
        <button
          type="button"
          disabled={deletingId === row.id}
          onClick={() => deleteRow(row)}
          className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-500 disabled:opacity-60"
        >
          삭제
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-extrabold tracking-tight">크롤링 검수</h1>
      <p className="mb-5 text-sm text-gray-500">
        크롤러가 수집한 브랜드 공고입니다. 이상한 항목은 삭제하고, 필요하면 제목·직무·지역을 고친
        뒤 한 번에 승인하세요.
      </p>

      <h2 className="mb-2 text-base font-extrabold tracking-tight">
        표준 직무 공고 ({mainItems.length}건)
      </h2>
      <button
        type="button"
        disabled={bulkBusy !== null || mainItems.length === 0}
        onClick={() => approveRows(mainItems, "main")}
        className="mb-4 w-full rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
        style={{ background: "var(--brand-gradient)" }}
      >
        {bulkBusy === "main" ? "승인 처리 중..." : `전체 승인 (${mainItems.length}건)`}
      </button>
      {mainItems.length === 0 && (
        <p className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          검수 대기 중인 공고가 없습니다.
        </p>
      )}
      <div className="mb-8 grid gap-2.5">{mainItems.map(renderRow)}</div>

      <h2 className="mb-2 text-base font-extrabold tracking-tight">
        기타 (마케팅/MD/BM·PM/운영/세일즈에 속하지 않는 직무, {otherItems.length}건)
      </h2>
      <p className="mb-2 text-xs text-gray-400">
        법무·회계·인사·연구개발·생산 등 표준 5개 직무에 맞지 않는 공고입니다. 필요 없으면
        삭제하고, 노출하고 싶으면 승인하세요.
      </p>
      <button
        type="button"
        disabled={bulkBusy !== null || otherItems.length === 0}
        onClick={() => approveRows(otherItems, "other")}
        className="mb-4 w-full rounded-xl border border-gray-300 py-3 text-sm font-extrabold text-gray-700 disabled:opacity-60"
      >
        {bulkBusy === "other" ? "승인 처리 중..." : `기타 전체 승인 (${otherItems.length}건)`}
      </button>
      {otherItems.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          기타로 분류된 공고가 없습니다.
        </p>
      )}
      <div className="grid gap-2.5">{otherItems.map(renderRow)}</div>
    </div>
  );
}
