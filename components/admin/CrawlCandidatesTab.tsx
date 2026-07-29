"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status =
  | "unresearched"
  | "active"
  | "own_site"
  | "greetinghr"
  | "ninehire"
  | "excluded"
  | "not_found";

interface CandidateRow {
  id: string;
  name: string;
  list_rank: number;
  status: Status;
  career_url: string | null;
  matched_brand_id: string | null;
  notes: string | null;
  researched_at: string | null;
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  unresearched: { label: "미확인", color: "text-gray-400 bg-gray-100" },
  active: { label: "이미 운영 중", color: "text-gray-600 bg-gray-100" },
  own_site: { label: "자사 홈페이지", color: "text-[#b81f6c]" },
  greetinghr: { label: "그리팅", color: "text-[#b81f6c]" },
  ninehire: { label: "나인하이어", color: "text-[#b81f6c]" },
  excluded: { label: "제외(사람인 등)", color: "text-red-500 bg-red-50" },
  not_found: { label: "채널 못찾음", color: "text-amber-600 bg-amber-50" },
};

const PAGE_SIZE = 50;

// PostgREST 기본 1000행 제한을 피하려고 페이지네이션으로 전부 받아온다(다른 admin 화면과 동일 패턴).
async function fetchAllCandidates(
  supabase: ReturnType<typeof createClient>
): Promise<CandidateRow[]> {
  const CHUNK = 1000;
  const all: CandidateRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("crawl_candidate_brands")
      .select("id, name, list_rank, status, career_url, matched_brand_id, notes, researched_at")
      .order("list_rank", { ascending: true })
      .range(from, from + CHUNK - 1);
    if (error || !data) break;
    all.push(...(data as CandidateRow[]));
    if (data.length < CHUNK) break;
    from += CHUNK;
  }
  return all;
}

export default function CrawlCandidatesTab() {
  const [rows, setRows] = useState<CandidateRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const data = await fetchAllCandidates(supabase);
      if (!cancelled) setRows(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (term && !r.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, statusFilter, query]);

  useEffect(() => setPage(0), [statusFilter, query]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  async function updateRow(id: string, patch: Partial<CandidateRow>) {
    setSavingId(id);
    try {
      const supabase = createClient();
      const fullPatch = { ...patch, researched_at: new Date().toISOString() };
      const { error } = await supabase
        .from("crawl_candidate_brands")
        .update(fullPatch)
        .eq("id", id);
      if (error) throw error;
      setRows((prev) =>
        prev ? prev.map((r) => (r.id === id ? { ...r, ...fullPatch } : r)) : prev
      );
    } catch (e) {
      console.error("[crawl-candidates] update failed:", e);
      alert("저장 중 문제가 생겼어요.");
    } finally {
      setSavingId(null);
    }
  }

  if (!rows) {
    return <p className="text-sm text-gray-400">불러오는 중...</p>;
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2.5">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight">크롤링 확장 후보 (테스트)</h1>
      </div>
      <p className="mb-5 text-[13px] text-gray-400">
        &quot;글로브 이용 브랜드 명단&quot;(총 {rows.length.toLocaleString()}개)을 자사
        홈페이지·그리팅·나인하이어 채용 채널 보유 여부로 조사 중입니다. 사람인·잡코리아·원티드에만
        올라오고 자체 채용 페이지가 없는 곳은 &quot;제외&quot;로 표시하고 크롤링 대상에서 뺍니다.
        고객에게는 노출되지 않는 내부 조사용 화면이에요.
      </p>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
        {(Object.keys(STATUS_META) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
            className={
              "rounded-[14px] border p-4 text-left " +
              (statusFilter === s
                ? "border-[color:var(--brand-pink)] bg-[rgba(255,0,153,0.04)]"
                : "border-gray-200 bg-white")
            }
          >
            <div className="text-xs font-bold text-gray-500">{STATUS_META[s].label}</div>
            <div className="mt-1.5 text-xl font-extrabold text-gray-800">
              {(counts[s] ?? 0).toLocaleString()}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={
            "rounded-full border px-3.5 py-1.5 text-[13px] font-bold " +
            (statusFilter === "all"
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-600")
          }
        >
          전체 ({rows.length.toLocaleString()})
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="브랜드명 검색"
          className="w-[220px] rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px]"
        />
        <span className="text-xs text-gray-400">
          {filtered.length.toLocaleString()}건 중 {page * PAGE_SIZE + 1}-
          {Math.min((page + 1) * PAGE_SIZE, filtered.length)} 표시
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-400">
              <th className="w-14 py-2.5 pl-4 pr-2 font-bold">순위</th>
              <th className="w-40 py-2.5 pr-3 font-bold">브랜드명</th>
              <th className="w-40 py-2.5 pr-3 font-bold">상태</th>
              <th className="py-2.5 pr-3 font-bold">채용 페이지 URL</th>
              <th className="w-56 py-2.5 pr-3 font-bold">메모</th>
              <th className="w-24 py-2.5 pr-4 text-right font-bold">조사일</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 align-top">
                <td className="py-2 pl-4 pr-2 text-gray-400">{r.list_rank}</td>
                <td className="py-2 pr-3 font-semibold text-gray-800">{r.name}</td>
                <td className="py-2 pr-3">
                  <select
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => updateRow(r.id, { status: e.target.value as Status })}
                    className={
                      "w-full rounded-lg border border-gray-200 px-2 py-1 text-[12.5px] font-bold " +
                      STATUS_META[r.status].color
                    }
                  >
                    {(Object.keys(STATUS_META) as Status[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input
                    defaultValue={r.career_url ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (r.career_url ?? "")) updateRow(r.id, { career_url: v || null });
                    }}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[12.5px]"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    defaultValue={r.notes ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (r.notes ?? "")) updateRow(r.id, { notes: v || null });
                    }}
                    placeholder="메모"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[12.5px]"
                  />
                </td>
                <td className="py-2 pr-4 text-right text-[11.5px] text-gray-400">
                  {r.researched_at ? new Date(r.researched_at).toLocaleDateString("ko-KR") : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 flex items-center justify-center gap-2.5">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-bold text-gray-600 disabled:opacity-40"
        >
          이전
        </button>
        <span className="text-xs font-bold text-gray-500">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-bold text-gray-600 disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}
