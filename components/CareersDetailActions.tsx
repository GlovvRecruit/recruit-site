"use client";

import { useState } from "react";
import CareersApplyModal from "@/components/CareersApplyModal";
import { ensureKakaoInit } from "@/lib/kakao";

export default function CareersDetailActions({ jobTitle }: { jobTitle: string }) {
  const [open, setOpen] = useState(false);

  function shareKakao() {
    const kakao = ensureKakaoInit();
    if (kakao) {
      kakao.Share.sendDefault({
        objectType: "text",
        text: `앤마들린 채용 · ${jobTitle}`,
        link: { mobileWebUrl: location.href, webUrl: location.href },
        buttons: [
          {
            title: "자세히 보기",
            link: { mobileWebUrl: location.href, webUrl: location.href },
          },
        ],
      });
      return;
    }
    if (navigator.share) {
      navigator.share({ title: `앤마들린 채용 · ${jobTitle}`, url: location.href }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(location.href)
        .then(() => alert("페이지 링크가 복사됐어요. 카카오톡에 붙여넣어 공유해 주세요."))
        .catch(() => alert(`링크: ${location.href}`));
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[860px] gap-2.5">
          <button
            type="button"
            onClick={shareKakao}
            className="flex flex-none items-center justify-center gap-1.5 rounded-xl px-[18px] py-3.5 text-[14.5px] font-extrabold"
            style={{ background: "var(--kakao-yellow)", color: "var(--kakao-brown)" }}
          >
            <i className="ph-fill ph-chat-circle text-[18px]" /> 카카오톡 공유
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(250,60,100,0.3)]"
            style={{ background: "var(--brand-gradient)" }}
          >
            이력서 없이 3분 이내 지원하기 <i className="ph-bold ph-arrow-right" />
          </button>
        </div>
      </div>

      {open && <CareersApplyModal jobTitle={jobTitle} onClose={() => setOpen(false)} />}
    </>
  );
}
