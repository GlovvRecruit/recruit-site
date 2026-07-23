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
  review_status: string;
  created_at: string;
}

function guessCategory(raw: string | null, title: string): string {
  const text = `${raw ?? ""} ${title}`.toLowerCase();
  if (/\bmd\b/.test(text)) return "MD";
  if (/(marketing|marketer|마케팅|마케터)/.test(text)) return "마케팅";
  if (/(\bbm\b|기획)/.test(text)) return "BM·PM";
  if (/(operation|운영|oper|customer service|customer experience|\bcs\b)/.test(text)) return "운영";
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase
      .from("crawled_jobs_staging")
      .select("*")
      .neq("review_status", "hidden")
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

  async function saveEdit(row: StagingRow) {
    setSavingId(row.id);
    try {
      const { data: brandRow, error: brandError } = await supabase
        .from("brands")
        .upsert({ name: row.brand_name }, { onConflict: "name" })
        .select("id")
        .single();
      if (brandError || !brandRow) {
        alert(`브랜드 저장 실패: ${brandError?.message}`);
        return;
      }

      const { error: jobsError } = await supabase.from("jobs").upsert(
        {
          brand_id: brandRow.id,
          title: titleEdits[row.id] ?? row.title,
          job_category: categoryOf(row),
          career_level: row.career_level,
          region: regionEdits[row.id] ?? row.region,
          source_url: row.source_url,
          description: row.description,
          description_images: row.description_images,
          status: "open",
        },
        { onConflict: "source_url" }
      );
      if (jobsError) {
        alert(`공고 저장 실패: ${jobsError.message}`);
        return;
      }

      await supabase
        .from("crawled_jobs_staging")
        .update({ review_status: "edited", reviewed_at: new Date().toISOString() })
        .eq("id", row.id);

      setItems((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, review_status: "edited" } : r))
      );
    } finally {
      setSavingId(null);
    }
  }

  async function hideRow(row: StagingRow) {
    if (!confirm(`"${row.title}" 공고를 삭제할까요? 이후 크롤링에서 다시 게시되지 않습니다.`)) return;
    setDeletingId(row.id);
    try {
      await supabase
        .from("crawled_jobs_staging")
        .update({ review_status: "hidden", reviewed_at: new Date().toISOString() })
        .eq("id", row.id);
      await supabase.from("jobs").delete().eq("source_url", row.source_url);
      setItems((prev) => prev.filter((r) => r.id !== row.id));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  const mainItems = items.filter((r) => categoryOf(r) !== "기타");
  const otherItems = items.filter((r) => categoryOf(r) === "기타");

  function renderRow(row: StagingRow) {
    const edited = row.review_status === "edited";
    return (
      <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-[18px]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">
            {row.source_platform}
          </span>
          <span className="text-[13px] font-extrabold text-gray-700">{row.brand_name}</span>
          {edited && (
            <span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">
              수정됨
            </span>
          )}
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
        <div className="flex gap-2">
          <button
            type="button"
            disabled={savingId === row.id}
            onClick={() => saveEdit(row)}
            className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
            style={{ background: "var(--brand-gradient)" }}
          >
            {savingId === row.id ? "저장 중..." : "수정 저장"}
          </button>
          <button
            type="button"
            disabled={deletingId === row.id}
            onClick={() => hideRow(row)}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-500 disabled:opacity-60"
          >
            삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-extrabold tracking-tight">크롤링 공고 관리</h1>
      <p className="mb-5 text-sm text-gray-500">
        크롤러가 수집한 공고는 승인 없이 바로 사이트에 게시됩니다. 잘못된 항목은 제목·직무·지역을
        고쳐 저장하거나 삭제하세요. 삭제한 공고는 이후 크롤링에서 다시 게시되지 않습니다.
      </p>

      <h2 className="mb-2 text-base font-extrabold tracking-tight">
        표준 직무 공고 ({mainItems.length}건)
      </h2>
      {mainItems.length === 0 && (
        <p className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          게시된 공고가 없습니다.
        </p>
      )}
      <div className="mb-8 grid gap-2.5">{mainItems.map(renderRow)}</div>

      <h2 className="mb-2 text-base font-extrabold tracking-tight">
        기타 (마케팅/MD/BM·PM/운영/세일즈에 속하지 않는 직무, {otherItems.length}건)
      </h2>
      <p className="mb-4 text-xs text-gray-400">
        법무·회계·인사·연구개발·생산 등 표준 5개 직무에 맞지 않는 공고입니다.
      </p>
      {otherItems.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          기타로 분류된 공고가 없습니다.
        </p>
      )}
      <div className="grid gap-2.5">{otherItems.map(renderRow)}</div>
    </div>
  );
}
