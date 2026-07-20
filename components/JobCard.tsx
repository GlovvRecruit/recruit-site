"use client";

import Link from "next/link";
import { useState } from "react";
import type { Brand, Job } from "@/lib/types";
import BrandThumb from "@/components/BrandThumb";

export default function JobCard({ job, brand }: { job: Job; brand: Brand }) {
  const [saved, setSaved] = useState(false);

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
            setSaved((v) => !v);
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
