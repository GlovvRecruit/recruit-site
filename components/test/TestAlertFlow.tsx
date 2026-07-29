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

const STORAGE_KEY = "test_onboarding_subscribed";

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

export default function TestAlertFlow({ brands, jobs }: { brands: Brand[]; jobs: Job[] }) {
  const supabaseRef = useRef(createClient());
  const [subscription, setSubscription] = useState<StoredSubscription | null>(null);
  const [flow, setFlow] = useState<FlowStep>("card");
  const [jobFilter, setJobFilter] = useState<JobFilterMode>("all");

  const [brandQuery, setBrandQuery] = useState("");
  const [brandIds, setBrandIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<JobCategory>>(new Set());

  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [channelStatus, setChannelStatus] = useState<"idle" | "checking" | ChannelFollowResult>(
    "idle"
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubscription(readStoredSubscription());
  }, []);

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

  function unsubscribe() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSubscription(null);
    setBrandIds(new Set());
    setCategories(new Set());
    setPhone("");
    setMarketingConsent(false);
    setChannelStatus("idle");
    setJobFilter("all");
    setFlow("card");
  }

  const visibleJobs = useMemo(() => {
    if (jobFilter === "all" || !subscription) return jobs;
    const brandSet = new Set(subscription.brandIds);
    const categorySet = new Set(subscription.categories);
    return jobs.filter((j) => brandSet.has(j.brandId) || categorySet.has(j.jobCategory));
  }, [jobFilter, subscription, jobs]);

  return (
    <>
      <div className="mx-auto mb-9 w-full max-w-[480px]">
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
                    onClick={unsubscribe}
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
                  브랜드와 직무를 고르면 새 공고가 열릴 때만 알려드려요. 매주 월, 목 오전 9시 ·
                  언제든 해지 가능
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

            <div className="grid max-h-[280px] grid-cols-3 gap-2.5 overflow-y-auto">
              {filteredBrands.length === 0 ? (
                <p className="col-span-3 py-6 text-center text-[13px] text-gray-400">
                  검색 결과가 없어요
                </p>
              ) : (
                filteredBrands.map((brand) => {
                  const active = brandIds.has(brand.id);
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => toggleBrand(brand.id)}
                      className={
                        "flex min-h-16 items-center justify-center rounded-2xl border-[1.5px] bg-white px-2 py-3 text-center text-[13px] font-bold leading-tight transition-shadow " +
                        (active
                          ? "border-[color:var(--brand-pink)] text-[#b81f6c] shadow-[0_4px_14px_rgba(255,0,153,0.16)]"
                          : "border-gray-200 text-gray-800")
                      }
                    >
                      {brand.name}
                    </button>
                  );
                })
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

            <div className="grid gap-3">
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

      <BrandJobsBrowser brands={brands} jobs={visibleJobs} />
    </>
  );
}
