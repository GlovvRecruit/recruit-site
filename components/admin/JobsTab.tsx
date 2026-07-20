"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JOB_CATEGORIES, type JobCategory } from "@/lib/types";

interface BrandRow {
  id: string;
  name: string;
  profile_ai: string | null;
  profile_reviewed: boolean;
}

interface JobRow {
  id: string;
  brand_id: string;
  title: string;
  job_category: JobCategory;
  career_level: string;
  region: string;
  requirements_summary: string;
  responsibilities_summary: string;
  compensation_summary: string | null;
  source_url: string;
  status: "open" | "closed";
}

const emptyJobForm = {
  brandId: "",
  title: "",
  jobCategory: JOB_CATEGORIES[0] as JobCategory,
  careerLevel: "",
  region: "",
  requirementsSummary: "",
  responsibilitiesSummary: "",
  compensationSummary: "",
  sourceUrl: "",
};

export default function JobsTab() {
  const supabase = createClient();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandProfile, setNewBrandProfile] = useState("");
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const [b, j] = await Promise.all([
      supabase.from("brands").select("*").order("name"),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    ]);
    setBrands((b.data as BrandRow[]) ?? []);
    setJobs((j.data as JobRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 데이터 조회
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addBrand() {
    if (!newBrandName.trim()) return;
    await supabase.from("brands").insert({
      name: newBrandName.trim(),
      profile_ai: newBrandProfile.trim() || null,
      profile_reviewed: !!newBrandProfile.trim(),
    });
    setNewBrandName("");
    setNewBrandProfile("");
    reload();
  }

  async function toggleReviewed(brand: BrandRow) {
    await supabase
      .from("brands")
      .update({ profile_reviewed: !brand.profile_reviewed })
      .eq("id", brand.id);
    reload();
  }

  async function deleteBrand(id: string) {
    if (!confirm("이 브랜드와 소속 공고를 모두 삭제할까요?")) return;
    await supabase.from("brands").delete().eq("id", id);
    reload();
  }

  async function addJob() {
    if (!jobForm.brandId || !jobForm.title.trim() || !jobForm.sourceUrl.trim()) {
      alert("브랜드, 제목, 원문 링크는 필수예요.");
      return;
    }
    await supabase.from("jobs").insert({
      brand_id: jobForm.brandId,
      title: jobForm.title.trim(),
      job_category: jobForm.jobCategory,
      career_level: jobForm.careerLevel.trim(),
      region: jobForm.region.trim(),
      requirements_summary: jobForm.requirementsSummary.trim(),
      responsibilities_summary: jobForm.responsibilitiesSummary.trim(),
      compensation_summary: jobForm.compensationSummary.trim() || null,
      source_url: jobForm.sourceUrl.trim(),
      status: "open",
    });
    setJobForm(emptyJobForm);
    reload();
  }

  async function toggleJobStatus(job: JobRow) {
    await supabase
      .from("jobs")
      .update({ status: job.status === "open" ? "closed" : "open" })
      .eq("id", job.id);
    reload();
  }

  async function deleteJob(id: string) {
    if (!confirm("이 공고를 삭제할까요?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    reload();
  }

  const brandById = new Map(brands.map((b) => [b.id, b]));

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">브랜드 관리</h2>
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-[18px]">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1.5fr_auto]">
            <input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="브랜드명"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={newBrandProfile}
              onChange={(e) => setNewBrandProfile(e.target.value)}
              placeholder="AI 매력도 한 줄 (검수 완료로 등록됨)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addBrand}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white"
            >
              추가
            </button>
          </div>
        </div>
        <div className="grid gap-2">
          {brands.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <span className="w-32 flex-none truncate text-sm font-bold">{b.name}</span>
              <span className="flex-1 truncate text-xs text-gray-500">
                {b.profile_ai ?? "매력도 미등록"}
              </span>
              <button
                type="button"
                onClick={() => toggleReviewed(b)}
                className={
                  "flex-none rounded-lg px-2.5 py-1 text-xs font-bold " +
                  (b.profile_reviewed
                    ? "bg-[rgba(18,161,80,.1)] text-[color:var(--success)]"
                    : "bg-gray-100 text-gray-500")
                }
              >
                {b.profile_reviewed ? "검수완료" : "미검수"}
              </button>
              <button
                type="button"
                onClick={() => deleteBrand(b.id)}
                className="flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-500"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">채용 공고 관리</h2>
        <div className="mb-4 grid gap-2.5 rounded-2xl border border-gray-200 bg-white p-[18px]">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={jobForm.brandId}
              onChange={(e) => setJobForm((f) => ({ ...f, brandId: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">브랜드 선택</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={jobForm.jobCategory}
              onChange={(e) =>
                setJobForm((f) => ({ ...f, jobCategory: e.target.value as JobCategory }))
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            value={jobForm.title}
            onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="공고 제목"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              value={jobForm.careerLevel}
              onChange={(e) => setJobForm((f) => ({ ...f, careerLevel: e.target.value }))}
              placeholder="경력 (예: 신입, 경력 2년 이상)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={jobForm.region}
              onChange={(e) => setJobForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="지역"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={jobForm.responsibilitiesSummary}
            onChange={(e) =>
              setJobForm((f) => ({ ...f, responsibilitiesSummary: e.target.value }))
            }
            placeholder="업무 내용 요약"
            rows={2}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            value={jobForm.requirementsSummary}
            onChange={(e) => setJobForm((f) => ({ ...f, requirementsSummary: e.target.value }))}
            placeholder="요구 경력 요약"
            rows={2}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              value={jobForm.compensationSummary}
              onChange={(e) =>
                setJobForm((f) => ({ ...f, compensationSummary: e.target.value }))
              }
              placeholder="연봉·혜택 (선택, 없으면 비워두기)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={jobForm.sourceUrl}
              onChange={(e) => setJobForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              placeholder="원문 링크 (https://...)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
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
                {j.job_category}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {brandById.get(j.brand_id)?.name ?? "?"} · {j.title}
              </span>
              <button
                type="button"
                onClick={() => toggleJobStatus(j)}
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
                onClick={() => deleteJob(j.id)}
                className="flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-500"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
