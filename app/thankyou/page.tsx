import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";

/**
 * 지원 완료 페이지.
 *
 * Tally 지원서를 제출하면 이 URL로 리디렉트되고, **Meta 픽셀이 이 페이지의 PageView를
 * complete_registration 전환으로 집계**한다(Events Manager의 URL 규칙). 따라서
 * 경로(/thankyou)를 바꾸면 광고 전환 집계가 끊긴다 — 변경 시 Events Manager도 함께 고쳐야 한다.
 *
 * 전환 집계 지점이라 검색 노출은 막는다(색인되면 지원과 무관한 유입이 전환으로 잡힌다).
 */
export const metadata: Metadata = {
  title: { absolute: "지원 완료 | 앤마들린 채용" },
  description: "지원이 정상적으로 접수됐습니다.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="mx-auto flex max-w-[560px] flex-col items-center px-5 pb-[90px] pt-[72px] text-center">
        <div
          className="mb-6 grid h-[72px] w-[72px] place-items-center rounded-full text-[34px] text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <i className="ph-bold ph-check" />
        </div>

        <h1 className="m-0 text-[30px] font-extrabold leading-[1.3] tracking-tight">
          지원해주셔서
          <br />
          감사합니다!
        </h1>
        <p className="mb-8 mt-3 text-[15px] leading-relaxed text-gray-500">
          검토 후 빠르게 연락드리겠습니다.
          <br />
          문의 :{" "}
          <a
            href="mailto:youjin@glovv.co.kr"
            className="font-bold text-[color:var(--brand-pink)] no-underline"
          >
            youjin@glovv.co.kr
          </a>
        </p>

        <div className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-6">
          <p className="m-0 text-[14.5px] font-extrabold text-gray-800">
            결과를 기다리는 동안, 다른 뷰티 브랜드 공고도 받아보세요
          </p>
          <p className="mx-auto mb-5 mt-2 max-w-[400px] text-[13px] leading-relaxed text-gray-500">
            관심 브랜드·직무를 등록하면 신규 채용 공고를 매주 월·목 카톡으로 보내드려요.
          </p>
          <Link
            href="/brand-jobs"
            className="inline-flex items-center gap-1.5 rounded-xl px-5 py-3 text-[14.5px] font-extrabold text-white no-underline"
            style={{ background: "var(--brand-gradient)" }}
          >
            신규 공고 카톡으로 받기 <i className="ph-bold ph-arrow-right" />
          </Link>
        </div>

        <Link
          href="/careers"
          className="mt-6 text-[13.5px] font-bold text-gray-500 no-underline"
        >
          <i className="ph-bold ph-arrow-left" /> 채용 공고 다시 보기
        </Link>
      </main>

      <Footer />
    </div>
  );
}
