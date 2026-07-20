"use client";

import Link from "next/link";
import { useState } from "react";
import UnsubscribeModal from "@/components/UnsubscribeModal";

export default function AlertCta() {
  const [unsubOpen, setUnsubOpen] = useState(false);

  return (
    <>
      <section className="card-shadow mb-9 rounded-2xl border border-gray-200 bg-white p-6">
        <Link
          href="/onboarding"
          className="mx-auto flex max-w-[360px] items-center justify-center gap-2 rounded-xl px-4 py-4 text-[15px] font-extrabold no-underline"
          style={{ background: "var(--kakao-yellow)", color: "var(--kakao-brown)" }}
        >
          <i className="ph-fill ph-chat-circle text-[19px]" />
          카카오로 신규 공고 알림 받기
        </Link>
        <div className="mx-auto mt-3 flex max-w-[360px] flex-wrap justify-center gap-2">
          <Link
            href="/onboarding"
            className="min-w-[150px] flex-1 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-center text-[13px] font-bold text-gray-700 no-underline"
          >
            관심 브랜드·직무 수정하기
          </Link>
          <button
            type="button"
            onClick={() => setUnsubOpen(true)}
            className="min-w-[150px] flex-1 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-500"
          >
            신규 공고 알림 그만받기
          </button>
        </div>
      </section>

      {unsubOpen && <UnsubscribeModal onClose={() => setUnsubOpen(false)} />}
    </>
  );
}
