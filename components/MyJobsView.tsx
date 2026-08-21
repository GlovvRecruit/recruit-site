"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandJobsBrowser from "@/components/BrandJobsBrowser";
import { createClient } from "@/lib/supabase/client";
import type { Brand, Job } from "@/lib/types";
import { matchesInterest, INTEREST_MATCH_NOTICE } from "@/lib/interest";

// AlertOnboardingFlow와 같은 저장소 키를 공유한다 — localStorage는 경로가 아니라 도메인 단위이므로
// /brand-jobs에서 등록한 구독 정보를 이 페이지에서 그대로 읽는다.
const STORAGE_KEY = "onboarding_subscribed";
const EXCLUDED_JOBS_KEY = "onboarding_excluded_jobs";

interface StoredSubscription {
  brandIds: string[];
  categories: string[];
  phone: string;
  createdAt: string;
}

function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

type LoadState = "loading" | "ready" | "empty";

/**
 * 카카오 알림의 "더 많은 공고 보기"가 도착하는 전용 화면.
 *
 * 이 브라우저에 구독 정보가 있으면 바로 쓰고, 없으면 `?t=<토큰>`으로 서버에서 복원한다.
 * (카카오톡 인앱 브라우저는 저장소가 분리돼 있어 localStorage가 비어 있는 경우가 많다.
 * 반대로 카카오 템플릿 **버튼**은 URL이 고정이라 토큰을 실을 수 없으므로, 토큰 없이 들어오는
 * 경로도 반드시 동작해야 한다 — 그때는 localStorage에 의존한다.)
 */
export default function MyJobsView({ brands, jobs }: { brands: Brand[]; jobs: Job[] }) {
  const supabaseRef = useRef(createClient());
  const [subscription, setSubscription] = useState<StoredSubscription | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [excludedJobIds, setExcludedJobIds] = useState<Set<string>>(new Set());
  // 이 방문에서 하트를 끈 공고들(다음 방문부터 목록에서 제외된다)
  const [unlikedJobIds, setUnlikedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = readStored<StoredSubscription>(STORAGE_KEY);
    const excluded = readStored<string[]>(EXCLUDED_JOBS_KEY);
    if (excluded) setExcludedJobIds(new Set(excluded));

    if (stored) {
      setSubscription(stored);
      setState("ready");
      return;
    }

    const token = new URLSearchParams(window.location.search).get("t");
    if (!token) {
      setState("empty");
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("leads")
        .select("phone, brand_ids, categories, created_at")
        .eq("access_token", token)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setState("empty");
        return;
      }
      const restored: StoredSubscription = {
        brandIds: (data.brand_ids as string[]) ?? [],
        categories: (data.categories as string[]) ?? [],
        phone: data.phone as string,
        createdAt: (data.created_at as string) ?? new Date().toISOString(),
      };
      setSubscription(restored);
      setState("ready");
      try {
        // 다음 방문부터는 토큰 없이도 열리게 이 브라우저에 저장해둔다.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      } catch {
        // 저장 실패는 무시 — 이 세션에서는 화면 상태로만 유지된다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myJobs = useMemo(() => {
    if (!subscription) return [];
    return jobs.filter(
      (j) =>
        !excludedJobIds.has(j.id) &&
        matchesInterest(j.brandId, j.jobCategory, subscription.brandIds, subscription.categories)
    );
  }, [subscription, jobs, excludedJobIds]);

  // 이 화면은 "내 관심 공고"이므로 모든 카드의 하트가 켜져 있어야 한다(/brand-jobs의 관심 공고
  // 탭과 같은 규칙). 하트를 끄면 곧바로 사라지지 않고 다음 방문부터 목록에서 빠진다 —
  // excludedJobIds는 마운트 시점 스냅샷으로만 필터링에 쓰이고, 해제 기록은 즉시 저장한다.
  const likedJobIds = useMemo(
    () => new Set(myJobs.filter((j) => !unlikedJobIds.has(j.id)).map((j) => j.id)),
    [myJobs, unlikedJobIds]
  );

  function handleToggleLike(jobId: string, nextLiked: boolean) {
    setUnlikedJobIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.delete(jobId);
      else next.add(jobId);
      try {
        const merged = new Set([...excludedJobIds, ...next]);
        window.localStorage.setItem(EXCLUDED_JOBS_KEY, JSON.stringify([...merged]));
      } catch {
        // localStorage 접근 실패는 무시 — 화면 상태로만 유지된다.
      }
      return next;
    });
  }

  if (state === "loading") {
    return <p className="py-16 text-center text-sm text-gray-400">불러오는 중...</p>;
  }

  if (state === "empty") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <h2 className="m-0 text-[17px] font-extrabold tracking-tight">
          아직 등록된 관심 브랜드가 없어요
        </h2>
        <p className="mx-auto mb-6 mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-gray-500">
          관심 브랜드·직무를 등록하면 신규 채용 공고를 매주 월·목 카톡으로 받아볼 수 있어요.
          이미 등록하셨다면, 카톡으로 받은 알림의 링크로 다시 들어와 주세요.
        </p>
        <Link
          href="/brand-jobs"
          className="inline-block rounded-xl bg-gray-900 px-5 py-3 text-[14px] font-extrabold text-white no-underline"
        >
          관심 브랜드 등록하러 가기
        </Link>
      </div>
    );
  }

  const brandCount = subscription?.brandIds.length ?? 0;
  const categoryCount = subscription?.categories.length ?? 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div>
          <p className="m-0 text-[13px] font-extrabold text-gray-700">
            브랜드 {brandCount}개 · 직무 {categoryCount}개 기준으로 모았어요
          </p>
          <p className="m-0 mt-1 max-w-[560px] text-[12.5px] leading-relaxed text-gray-400">
            매주 월·목 오전 9시에 신규 공고를 카톡으로 보내드려요. {INTEREST_MATCH_NOTICE}
          </p>
        </div>
        <Link
          href="/brand-jobs"
          className="rounded-full border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-700 no-underline"
        >
          관심 브랜드·직무 수정
        </Link>
      </div>

      {myJobs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="m-0 text-[14px] font-bold text-gray-600">
            지금은 관심 조건에 맞는 열린 공고가 없어요.
          </p>
          <p className="m-0 mt-1.5 text-[13px] text-gray-400">
            새 공고가 열리면 카톡으로 가장 먼저 알려드려요.
          </p>
        </div>
      ) : (
        <BrandJobsBrowser
          brands={brands}
          jobs={myJobs}
          likedJobIds={likedJobIds}
          onToggleLike={handleToggleLike}
        />
      )}
    </>
  );
}
