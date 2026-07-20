"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CareersJobRow {
  id: string;
  title: string;
  tag: string;
  summary: string;
  employment: string | null;
  location: string | null;
  status: "open" | "closed";
}

const emptyForm = {
  title: "",
  tag: "",
  summary: "",
  employment: "",
  location: "",
};

export default function JobsTab() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<CareersJobRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { data } = await supabase
      .from("careers_jobs")
      .select("*")
      .order("created_at", { ascending: false });
    setJobs((data as CareersJobRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 데이터 조회
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addJob() {
    if (!form.title.trim() || !form.tag.trim() || !form.summary.trim()) {
      alert("제목·태그·소개는 필수예요.");
      return;
    }
    await supabase.from("careers_jobs").insert({
      title: form.title.trim(),
      tag: form.tag.trim(),
      summary: form.summary.trim(),
      employment: form.employment.trim() || null,
      location: form.location.trim() || null,
      status: "open",
    });
    setForm(emptyForm);
    reload();
  }

  async function toggleStatus(job: CareersJobRow) {
    await supabase
      .from("careers_jobs")
      .update({ status: job.status === "open" ? "closed" : "open" })
      .eq("id", job.id);
    reload();
  }

  async function remove(id: string) {
    if (!confirm("이 공고를 삭제할까요?")) return;
    await supabase.from("careers_jobs").delete().eq("id", id);
    reload();
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <h1 className="mb-1.5 text-[22px] font-extrabold tracking-tight">자사 채용 공고 관리</h1>
      <p className="mb-5 text-[13px] text-gray-400">
        여기서는 Glovv/Flixx 자사 채용 공고만 관리해요. 타 뷰티 브랜드 공고(브랜드 공고 피드)는
        브랜드 자사 채용 페이지에서 크롤링해 별도로 채워질 예정이에요.
      </p>

      <div className="mb-6 grid gap-2.5 rounded-2xl border border-gray-200 bg-white p-[18px]">
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="공고 제목 (예: 글로브 뷰티 인턴)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            value={form.tag}
            onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
            placeholder="태그 (예: 인턴, 마케팅)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.employment}
            onChange={(e) => setForm((f) => ({ ...f, employment: e.target.value }))}
            placeholder="고용 형태 (예: 인턴, 정규직)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder="근무지"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          placeholder="한 줄 소개"
          rows={2}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addJob}
          className="rounded-lg py-2.5 text-sm font-extrabold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          공고 등록
        </button>
      </div>

      <div className="grid gap-2">
        {jobs.map((j) => (
          <div
            key={j.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <span className="flex-none rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
              {j.tag}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{j.title}</span>
            <button
              type="button"
              onClick={() => toggleStatus(j)}
              className={
                "flex-none rounded-lg px-2.5 py-1 text-xs font-bold " +
                (j.status === "open"
                  ? "bg-[rgba(18,161,80,.1)] text-[color:var(--success)]"
                  : "bg-gray-100 text-gray-500")
              }
            >
              {j.status === "open" ? "진행중" : "마감"}
            </button>
            <button
              type="button"
              onClick={() => remove(j.id)}
              className="flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-500"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
