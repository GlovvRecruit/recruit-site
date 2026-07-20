"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import BrandThumb from "@/components/BrandThumb";
import { sampleBrands } from "@/data/sample-jobs";
import { JOB_CATEGORIES, type JobCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const STEPS = [1, 2, 3] as const;

const STEP_META: Record<(typeof STEPS)[number], { title: string; subtitle: string }> = {
  1: {
    title: "관심 있는 뷰티 기업을 골라주세요",
    subtitle: "고른 기업의 신규 공고를 우선으로 보여드려요. 나중에 언제든 바꿀 수 있어요.",
  },
  2: {
    title: "어떤 직무를 찾고 있나요?",
    subtitle: "찾고 있는 직무를 모두 선택해 주세요.",
  },
  3: {
    title: "카카오로 알림을 받아볼까요?",
    subtitle: "채널을 추가하고 알림에 동의하면 신규 공고를 카톡으로 보내드려요.",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [brandIds, setBrandIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<JobCategory>>(new Set());
  const [phone, setPhone] = useState("");
  const [channelConsent, setChannelConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleBrand = (id: string) =>
    setBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleCategory = (c: JobCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const allBrandsSelected = brandIds.size === sampleBrands.length;
  const allCategoriesSelected = categories.size === JOB_CATEGORIES.length;

  async function handleNext() {
    if (step < 3) {
      setStep((s) => (s + 1) as typeof step);
      return;
    }
    if (brandIds.size === 0 && categories.size === 0) {
      alert("관심 기업 또는 직무를 하나 이상 선택해 주세요.");
      setStep(1);
      return;
    }
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 10) {
      alert("휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    if (!channelConsent) {
      alert("카카오 채널 추가에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from("leads").insert({
        phone,
        brand_ids: [...brandIds],
        categories: [...categories],
        marketing_opt_in: marketingConsent,
      });
    } catch {
      // Supabase 미연결 상태에서도 온보딩 완료 자체는 막지 않는다.
    }
    router.push("/brand-jobs");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <div className="mx-auto w-full max-w-[480px] px-5 pb-10 pt-7">
        <div className="mb-5 flex gap-1.5">
          {STEPS.map((s) => (
            <div
              key={s}
              className="h-[5px] flex-1 rounded-full"
              style={{
                background: s <= step ? "var(--brand-gradient)" : "var(--gray-200)",
              }}
            />
          ))}
        </div>

        <p className="m-0 text-xs font-extrabold tracking-[0.1em] text-[color:var(--brand-pink)]">
          STEP {step} / 3
        </p>
        <h1 className="mb-1.5 mt-1 text-2xl font-extrabold tracking-tight">
          {STEP_META[step].title}
        </h1>
        <p className="mb-6 text-sm text-gray-500">{STEP_META[step].subtitle}</p>

        {step === 1 && (
          <>
            <div className="mb-2.5 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setBrandIds(
                    allBrandsSelected ? new Set() : new Set(sampleBrands.map((b) => b.id))
                  )
                }
                className={
                  "rounded-full border px-4 py-2 text-[13px] font-bold " +
                  (allBrandsSelected
                    ? "border-transparent bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700")
                }
              >
                {allBrandsSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {sampleBrands.map((brand) => {
                const active = brandIds.has(brand.id);
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => toggleBrand(brand.id)}
                    className={
                      "flex min-h-16 flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] bg-white px-2 py-4 transition-shadow " +
                      (active
                        ? "border-[color:var(--brand-pink)] shadow-[0_4px_14px_rgba(255,0,153,0.16)]"
                        : "border-gray-200")
                    }
                  >
                    <BrandThumb
                      name={brand.name}
                      className="h-11 w-11 rounded-full"
                      textClassName="text-sm"
                      initialOnly
                    />
                    <span
                      className={
                        "text-center text-[13px] font-bold leading-tight " +
                        (active ? "text-[#b81f6c]" : "text-gray-800")
                      }
                    >
                      {brand.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() =>
                setCategories(allCategoriesSelected ? new Set() : new Set(JOB_CATEGORIES))
              }
              className={
                "rounded-full border-[1.5px] px-5 py-3 text-[14.5px] font-bold " +
                (allCategoriesSelected
                  ? "border-transparent text-white shadow-[0_3px_10px_rgba(250,60,100,0.25)]"
                  : "border-gray-200 bg-white text-gray-700")
              }
              style={allCategoriesSelected ? { background: "var(--brand-gradient)" } : undefined}
            >
              전체
            </button>
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
        )}

        {step === 3 && (
          <div className="grid gap-3">
            <div
              className="flex items-center gap-3.5 rounded-2xl p-[18px]"
              style={{ background: "var(--kakao-yellow)" }}
            >
              <i className="ph-fill ph-chat-circle text-[26px] text-[color:var(--kakao-brown)]" />
              <div>
                <div className="text-sm font-extrabold text-[color:var(--kakao-brown)]">
                  앤마들린 채용 카카오 채널 추가
                </div>
                <div className="text-xs" style={{ color: "#5c5300" }}>
                  신규 공고가 뜨면 채널로 알려드려요
                </div>
              </div>
            </div>

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
              onClick={() => setChannelConsent((v) => !v)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left"
            >
              <span
                className="grid h-6 w-6 flex-none place-items-center rounded-[7px] border-[1.5px]"
                style={{
                  borderColor: channelConsent ? "var(--gray-900)" : "var(--gray-300)",
                  background: channelConsent ? "var(--gray-900)" : "#fff",
                }}
              >
                {channelConsent && <i className="ph-bold ph-check text-[13px] text-white" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">카카오 채널 추가 (필수)</span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  신규 공고 알림을 받기 위해 필요해요
                </span>
              </span>
            </button>

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
                <span className="block text-sm font-bold">마케팅 정보 수신 동의 (선택)</span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  맞춤 공고·이벤트 소식을 보내드려요
                </span>
              </span>
            </button>
          </div>
        )}

        <div className="mt-6 flex gap-2.5">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as typeof step)}
              className="flex-none rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-[14.5px] font-bold text-gray-700"
            >
              이전
            </button>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={handleNext}
            className="flex-1 rounded-xl py-3.5 text-[15px] font-extrabold disabled:opacity-60"
            style={
              step === 3
                ? { background: "var(--kakao-yellow)", color: "var(--kakao-brown)" }
                : { background: "var(--gray-900)", color: "#fff" }
            }
          >
            {step === 3 ? (submitting ? "처리 중..." : "알림 받고 시작하기") : "다음"}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
