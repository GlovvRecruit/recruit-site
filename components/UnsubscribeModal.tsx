"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UnsubscribeModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function submit() {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 10) {
      alert("휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    setStatus("submitting");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("leads")
        .update({ unsubscribed: true })
        .eq("phone", phone)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-shadow w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.28)]"
      >
        {status !== "done" ? (
          <div className="p-[26px]">
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[color:var(--kakao-yellow)]">
                <i className="ph-fill ph-chat-circle text-[19px] text-[color:var(--kakao-brown)]" />
              </span>
              <h2 className="m-0 text-[17px] font-extrabold">신규 공고 알림 그만받기</h2>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex items-center justify-center border-0 bg-transparent text-xl text-gray-400"
              >
                <i className="ph ph-x" />
              </button>
            </div>
            <p className="mb-[18px] text-[13px] leading-normal text-gray-500">
              알림을 받으실 때 등록한 휴대폰 번호를 입력하시면 신규 공고 카톡 알림을
              중단합니다.
            </p>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold text-gray-600">
                휴대폰 번호 <span className="text-[color:var(--brand-pink)]">*</span>
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-[15px] text-gray-900 focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
              />
            </label>
            {status === "error" && (
              <p className="mb-3 text-[12.5px] text-red-500">
                등록된 번호를 찾지 못했어요. 번호를 다시 확인해 주세요.
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={status === "submitting"}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
            >
              {status === "submitting" ? "처리 중..." : "알림 중단하기"}
            </button>
          </div>
        ) : (
          <div className="p-[38px] text-center">
            <span className="mb-4 inline-grid h-[60px] w-[60px] place-items-center rounded-full bg-[rgba(18,161,80,0.12)]">
              <i className="ph-fill ph-check-circle text-[38px] text-[color:var(--success)]" />
            </span>
            <h2 className="mb-2 text-xl font-extrabold">알림을 중단했어요</h2>
            <p className="mb-[22px] text-[13.5px] leading-relaxed text-gray-500">
              입력하신 번호로 더 이상
              <br />
              신규 공고 카톡 알림을 보내지 않아요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-gray-900 py-3.5 text-[15px] font-extrabold text-white"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
