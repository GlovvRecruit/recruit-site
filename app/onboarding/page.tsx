"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { sampleBrands } from "@/data/sample-jobs";
import { JOB_CATEGORIES, type Brand, type JobCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const STEPS = [1, 2] as const;

const STEP_META: Record<(typeof STEPS)[number], { title: string; subtitle: string }> = {
  1: {
    title: "관심 있는 뷰티 기업과 직무를 골라주세요",
    subtitle: "고른 기업·직무의 신규 공고를 우선으로 보여드려요. 나중에 언제든 바꿀 수 있어요.",
  },
  2: {
    title: "카카오로 알림을 받아볼까요?",
    subtitle: "채널을 추가하고 알림에 동의하면 신규 공고를 카톡으로 보내드려요.",
  },
};

// 브랜드명 글자수가 많으면 카드가 넘치므로, 합쳐서 일정 길이를 넘지 않는 선까지만 표시한다.
function buildBrandLine(names: string[]): string | null {
  if (names.length === 0) return null;

  const MAX_CHARS = 18;
  const shown: string[] = [];
  let total = 0;
  for (const name of names) {
    const added = shown.length === 0 ? name.length : name.length + 1;
    if (shown.length > 0 && total + added > MAX_CHARS) break;
    shown.push(name);
    total += added;
  }
  if (shown.length === 0) shown.push(names[0]);

  const hasMore = shown.length < names.length;
  return `(${shown.join("·")}${hasMore ? "..." : ""})`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [brands, setBrands] = useState<Brand[]>(sampleBrands);
  const [brandIds, setBrandIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<JobCategory>>(new Set());
  const [requestedBrandName, setRequestedBrandName] = useState("");
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [phone, setPhone] = useState("");
  const [channelConsent, setChannelConsent] = useState(false);
  const [channelLinkClicked, setChannelLinkClicked] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBrands() {
      const { data } = await supabaseRef.current
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data && data.length > 0) {
        setBrands(
          data.map((b) => ({
            id: b.id,
            name: b.name,
            logoUrl: b.logo_url,
            profileAi: b.profile_ai,
            profileReviewed: b.profile_reviewed,
            brandNames: b.brand_names,
          }))
        );
      }
    }
    loadBrands();
  }, []);

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

  const allBrandsSelected = brandIds.size === brands.length;
  const allCategoriesSelected = categories.size === JOB_CATEGORIES.length;

  async function handleNext() {
    if (step === 1) {
      if (brandIds.size === 0 && categories.size === 0) {
        alert("관심 기업 또는 직무를 하나 이상 선택해 주세요.");
        return;
      }
      setStep(2);
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
      const supabase = supabaseRef.current;
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const leadFields = {
        brand_ids: [...brandIds],
        categories: [...categories],
        marketing_opt_in: marketingConsent,
        unsubscribed: false,
        // 채널 친구 추가 링크를 클릭했을 때만 true로 기록 — 클릭 안 했다고 기존에 이미
        // 친구인 사용자를 false로 되돌리면 안 되므로, false인 경우엔 필드 자체를 생략한다.
        ...(channelLinkClicked ? { is_channel_friend: true } : {}),
      };
      if (existing) {
        await supabase.from("leads").update(leadFields).eq("id", existing.id);
      } else {
        await supabase.from("leads").insert({ phone, ...leadFields });
      }
      if (requestedBrandName.trim()) {
        await supabase.from("brand_requests").insert({
          requested_name: requestedBrandName.trim(),
          phone,
        });
      }
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
          STEP {step} / 2
        </p>
        <h1 className="mb-1.5 mt-1 text-2xl font-extrabold tracking-tight">
          {STEP_META[step].title}
        </h1>
        <p className="mb-6 text-sm text-gray-500">{STEP_META[step].subtitle}</p>

        {step === 1 && (
          <>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-gray-700">관심 기업</h2>
              <button
                type="button"
                onClick={() =>
                  setBrandIds(allBrandsSelected ? new Set() : new Set(brands.map((b) => b.id)))
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
            <div className={brandsExpanded ? "" : "relative max-h-[400px] overflow-hidden"}>
              <div className="grid grid-cols-3 gap-2.5">
                {brands.map((brand) => {
                  const active = brandIds.has(brand.id);
                  const names = brand.brandNames ?? [];
                  const brandLine = buildBrandLine(names);
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => toggleBrand(brand.id)}
                      className={
                        "flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] bg-white px-2 py-3 transition-shadow " +
                        (active
                          ? "border-[color:var(--brand-pink)] shadow-[0_4px_14px_rgba(255,0,153,0.16)]"
                          : "border-gray-200")
                      }
                    >
                      <span
                        className={
                          "text-center text-[13px] font-bold leading-tight " +
                          (active ? "text-[#b81f6c]" : "text-gray-800")
                        }
                      >
                        {brand.name}
                      </span>
                      {brandLine && (
                        <span className="text-center text-[11px] leading-tight text-gray-400">
                          {brandLine}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!brandsExpanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setBrandsExpanded((v) => !v)}
              className="mx-auto mt-2 flex items-center gap-1 text-[13px] font-bold text-gray-500"
            >
              {brandsExpanded ? "접기" : "전체 보기"}
              <i className={brandsExpanded ? "ph-bold ph-caret-up" : "ph-bold ph-caret-down"} />
            </button>

            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4">
              <span className="mb-1.5 block text-[13px] font-bold text-gray-700">
                더 많은 회사의 알림을 받아보고 싶으신가요?
              </span>
              <input
                value={requestedBrandName}
                onChange={(e) => setRequestedBrandName(e.target.value)}
                placeholder="회사명을 입력해 주세요"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
              />
            </div>

            <h2 className="mb-2.5 mt-7 text-sm font-extrabold text-gray-700">관심 직무</h2>
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
          </>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <div
              className="flex items-center gap-3.5 rounded-2xl p-[18px]"
              style={{ background: "var(--kakao-yellow)" }}
            >
              <i className="ph-fill ph-chat-circle text-[26px] text-[color:var(--kakao-brown)]" />
              <div className="flex-1">
                <div className="text-sm font-extrabold text-[color:var(--kakao-brown)]">
                  앤마들린 채용 카카오 채널 추가
                </div>
                <div className="text-xs" style={{ color: "#5c5300" }}>
                  신규 공고가 뜨면 채널로 알려드려요
                </div>
              </div>
              <a
                href="http://pf.kakao.com/_PhxgfX"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setChannelLinkClicked(true)}
                className="flex-none rounded-lg bg-white px-3 py-2 text-xs font-bold text-[color:var(--kakao-brown)] no-underline"
              >
                채널 추가 <i className="ph-bold ph-arrow-up-right" />
              </a>
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
              step === 2
                ? { background: "var(--kakao-yellow)", color: "var(--kakao-brown)" }
                : { background: "var(--gray-900)", color: "#fff" }
            }
          >
            {step === 2 ? (submitting ? "처리 중..." : "알림 받고 시작하기") : "다음"}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
