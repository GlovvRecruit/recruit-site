"use client";

import Link from "next/link";
import { useState } from "react";
import type { Brand, Job } from "@/lib/types";
import BrandThumb from "@/components/BrandThumb";

/**
 * 마감일 배지. 마감일을 모르는 공고(원본에 표기 없음 / "채용시 마감")는 배지를 달지 않는다 —
 * "상시"라고 단정하면 실제로는 곧 마감인 공고를 안심시킬 수 있어서, 마감 임박순 정렬에서만
 * 안내 문구로 설명한다.
 */
function getDeadlineBadge(deadline: string | null | undefined) {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / 86400_000);
  if (days < 0) return null; // 이미 지난 마감일은 표시하지 않는다(크롤러가 정리할 대상)
  if (days === 0) return { label: "오늘 마감", urgent: true };
  return { label: `D-${days}`, urgent: days <= 7 };
}

export default function JobCard({
  job,
  brand,
  liked,
  onToggleLike,
}: {
  job: Job;
  brand: Brand;
  /** 전달되면 하트 상태를 부모가 제어한다(컨트롤드) — 생략 시 카드 내부 상태로 동작. */
  liked?: boolean;
  onToggleLike?: (jobId: string, nextLiked: boolean) => void;
}) {
  const [localSaved, setLocalSaved] = useState(false);
  const saved = liked ?? localSaved;
  const deadlineBadge = getDeadlineBadge(job.deadline);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card-shadow card-shadow-hover block overflow-hidden rounded-2xl border border-gray-200 bg-white text-inherit no-underline transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3]">
        <BrandThumb name={brand.name} className="absolute inset-0" textClassName="text-2xl" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const next = !saved;
            if (onToggleLike) onToggleLike(job.id, next);
            else setLocalSaved(next);
          }}
          aria-label={saved ? "저장 취소" : "저장"}
          aria-pressed={saved}
          className="absolute right-2.5 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,.12)]"
        >
          <i
            className={saved ? "ph-fill ph-heart" : "ph ph-heart"}
            style={{ fontSize: 16, color: saved ? "var(--brand-pink)" : "var(--gray-400)" }}
          />
        </button>
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span
            className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
            style={{
              background: "linear-gradient(120deg, rgba(250,112,53,.14), rgba(255,0,153,.14))",
              color: "#b81f6c",
            }}
          >
            {brand.name}
          </span>
          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
            {job.jobCategory}
          </span>
          {deadlineBadge && (
            <span
              className={
                "rounded-lg px-2.5 py-1 text-[11px] font-bold " +
                (deadlineBadge.urgent ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500")
              }
            >
              {deadlineBadge.label}
            </span>
          )}
        </div>
        <h3 className="mb-2.5 text-[15.5px] font-extrabold leading-snug tracking-tight">
          {job.title}
        </h3>
        <div className="flex gap-3.5 text-[12.5px] text-gray-500">
          <span className="flex items-center gap-1">
            <i className="ph ph-briefcase" />
            {job.careerLevel}
          </span>
          <span className="flex items-center gap-1">
            <i className="ph ph-map-pin" />
            {job.region}
          </span>
        </div>
      </div>
    </Link>
  );
}
