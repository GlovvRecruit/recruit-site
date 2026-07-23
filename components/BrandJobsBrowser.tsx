"use client";

import { useMemo, useState } from "react";
import JobCard from "@/components/JobCard";
import { JOB_CATEGORIES, type Brand, type Job, type JobCategory } from "@/lib/types";

// 같은 브랜드 공고가 한꺼번에 크롤링되면 created_at이 거의 동일해 목록에서
// 뭉쳐 보인다. 브랜드별로 라운드로빈으로 섞어 다양한 브랜드가 고르게 노출되게 한다.
function interleaveByBrand(jobs: Job[]): Job[] {
  const queues = new Map<string, Job[]>();
  for (const job of jobs) {
    const list = queues.get(job.brandId) ?? [];
    list.push(job);
    queues.set(job.brandId, list);
  }
  const brandQueues = [...queues.values()];
  const result: Job[] = [];
  let i = 0;
  let remaining = jobs.length;
  while (remaining > 0) {
    const queue = brandQueues[i % brandQueues.length];
    if (queue.length > 0) {
      result.push(queue.shift() as Job);
      remaining--;
    }
    i++;
  }
  return result;
}

export default function BrandJobsBrowser({
  brands,
  jobs,
}: {
  brands: Brand[];
  jobs: Job[];
}) {
  const [filter, setFilter] = useState<JobCategory | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>("");
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const interleaved = useMemo(() => interleaveByBrand(jobs), [jobs]);

  const brandOptions = useMemo(() => {
    const idsWithJobs = new Set(jobs.map((j) => j.brandId));
    return brands
      .filter((b) => idsWithJobs.has(b.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [brands, jobs]);

  const filtered = interleaved.filter(
    (j) => (!filter || j.jobCategory === filter) && (!brandFilter || j.brandId === brandFilter)
  );

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold tracking-tight">
          지금 열린 공고 <span className="text-[color:var(--brand-pink)]">{filtered.length}</span>
        </h2>
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700"
        >
          <option value="">전체 브랜드</option>
          {brandOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
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
