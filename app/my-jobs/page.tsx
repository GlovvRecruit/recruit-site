import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import MyJobsView from "@/components/MyJobsView";
import { getBrands, getJobsSummary } from "@/lib/data";

// 개인별 관심 공고 화면이라 검색 노출은 필요 없다(카톡 알림에서만 들어온다).
export const metadata: Metadata = {
  title: { absolute: "내 관심 공고 | 앤마들린 채용" },
  description: "등록한 관심 브랜드·직무의 열린 채용 공고를 한 번에 확인하세요.",
  robots: { index: false, follow: false },
};

export default async function MyJobsPage() {
  const [brands, jobs] = await Promise.all([getBrands(), getJobsSummary()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="mx-auto max-w-[1120px] px-5 pb-[90px] pt-8">
        <p className="m-0 text-xs font-extrabold tracking-[0.18em] text-[color:var(--brand-pink)]">
          MY JOBS
        </p>
        <h1 className="mb-3 mt-2.5 text-[32px] font-extrabold leading-[1.25] tracking-tight">
          내 관심 공고
        </h1>
        <p className="mb-7 max-w-[560px] text-[15px] text-gray-500">
          등록해 둔 관심 브랜드·직무의 지금 열린 공고예요. 최신순과 마감 임박순으로 볼 수 있어요.
        </p>

        <MyJobsView brands={brands} jobs={jobs} />
      </main>

      <Footer />
    </div>
  );
}
