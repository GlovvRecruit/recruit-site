import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import JobCard from "@/components/JobCard";
import { getBrands, getJobs } from "@/lib/data";

export const metadata: Metadata = {
  title: "인턴 종료 후 지원하기 좋은 공고",
  description: "뷰티 인턴 경험 이후 지원하기 좋은 신입·주니어 뷰티 브랜드 채용 공고를 모았습니다.",
  alternates: { canonical: "/brand-jobs/for-interns" },
};

function isEntryFriendly(careerLevel: string): boolean {
  if (["신입", "인턴", "경력 무관"].includes(careerLevel)) return true;
  const match = careerLevel.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) <= 2 : false;
}

export default async function ForInternsPage() {
  const [brands, jobs] = await Promise.all([getBrands(), getJobs()]);
  const brandById = new Map(brands.map((b) => [b.id, b]));

  const entryJobs = jobs.filter(
    (j) => j.jobCategory !== "기타" && isEntryFriendly(j.careerLevel)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="mx-auto max-w-[1120px] px-5 pb-[90px] pt-8">
        <Link
          href="/brand-jobs"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-500 no-underline"
        >
          <i className="ph-bold ph-arrow-left" /> 브랜드 공고 목록
        </Link>

        <p className="m-0 text-xs font-extrabold tracking-[0.18em] text-[color:var(--brand-pink)]">
          NEXT STEP
        </p>
        <h1 className="mb-2 mt-2.5 max-w-[660px] text-[32px] font-extrabold leading-[1.22] tracking-tight">
          인턴 종료 후 지원하기 좋은 공고
        </h1>
        <p className="mb-7 max-w-[560px] text-[15px] text-gray-500">
          뷰티 인턴 경험을 살리기 좋은 신입·경력 무관·2년차 이하 공고를 모아봤어요.
        </p>

        {entryJobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            지금은 조건에 맞는 공고가 없어요. 나중에 다시 확인해 주세요.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
            {entryJobs.map((job) => {
              const brand = brandById.get(job.brandId);
              if (!brand) return null;
              return <JobCard key={job.id} job={job} brand={brand} />;
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
