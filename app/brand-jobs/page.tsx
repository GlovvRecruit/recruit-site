import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import AlertCta from "@/components/AlertCta";
import BrandJobsBrowser from "@/components/BrandJobsBrowser";
import { getBrands, getJobs } from "@/lib/data";

export const metadata: Metadata = {
  title: "메이저 뷰티 브랜드 채용 공고 | 뷰티 취업 정보",
  description:
    "메이저 뷰티 브랜드의 채용·취업 공고를 한 곳에서 확인하세요. 관심 브랜드·직무를 등록하면 신규 뷰티 채용 공고를 매주 카톡으로 받아볼 수 있어요.",
  alternates: { canonical: "/brand-jobs" },
};

export default async function BrandJobsPage() {
  const [brands, jobs] = await Promise.all([getBrands(), getJobs()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="mx-auto max-w-[1120px] px-5 pb-[90px] pt-8">
        <p className="m-0 text-xs font-extrabold tracking-[0.18em] text-[color:var(--brand-pink)]">
          BEAUTY BRANDS
        </p>
        <h1 className="mb-3 mt-2.5 max-w-[660px] text-[38px] font-extrabold leading-[1.22] tracking-tight">
          이제 관심 기업의 신규 채용 공고를 매주{" "}
          <span className="brand-gradient-text whitespace-nowrap">카톡으로</span> 받아보세요
        </h1>
        <p className="mb-7 max-w-[560px] text-[15px] text-gray-500">
          관심 기업·직무만 골라두면 신규 공고를 매주 카톡으로 안내드려요. 지금 열린 공고는
          언제든 아래에서 바로 확인할 수 있어요.
        </p>

        <AlertCta />

        <BrandJobsBrowser brands={brands} jobs={jobs} />

        <p className="mt-[34px] border-t border-dashed border-gray-200 pt-4 text-[12.5px] leading-relaxed text-gray-400">
          대부분의 메이저 뷰티 브랜드가 이용하는 <b className="text-gray-600">글로브</b>에서 뷰티
          (예비) 실무자들과 뷰티 브랜드의 성장을 위해 제공합니다. 지원은 각 브랜드 채용 홈페이지에서
          진행됩니다.
        </p>
      </main>

      <Footer />
    </div>
  );
}
