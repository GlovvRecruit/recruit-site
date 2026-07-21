"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TalentRow {
  id: string;
  name: string;
  contact: string;
  role_interest: string | null;
  portfolio_url: string | null;
  resume_path: string | null;
  created_at: string;
}

export default function TalentPoolTab() {
  const supabase = createClient();
  const [items, setItems] = useState<TalentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("career_applications")
        .select("id, name, contact, role_interest, portfolio_url, resume_path, created_at")
        .is("tally_submission_id", null)
        .order("created_at", { ascending: false });
      setItems((data as TalentRow[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openResume(row: TalentRow) {
    if (!row.resume_path) return;
    setResolvingId(row.id);
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .createSignedUrl(row.resume_path, 60 * 10);
      if (error || !data) {
        alert(`이력서 링크 생성 실패: ${error?.message}`);
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setResolvingId(null);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-extrabold tracking-tight">상시 인재풀</h1>
      <p className="mb-5 text-sm text-gray-500">
        자사 채용 페이지에서 상시 인재풀로 등록한 인원입니다(Tally 지원자 제외). 총 {items.length}건
      </p>

      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          아직 등록된 인재풀이 없습니다.
        </p>
      )}

      <div className="grid gap-2">
        {items.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{r.name}</div>
              <div className="text-xs text-gray-400">{r.contact}</div>
            </div>
            {r.role_interest && (
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                {r.role_interest}
              </span>
            )}
            {r.portfolio_url && (
              <a
                href={r.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-gray-500 no-underline"
              >
                포트폴리오
              </a>
            )}
            {r.resume_path && (
              <button
                type="button"
                disabled={resolvingId === r.id}
                onClick={() => openResume(r)}
                className="flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600 disabled:opacity-60"
              >
                이력서 보기
              </button>
            )}
            <span className="text-xs text-gray-300">
              {new Date(r.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
