"use client";

export default function CareersApplyModal({
  jobTitle,
  onClose,
}: {
  jobTitle: string;
  onClose: () => void;
}) {
  function shareKakao() {
    if (navigator.share) {
      navigator.share({ title: `Glovv 채용 · ${jobTitle}`, url: location.href }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(location.href)
        .then(() => alert("페이지 링크가 복사됐어요. 카카오톡에 붙여넣어 공유해 주세요."))
        .catch(() => alert(`링크: ${location.href}`));
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[84vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.3)]"
      >
        <div className="flex flex-none items-center gap-2.5 border-b border-gray-200 px-5 py-4">
          <span className="text-[15px] font-extrabold">{jobTitle} 지원</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex items-center justify-center border-0 bg-transparent text-[22px] text-gray-400"
          >
            <i className="ph ph-x" />
          </button>
          <button
            type="button"
            onClick={shareKakao}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ background: "var(--kakao-yellow)", color: "var(--kakao-brown)" }}
          >
            <i className="ph-fill ph-chat-circle" /> 공유
          </button>
        </div>
        <iframe
          src="https://tally.so/embed/RGzKbK?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
          className="w-full flex-1 border-0"
          title="지원 폼"
          loading="lazy"
        />
      </div>
    </div>
  );
}
