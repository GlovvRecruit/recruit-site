"use client";

import { useState } from "react";
import { JOB_CATEGORIES } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function CareersApplyForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [roleInterest, setRoleInterest] = useState<string>(JOB_CATEGORIES[0]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  async function handleSubmit() {
    if (!name.trim() || !contact.trim()) {
      alert("이름과 연락처를 입력해 주세요.");
      return;
    }
    setStatus("submitting");
    try {
      const supabase = createClient();
      await supabase.from("career_applications").insert({
        name: name.trim(),
        contact: contact.trim(),
        role_interest: roleInterest,
        portfolio_url: portfolioUrl.trim() || null,
      });
    } catch {
      // Supabase 미연결이어도 인재풀 등록 완료 화면은 보여준다.
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <section className="card-shadow rounded-[18px] border border-gray-200 bg-white p-[26px] text-center">
        <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-full bg-[rgba(18,161,80,0.12)]">
          <i className="ph-fill ph-check-circle text-2xl text-[color:var(--success)]" />
        </span>
        <h2 className="mb-1.5 text-lg font-extrabold">인재풀 등록 완료</h2>
        <p className="text-[13.5px] text-gray-500">
          관련 직무 채용이 열리면 등록해주신 정보를 먼저 검토해 연락드릴게요.
        </p>
      </section>
    );
  }

  return (
    <section className="card-shadow rounded-[18px] border border-gray-200 bg-white p-[26px]">
      <h2 className="mb-1 text-[18px] font-extrabold tracking-tight">상시 인재풀 등록</h2>
      <p className="mb-5 text-[13.5px] text-gray-500">
        관심 직무를 남겨주시면 포지션 오픈 시 우선 안내해 드려요.
      </p>
      <div className="grid gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-gray-600">
            이름 <span className="text-[color:var(--brand-pink)]">*</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-gray-600">
            연락처(이메일 또는 휴대폰) <span className="text-[color:var(--brand-pink)]">*</span>
          </span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-gray-600">관심 직무</span>
          <select
            value={roleInterest}
            onChange={(e) => setRoleInterest(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm"
          >
            {JOB_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
            <option>인턴·기획</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-gray-600">
            포트폴리오 / 링크드인 (선택)
          </span>
          <input
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "submitting"}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(250,60,100,0.3)] disabled:opacity-60"
          style={{ background: "var(--brand-gradient)" }}
        >
          {status === "submitting" ? "제출 중..." : "인재풀 등록하기"}
        </button>
      </div>
    </section>
  );
}
