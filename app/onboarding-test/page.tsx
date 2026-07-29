import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import TestAlertFlow from "@/components/test/TestAlertFlow";
import { getBrands, getJobsSummary } from "@/lib/data";

export default async function OnboardingTestPage() {
  const [brands, jobs] = await Promise.all([getBrands(), getJobsSummary()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <div className="border-b border-dashed border-amber-400 bg-amber-50 px-5 py-2.5 text-center text-[13px] font-bold text-amber-800">
        🧪 TEST PAGE — /brand-jobs를 그대로 복제해 알림 신청 카드만 재설계 시안으로 바꾼
        페이지입니다. 실제 서비스에는 반영되지 않았고 검색엔진에도 노출되지 않아요.
      </div>

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

        <TestAlertFlow brands={brands} jobs={jobs} />

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
