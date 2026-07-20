"use client";

import { useMemo, useState } from "react";
import JobCard from "@/components/JobCard";
import { JOB_CATEGORIES, type Brand, type Job, type JobCategory } from "@/lib/types";

export default function BrandJobsBrowser({
  brands,
  jobs,
}: {
  brands: Brand[];
  jobs: Job[];
}) {
  const [filter, setFilter] = useState<JobCategory | null>(null);
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const filtered = filter ? jobs.filter((j) => j.jobCategory === filter) : jobs;

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold tracking-tight">
          지금 열린 공고 <span className="text-[color:var(--brand-pink)]">{filtered.length}</span>
        </h2>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1.5">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={
            "flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors " +
            (filter === null
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-700")
          }
        >
          전체
        </button>
        {JOB_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={
              "flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors " +
              (filter === category
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700")
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
        {filtered.map((job) => {
          const brand = brandById.get(job.brandId);
          if (!brand) return null;
          return <JobCard key={job.id} job={job} brand={brand} />;
        })}
      </div>
    </>
  );
}
