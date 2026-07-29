"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BrandJobsBrowser from "@/components/BrandJobsBrowser";
import { JOB_CATEGORIES, type Brand, type Job, type JobCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { followKakaoChannel, type ChannelFollowResult } from "@/lib/kakao";

// 인기 브랜드 빠른 담기용 — 실제로는 조회수/신청 수 기준 상위 브랜드를 서버에서 계산해야 하지만,
// 테스트 페이지에서는 리디자인 문서에 나온 예시 그대로 고정으로 보여준다. "메디큐브"처럼
// 소비자 브랜드명으로만 알려진 경우 brand_names(별칭) 목록까지 같이 찾아 매칭한다.
const POPULAR_BRAND_LABELS = ["CJ올리브영", "아모레퍼시픽", "메디큐브", "애경산업"];

function resolvePopularBrands(brands: Brand[]): { label: string; brand: Brand | null }[] {
  return POPULAR_BRAND_LABELS.map((label) => {
    const brand = brands.find(
      (b) => b.name === label || (b.brandNames ?? []).includes(label)
    );
    return { label, brand: brand ?? null };
  });
}

// brand_names 컬럼은 검색용 별칭(영문 표기, "올영" 같은 줄임말 등)까지 섞여 있어서 그대로
// 노출하면 같은 브랜드가 중복 표기된 것처럼 보인다("올리브영·올영·oliv..." 등). 카드 하단
// 서브타이틀에는 한글 브랜드명만 우선 노출하고, 한글 표기가 아예 없는 경우에만 원본을 쓴다.
const DISPLAY_NAME_OVERRIDES: Record<string, string[]> = {
  CJ올리브영: ["올리브영"],
};

function brandNamesSubtitle(brand: Brand): string | null {
  const override = DISPLAY_NAME_OVERRIDES[brand.name];
  const raw = brand.brandNames ?? [];
  const korean = raw.filter((n) => /[가-힣]/.test(n));
  const names = override ?? (korean.length > 0 ? korean : raw);
  if (names.length === 0) return null;
  const full = names.join("·");
  return full.length > 14 ? `${full.slice(0, 12)}...` : full;
}

const STORAGE_KEY = "test_onboarding_subscribed";
const EXCLUDED_JOBS_KEY = "test_onboarding_excluded_jobs";

interface StoredSubscription {
  brandIds: string[];
  categories: string[];
  phone: string;
  createdAt: string;
}

type FlowStep = "card" | "step1" | "step2" | "done";
type JobFilterMode = "all" | "interested";

function readStoredSubscription(): StoredSubscription | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSubscription) : null;
  } catch {
    return null;
  }
}

function readExcludedJobIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(EXCLUDED_JOBS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export default function TestAlertFlow({ brands, jobs }: { brands: Brand[]; jobs: Job[] }) {
  const supabaseRef = useRef(createClient());
  const [subscription, setSubscription] = useState<StoredSubscription | null>(null);
  const [flow, setFlow] = useState<FlowStep>("card");
  const [jobFilter, setJobFilter] = useState<JobFilterMode>("all");
  const [showUnsubConfirm, setShowUnsubConfirm] = useState(false);

  // "내 관심 공고"에서 하트를 끈 공고는 곧바로 사라지지 않고 맨 아래로 가라앉기만 하다가,
  // 다음번에 이 탭에 다시 들어올 때 실제로 목록에서 제외된다(갑자기 카드가 사라지는 게
  // 아니라 완충 시간을 준다).
  const [excludedJobIds, setExcludedJobIds] = useState<Set<string>>(new Set());
  const [pendingUnlikedIds, setPendingUnlikedIds] = useState<Set<string>>(new Set());
  const pendingUnlikedRef = useRef<Set<string>>(new Set());

  const [brandQuery, setBrandQuery] = useState("");
  const [brandIds, setBrandIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<JobCategory>>(new Set());
  const [moreCompanyInput, setMoreCompanyInput] = useState("");
  const [moreCompanyRequests, setMoreCompanyRequests] = useState<string[]>([]);

  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [channelStatus, setChannelStatus] = useState<"idle" | "checking" | ChannelFollowResult>(
    "idle"
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubscription(readStoredSubscription());
    setExcludedJobIds(readExcludedJobIds());
  }, []);

  useEffect(() => {
    pendingUnlikedRef.current = pendingUnlikedIds;
  }, [pendingUnlikedIds]);

  // jobFilter가 "interested"에서 다른 값으로 바뀌는 순간(=탭을 벗어나는 순간)의 cleanup에서만
  // 커밋한다 — pendingUnlikedIds를 deps에 넣으면 하트를 끌 때마다 곧바로 커밋돼버려서 의도한
  // "다음 진입까지는 그대로 보인다"가 깨진다.
  useEffect(() => {
    return () => {
      if (jobFilter === "interested" && pendingUnlikedRef.current.size > 0) {
        const toExclude = pendingUnlikedRef.current;
        setExcludedJobIds((prev) => {
          const next = new Set(prev);
          toExclude.forEach((id) => next.add(id));
          try {
            window.localStorage.setItem(EXCLUDED_JOBS_KEY, JSON.stringify([...next]));
          } catch {
            // localStorage 접근 실패는 무시 — 다음 세션에서 다시 시도된다.
          }
          return next;
        });
        setPendingUnlikedIds(new Set());
      }
    };
  }, [jobFilter]);

  function handleToggleLike(jobId: string, nextLiked: boolean) {
    setPendingUnlikedIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  const brandNameById = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const popularBrands = useMemo(() => resolvePopularBrands(brands), [brands]);

  const filteredBrands = useMemo(() => {
    const term = brandQuery.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter((b) => {
      const haystack = [b.name, ...(b.brandNames ?? [])];
      return haystack.some((n) => n.toLowerCase().includes(term));
    });
  }, [brands, brandQuery]);

  function toggleBrand(id: string) {
    setBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFilteredSelected =
    filteredBrands.length > 0 && filteredBrands.every((b) => brandIds.has(b.id));

  function toggleSelectAllFiltered() {
    setBrandIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredBrands.forEach((b) => next.delete(b.id));
      } else {
        filteredBrands.forEach((b) => next.add(b.id));
      }
      return next;
    });
  }

  function addMoreCompanyRequest() {
    const name = moreCompanyInput.trim();
    if (!name || moreCompanyRequests.includes(name)) return;
    setMoreCompanyRequests((prev) => [...prev, name]);
    setMoreCompanyInput("");
  }

  function removeMoreCompanyRequest(name: string) {
    setMoreCompanyRequests((prev) => prev.filter((n) => n !== name));
  }

  function toggleCategory(c: JobCategory) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const step1Label =
    brandIds.size === 0 && categories.size === 0
      ? "다음"
      : `브랜드 ${brandIds.size}개 · 직무 ${categories.size}개로 다음`;

  async function handleStep2Submit() {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 10) {
      alert("휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    if (!marketingConsent) {
      alert("공고 알림을 받으려면 마케팅 정보 수신에 동의해 주세요.");
      return;
    }

    setChannelStatus("checking");
    const result = await followKakaoChannel();
    setChannelStatus(result);

    if (result !== "added") {
      // 취소/에러는 별도 모달 없이 같은 화면에서 재시도할 수 있게 인라인으로만 보여준다.
      return;
    }

    setSubmitting(true);
    try {
      const supabase = supabaseRef.current;
      await supabase.from("test_leads").insert({
        phone,
        brand_ids: [...brandIds],
        categories: [...categories],
        marketing_opt_in: marketingConsent,
        channel_verified: true,
      });
      const stored: StoredSubscription = {
        brandIds: [...brandIds],
        categories: [...categories],
        phone,
        createdAt: new Date().toISOString(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setSubscription(stored);
      setFlow("done");
    } catch (e) {
      console.error("[onboarding-test] save failed:", e);
      alert("저장 중 문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit() {
    if (subscription) {
      setBrandIds(new Set(subscription.brandIds));
      setCategories(new Set(subscription.categories as JobCategory[]));
      setPhone(subscription.phone);
    }
    setFlow("step1");
  }

  async function confirmUnsubscribe() {
    if (subscription) {
      try {
        await supabaseRef.current.from("test_lead_unsubscribes").insert({
          phone: subscription.phone,
          brand_ids: subscription.brandIds,
          categories: subscription.categories,
        });
      } catch (e) {
        console.error("[onboarding-test] unsubscribe record failed:", e);
      }
    }
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(EXCLUDED_JOBS_KEY);
    setSubscription(null);
    setBrandIds(new Set());
    setCategories(new Set());
    setPhone("");
    setMarketingConsent(false);
    setChannelStatus("idle");
    setJobFilter("all");
    setExcludedJobIds(new Set());
    setPendingUnlikedIds(new Set());
    setShowUnsubConfirm(false);
    setFlow("card");
  }

  const visibleJobs = useMemo(() => {
    if (jobFilter === "all" || !subscription) return jobs;
    const brandSet = new Set(subscription.brandIds);
    const categorySet = new Set(subscription.categories);
    const matched = jobs.filter(
      (j) => (brandSet.has(j.brandId) || categorySet.has(j.jobCategory)) && !excludedJobIds.has(j.id)
    );
    return [...matched].sort((a, b) => {
      const aPending = pendingUnlikedIds.has(a.id) ? 1 : 0;
      const bPending = pendingUnlikedIds.has(b.id) ? 1 : 0;
      return aPending - bPending;
    });
  }, [jobFilter, subscription, jobs, excludedJobIds, pendingUnlikedIds]);

  const likedJobIds = useMemo(() => {
    if (jobFilter !== "interested") return undefined;
    return new Set(visibleJobs.filter((j) => !pendingUnlikedIds.has(j.id)).map((j) => j.id));
  }, [jobFilter, visibleJobs, pendingUnlikedIds]);

  return (
    <>
      <div
        className={
          "mx-auto w-full max-w-[480px] " + (flow === "step2" ? "mb-20" : "mb-9")
        }
      >
        {flow === "card" && (
          <section className="card-shadow rounded-2xl border border-gray-200 bg-white p-6">
            {subscription ? (
              <>
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
                  <i className="ph-fill ph-bell" /> 알림 받는 중
                </span>
                <p className="m-0 text-[15px] font-extrabold leading-snug">
                  브랜드 {subscription.brandIds.length}개 · 직무 {subscription.categories.length}
                  개의 신규 공고를 카카오로 받고 있어요
                </p>
                <p className="mb-4 mt-1 text-[13px] text-gray-400">
                  {subscription.brandIds
                    .slice(0, 3)
                    .map((id) => brandNameById.get(id))
                    .filter(Boolean)
                    .join(", ")}
                  {subscription.brandIds.length > 3 ? " 외" : ""}
                  {subscription.categories.length > 0 &&
                    ` / ${subscription.categories.join(", ")}`}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[14px] font-bold text-gray-700"
                  >
                    관심 브랜드·직무 수정하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUnsubConfirm(true)}
                    className="flex-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-bold text-gray-400"
                  >
                    알림 해지
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="mb-2 text-2xl font-extrabold leading-snug tracking-tight">
                  관심 브랜드 공고만
                  <br />
                  매주 카톡으로
                </h1>
                <p className="mb-4 text-[13.5px] leading-relaxed text-gray-500">
                  브랜드와 직무를 고르면 새 공고가 열릴 때만 알려드려요.
                  <br />
                  매주 월, 목 오전 9시 · 언제든 해지 가능
                </p>

                <div className="mb-5 grid gap-2.5 rounded-2xl bg-gray-50 p-4">
                  {["관심 브랜드 고르기", "카카오 연결", "매주 월, 목 오전 9시 알림"].map(
                    (label, i) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white text-[12px] font-extrabold text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                          {i + 1}
                        </span>
                        <span className="text-[13.5px] font-semibold text-gray-700">{label}</span>
                      </div>
                    )
                  )}
                </div>

                <span className="mb-2 block text-[13px] font-bold text-gray-400">
                  인기 브랜드 바로 담기
                </span>
                <div className="mb-5 grid grid-cols-2 gap-2">
                  {popularBrands.map((p) => {
                    const active = p.brand && brandIds.has(p.brand.id);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        disabled={!p.brand}
                        onClick={() => p.brand && toggleBrand(p.brand.id)}
                        className={
                          "flex items-center gap-1.5 rounded-xl border-[1.5px] px-3.5 py-2.5 text-[13.5px] font-bold disabled:opacity-40 " +
                          (active
                            ? "border-transparent text-white"
                            : "border-gray-200 bg-white text-gray-700")
                        }
                        style={active ? { background: "var(--brand-gradient)" } : undefined}
                      >
                        <i className={active ? "ph-bold ph-check" : "ph-bold ph-plus"} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setFlow("step1")}
                  className="w-full rounded-xl py-4 text-[15px] font-extrabold text-white"
                  style={{ background: "var(--gray-900)" }}
                >
                  관심 브랜드 고르러 가기
                </button>

                <p className="mt-4 text-center text-[13px] text-gray-400">
                  지금 열린 공고 <span className="font-bold text-gray-600">{jobs.length}</span>
                </p>
              </>
            )}
          </section>
        )}

        {flow === "step1" && (
          <>
            <div className="mb-5 flex gap-1.5">
              <div
                className="h-[5px] flex-1 rounded-full"
                style={{ background: "var(--brand-gradient)" }}
              />
              <div className="h-[5px] flex-1 rounded-full bg-gray-200" />
            </div>
            <p className="m-0 text-xs font-extrabold tracking-[0.1em] text-[color:var(--brand-pink)]">
              STEP 1 / 2
            </p>
            <h1 className="mb-1.5 mt-1 text-2xl font-extrabold tracking-tight">
              어떤 브랜드의 신규 공고를 받아볼까요?
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              신규 공고가 뜨면 카톡으로 알려드려요. 나중에 언제든 바꿀 수 있어요.
            </p>

            <div className="relative mb-3">
              <i className="ph-bold ph-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="브랜드 검색 (예: 올영, 메디큐브)"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3.5 text-[15px] focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
              />
            </div>

            {brandIds.size > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {[...brandIds].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleBrand(id)}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold text-white"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    {brandNameById.get(id)} <i className="ph-bold ph-x text-[10px]" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBrandIds(new Set())}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-[12.5px] font-bold text-gray-400"
                >
                  모두 지우기
                </button>
              </div>
            )}

            {!brandQuery && (
              <div className="mb-4">
                <span className="mb-2 block text-xs font-bold text-gray-400">
                  인기 브랜드 바로 담기
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popularBrands.map((p) => {
                    if (!p.brand) return null;
                    const active = brandIds.has(p.brand.id);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => toggleBrand(p.brand!.id)}
                        className={
                          "rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold " +
                          (active
                            ? "border-transparent text-white"
                            : "border-gray-200 bg-white text-gray-700")
                        }
                        style={active ? { background: "var(--brand-gradient)" } : undefined}
                      >
                        {active && <i className="ph-bold ph-check mr-1 text-[11px]" />}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-gray-700">관심 기업</h2>
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                disabled={filteredBrands.length === 0}
                className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-gray-600 disabled:opacity-40"
              >
                {allFilteredSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>

            <div className="grid max-h-[280px] grid-cols-3 gap-2.5 overflow-y-auto">
              {filteredBrands.length === 0 ? (
                <p className="col-span-3 py-6 text-center text-[13px] text-gray-400">
                  검색 결과가 없어요
                </p>
              ) : (
                filteredBrands.map((brand) => {
                  const active = brandIds.has(brand.id);
                  const subtitle = brandNamesSubtitle(brand);
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => toggleBrand(brand.id)}
                      className={
                        "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] bg-white px-2 py-3 text-center leading-tight transition-shadow " +
                        (active
                          ? "border-[color:var(--brand-pink)] shadow-[0_4px_14px_rgba(255,0,153,0.16)]"
                          : "border-gray-200")
                      }
                    >
                      <span
                        className={
                          "text-[13px] font-bold " + (active ? "text-[#b81f6c]" : "text-gray-800")
                        }
                      >
                        {brand.name}
                      </span>
                      {subtitle && (
                        <span className="text-[11px] text-gray-400">({subtitle})</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-5">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">
                더 많은 기업의 알림을 받아보고 싶으신가요?
              </span>
              <input
                value={moreCompanyInput}
                onChange={(e) => setMoreCompanyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMoreCompanyRequest();
                  }
                }}
                placeholder="기업명 or 브랜드명을 입력하고 Enter를 눌러주세요"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
              />
              {moreCompanyRequests.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {moreCompanyRequests.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => removeMoreCompanyRequest(name)}
                      className="flex items-center gap-1 rounded-full border-[1.5px] border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-gray-700"
                    >
                      {name} <i className="ph-bold ph-x text-[10px] text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h2 className="mb-2.5 mt-7 text-sm font-extrabold text-gray-700">관심 직무</h2>
            <div className="flex flex-wrap gap-2.5">
              {JOB_CATEGORIES.map((category) => {
                const active = categories.has(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={
                      "rounded-full border-[1.5px] px-5 py-3 text-[14.5px] font-bold " +
                      (active
                        ? "border-transparent text-white shadow-[0_3px_10px_rgba(250,60,100,0.25)]"
                        : "border-gray-200 bg-white text-gray-700")
                    }
                    style={active ? { background: "var(--brand-gradient)" } : undefined}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setFlow("card")}
                className="flex-none rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-[14.5px] font-bold text-gray-700"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setFlow("step2")}
                className="flex-1 rounded-xl py-3.5 text-[15px] font-extrabold text-white"
                style={{ background: "var(--gray-900)" }}
              >
                {step1Label}
              </button>
            </div>
          </>
        )}

        {flow === "step2" && (
          <>
            <div className="mb-5 flex gap-1.5">
              <div
                className="h-[5px] flex-1 rounded-full"
                style={{ background: "var(--brand-gradient)" }}
              />
              <div
                className="h-[5px] flex-1 rounded-full"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>
            <p className="m-0 text-xs font-extrabold tracking-[0.1em] text-[color:var(--brand-pink)]">
              STEP 2 / 2
            </p>
            <h1 className="mb-1.5 mt-1 text-2xl font-extrabold tracking-tight">
              카카오톡 채널을 추가하면 끝이에요
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              별도 가입 없이, 채널 추가와 알림 신청이 한 번에 처리돼요.
            </p>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-gray-600">
                  휴대폰 번호 <span className="text-[color:var(--brand-pink)]">*</span>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => setMarketingConsent((v) => !v)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left"
              >
                <span
                  className="grid h-6 w-6 flex-none place-items-center rounded-[7px] border-[1.5px]"
                  style={{
                    borderColor: marketingConsent ? "var(--gray-900)" : "var(--gray-300)",
                    background: marketingConsent ? "var(--gray-900)" : "#fff",
                  }}
                >
                  {marketingConsent && <i className="ph-bold ph-check text-[13px] text-white" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">마케팅 정보 수신 동의 (필수)</span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    신규 공고 알림 발송을 위해 필요해요
                  </span>
                </span>
              </button>

              {channelStatus === "cancelled" && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-[13px] text-red-600">
                  채널 추가가 취소됐어요. 채널을 추가해야 카톡으로 공고를 보내드릴 수 있어요. 다시
                  시도해 주세요.
                </div>
              )}
              {channelStatus === "error" && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-[13px] text-red-600">
                  카카오 연결에 문제가 생겼어요. 네트워크 상태를 확인하고 다시 시도해 주세요.
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setFlow("step1")}
                className="flex-none rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-[14.5px] font-bold text-gray-700"
              >
                이전
              </button>
              <button
                type="button"
                disabled={channelStatus === "checking" || submitting}
                onClick={handleStep2Submit}
                className="flex-1 rounded-xl py-3.5 text-[15px] font-extrabold disabled:opacity-60"
                style={{ background: "var(--kakao-yellow)", color: "var(--kakao-brown)" }}
              >
                {channelStatus === "checking" || submitting
                  ? "처리 중..."
                  : "카카오톡 채널 추가하고 신청 완료하기"}
              </button>
            </div>
          </>
        )}

        {flow === "done" && subscription && (
          <section className="card-shadow rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <div
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
              style={{ background: "var(--brand-gradient)" }}
            >
              <i className="ph-bold ph-check text-2xl text-white" />
            </div>
            <h1 className="mb-1.5 text-xl font-extrabold tracking-tight">알림 신청 완료</h1>
            <p className="mb-5 text-sm text-gray-500">
              브랜드 {subscription.brandIds.length}개 · 직무 {subscription.categories.length}개의
              신규 공고가 있으면 카톡으로 보내드려요.
            </p>
            <button
              type="button"
              onClick={() => setFlow("card")}
              className="w-full rounded-xl py-3.5 text-[15px] font-extrabold text-white"
              style={{ background: "var(--gray-900)" }}
            >
              확인
            </button>
          </section>
        )}
      </div>

      {subscription && (
        <div className="mb-3.5 flex gap-2">
          <button
            type="button"
            onClick={() => setJobFilter("all")}
            className={
              "rounded-full border px-4 py-2 text-[13px] font-bold " +
              (jobFilter === "all"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700")
            }
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setJobFilter("interested")}
            className={
              "rounded-full border px-4 py-2 text-[13px] font-bold " +
              (jobFilter === "interested"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700")
            }
          >
            내 관심 공고
          </button>
        </div>
      )}

      <BrandJobsBrowser
        brands={brands}
        jobs={visibleJobs}
        likedJobIds={likedJobIds}
        onToggleLike={jobFilter === "interested" ? handleToggleLike : undefined}
      />

      {showUnsubConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-[360px] rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-1.5 text-[17px] font-extrabold tracking-tight">
              정말로 알림 해지하시나요?
            </h2>
            <p className="mb-5 text-[13.5px] text-gray-500">
              해지하면 등록해 둔 브랜드·직무의 신규 공고 카톡 알림이 더 이상 오지 않아요.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowUnsubConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[14px] font-bold text-gray-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmUnsubscribe}
                className="flex-1 rounded-xl bg-red-500 py-3 text-[14px] font-extrabold text-white"
              >
                예, 해지할게요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
