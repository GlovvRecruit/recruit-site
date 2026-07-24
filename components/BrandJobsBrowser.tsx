"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const PAGE_SIZE = 24;

export default function BrandJobsBrowser({
  brands,
  jobs,
}: {
  brands: Brand[];
  jobs: Job[];
}) {
  const [filter, setFilter] = useState<JobCategory | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const interleaved = useMemo(() => interleaveByBrand(jobs), [jobs]);

  const matchingBrandIds = useMemo(() => {
    const term = brandQuery.trim().toLowerCase();
    if (!term) return null;
    const ids = new Set<string>();
    for (const b of brands) {
      const haystack = [b.name, ...(b.brandNames ?? [])];
      if (haystack.some((n) => n.toLowerCase().includes(term))) {
        ids.add(b.id);
      }
    }
    return ids;
  }, [brands, brandQuery]);

  const filtered = interleaved.filter(
    (j) =>
      (!filter || j.jobCategory === filter) &&
      (!matchingBrandIds || matchingBrandIds.has(j.brandId))
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, brandQuery]);
  const visible = filtered.slice(0, visibleCount);

  // sentinel은 필터에 따라 조건부로 마운트/언마운트된다. React는 콜백 ref를 커밋 단계에서
  // (첫 마운트 포함) 곧바로 호출하는데, useEffect 안에서 observer를 만들면 effect가 커밋
  // 이후에 실행되는 탓에 "가장 처음 마운트된" sentinel은 관찰 대상으로 등록되지 못해 무한
  // 스크롤이 전혀 작동하지 않았다. 콜백 ref 안에서 필요한 시점에 observer를 지연 생성하면
  // (이 콜백은 브라우저에서만 실행되므로 SSR에서 IntersectionObserver를 참조할 일도 없다)
  // 생성과 observe가 같은 호출 안에서 함께 일어나 순서 문제가 사라진다.
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const sentinelCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setVisibleCount((c) => c + PAGE_SIZE);
          }
        },
        { rootMargin: "800px" }
      );
    }
    observerRef.current.observe(node);
  }, []);

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold tracking-tight">
          지금 열린 공고 <span className="text-[color:var(--brand-pink)]">{filtered.length}</span>
        </h2>
        <div className="relative">
          <i className="ph-bold ph-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            placeholder="브랜드 검색 (예: 올영, 메디큐브)"
            className="w-[330px] rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3.5 text-[13px] font-bold text-gray-700 placeholder:font-normal placeholder:text-gray-400"
          />
        </div>
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
        {visible.map((job) => {
          const brand = brandById.get(job.brandId);
          if (!brand) return null;
          return <JobCard key={job.id} job={job} brand={brand} />;
        })}
      </div>

      {visibleCount < filtered.length && (
        <div
          ref={sentinelCallbackRef}
          className="mt-6 flex justify-center py-4 text-[13px] text-gray-400"
        >
          불러오는 중...
        </div>
      )}
    </>
  );
}
