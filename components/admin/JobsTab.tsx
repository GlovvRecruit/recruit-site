"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CareersJobRow {
  id: string;
  title: string;
  tag: string;
  employment_type: "intern" | "fulltime";
  summary: string;
  employment: string | null;
  location: string | null;
  status: "open" | "closed";
  hashtags: string | null;
  benefit_title: string | null;
  benefit_items: string | null;
  responsibilities: string | null;
  requirements: string | null;
  nice_to_haves: string | null;
  benefits: string | null;
  show_related: boolean;
}

const emptyForm = {
  title: "",
  employmentType: "intern" as "intern" | "fulltime",
  tag: "",
  summary: "",
  hashtags: "",
  benefitTitle: "이런 성장을 약속합니다",
  benefitItems: "",
  responsibilities: "",
  requirements: "",
  niceToHaves: "",
  benefits: "",
  showRelated: true,
};

export default function JobsTab() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<CareersJobRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function startEdit(job: CareersJobRow) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      employmentType: job.employment_type ?? "intern",
      tag: job.tag,
      summary: job.summary,
      hashtags: job.hashtags ?? "",
      benefitTitle: job.benefit_title ?? "이런 성장을 약속합니다",
      benefitItems: job.benefit_items ?? "",
      responsibilities: job.responsibilities ?? "",
      requirements: job.requirements ?? "",
      niceToHaves: job.nice_to_haves ?? "",
      benefits: job.benefits ?? "",
      showRelated: job.show_related ?? true,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveJob() {
    if (!form.title.trim() || !form.tag.trim() || !form.summary.trim()) {
      alert("직무·태그·직무 소개는 필수예요.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      employment_type: form.employmentType,
      tag: form.tag.trim(),
      summary: form.summary.trim(),
      hashtags: form.hashtags.trim() || null,
      benefit_title: form.benefitTitle.trim() || null,
      benefit_items: form.benefitItems.trim() || null,
      responsibilities: form.responsibilities.trim() || null,
      requirements: form.requirements.trim() || null,
      nice_to_haves: form.niceToHaves.trim() || null,
      benefits: form.benefits.trim() || null,
      show_related: form.showRelated,
    };
    if (editingId) {
      await supabase.from("careers_jobs").update(payload).eq("id", editingId);
    } else {
      await supabase.from("careers_jobs").insert({ ...payload, status: "open" });
    }
    cancelEdit();
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
    if (editingId === id) cancelEdit();
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

      <div className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-[18px]">
        {editingId && (
          <div className="flex items-center gap-2 rounded-lg bg-[rgba(255,0,153,.06)] px-3 py-2 text-xs font-bold text-[color:var(--brand-pink)]">
            <span>공고 수정 중</span>
            <button type="button" onClick={cancelEdit} className="ml-auto underline">
              취소하고 새 공고 작성
            </button>
          </div>
        )}

        {/* 1. 직무 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">1. 직무</span>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="예: 글로브 뷰티 인턴"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 인턴/정규직 여부 (제목 바로 다음) */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">고용 형태</span>
          <select
            value={form.employmentType}
            onChange={(e) =>
              setForm((f) => ({ ...f, employmentType: e.target.value as "intern" | "fulltime" }))
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="intern">인턴</option>
            <option value="fulltime">정규직</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">태그(카드 뱃지)</span>
          <input
            value={form.tag}
            onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
            placeholder="예: 인턴, 마케팅"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 2. 직무 소개 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">2. 직무 소개</span>
          <textarea
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="한 줄 소개"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 3. 특징(해시태그) */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">3. 특징(해시태그)</span>
          <input
            value={form.hashtags}
            onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
            placeholder="#1년 후 정규직 전환 검토 #서울 용산구 이태원 사무실 출근 #선착순 마감"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 4-1. 혜택 제목 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">4-1. 혜택 제목</span>
          <input
            value={form.benefitTitle}
            onChange={(e) => setForm((f) => ({ ...f, benefitTitle: e.target.value }))}
            placeholder="이런 성장을 약속합니다"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 4-2. 혜택 상세 (3가지) */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">
            4-2. 혜택 상세 (한 줄에 하나씩, &quot;제목 - 설명&quot; 형식, 최대 3개)
          </span>
          <textarea
            value={form.benefitItems}
            onChange={(e) => setForm((f) => ({ ...f, benefitItems: e.target.value }))}
            placeholder={
              "뷰티 업계에서 인정받는 실력 - 2,000개+ 뷰티 브랜드 마케터와 협업하며 실력을 쌓습니다.\n데이터 기반 콘텐츠 인사이트 - 3만개+ 릴스 콘텐츠를 분석하며 인사이트를 체득합니다.\n성장하는 기업에서 키우는 문제 해결력 - 전략·운영을 경험합니다."
            }
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 5. 이런 일을 해요 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">
            5. 이런 일을 해요 (한 줄에 하나씩)
          </span>
          <textarea
            value={form.responsibilities}
            onChange={(e) => setForm((f) => ({ ...f, responsibilities: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 6. 이런 분을 찾아요 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">
            6. 이런 분을 찾아요 (한 줄에 하나씩)
          </span>
          <textarea
            value={form.requirements}
            onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 7. 이런 분이면 더 좋아요 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">
            7. 이런 분이면 더 좋아요 (한 줄에 하나씩)
          </span>
          <textarea
            value={form.niceToHaves}
            onChange={(e) => setForm((f) => ({ ...f, niceToHaves: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 8. 근무 조건·혜택 */}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600">
            8. 근무 조건·혜택 (한 줄에 하나씩)
          </span>
          <textarea
            value={form.benefits}
            onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>

        {/* 9. 연관 채용공고 보여주기 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.showRelated}
            onChange={(e) => setForm((f) => ({ ...f, showRelated: e.target.checked }))}
            className="accent-[color:var(--brand-pink)]"
          />
          <span className="text-xs font-bold text-gray-600">
            9. 연관 채용공고 보여주기 (상세 페이지 하단에 다른 브랜드 공고 노출)
          </span>
        </label>

        <button
          type="button"
          onClick={saveJob}
          className="rounded-lg py-2.5 text-sm font-extrabold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          {editingId ? "공고 수정 저장" : "공고 등록"}
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
              onClick={() => startEdit(j)}
              className="flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-500"
            >
              수정
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
