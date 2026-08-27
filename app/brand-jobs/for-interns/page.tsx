import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import BrandJobsBrowser from "@/components/BrandJobsBrowser";
import { getBrands, getJobsSummary } from "@/lib/data";
import { isGlovvBrandName } from "@/lib/glovv-brands";
import type { Brand, JobCategory } from "@/lib/types";

// 이 페이지는 뷰티 실무 직무만 다룬다 — "기타"(개발·인사·재무 등)는 필터에서도 아예 빼고
// 목록에서도 제외한다.
const INTERN_PAGE_CATEGORIES: readonly JobCategory[] = ["마케팅", "MD", "BM·PM", "운영", "세일즈"];

export const metadata: Metadata = {
  title: "인턴 종료 후 지원하기 좋은 글로브 이용 브랜드 공고",
  description:
    "글로브를 이용하는 뷰티 브랜드 중, 인턴 경험 이후 지원하기 좋은 신입·경력 무관·2년차 이하 채용 공고를 모았습니다.",
  alternates: { canonical: "/brand-jobs/for-interns" },
};

function isGlovvBrand(brand: Brand): boolean {
  return isGlovvBrandName([brand.name, ...(brand.brandNames ?? [])]);
}

/**
 * 인턴을 막 마친 사람이 지원할 수 있는 공고인지. 신입·인턴·경력 무관, 또는 **요구 경력의 하한이
 * 1년 이하**인 공고("1년차 이상", "1~3년차")까지만 넣는다 — 하한을 2년까지 넓히면
 * "2~10년차" 같은 경력직 공고가 34건 섞여 들어와 인턴 대상 페이지의 취지와 맞지 않았다
 * (2026-07-30 결정). 숫자가 없는 "경력직"·"경력"은 판단 근거가 없어 제외한다.
 */
const MAX_ENTRY_YEARS = 1;

function isEntryFriendly(careerLevel: string | null | undefined): boolean {
  // 크롤링 원본이 경력 정보를 안 주는 공고가 있어 null이 들어온다(실제로 500 오류가 났다).
  if (!careerLevel) return false;
  // "인턴" 공고는 제외한다 — 이 페이지는 **인턴을 마친 뒤** 지원할 곳을 모으는 곳이다.
  if (careerLevel === "인턴") return false;
  if (["신입", "경력 무관"].includes(careerLevel)) return true;
  const match = careerLevel.match(/(\d+)/); // 첫 숫자 = 요구 경력의 하한
  return match ? parseInt(match[1], 10) <= MAX_ENTRY_YEARS : false;
}

export default async function ForInternsPage() {
  const [brands, jobs] = await Promise.all([getBrands(), getJobsSummary()]);
  const glovvBrands = brands.filter(isGlovvBrand);
  const glovvBrandIds = new Set(glovvBrands.map((b) => b.id));

  const entryJobs = jobs.filter(
    (j) =>
      j.jobCategory !== "기타" &&
      isEntryFriendly(j.careerLevel) &&
      // 경력 표기가 "신입"이어도 제목이 인턴 채용인 공고가 있다(셀리맥스 인턴 등).
      // 이 페이지는 인턴을 마친 뒤 지원할 곳이므로 제목으로도 걸러낸다.
      !/인턴|체험형|intern/i.test(j.title) &&
      glovvBrandIds.has(j.brandId)
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
        <h1 className="mb-2 mt-2.5 max-w-[720px] text-[32px] font-extrabold leading-[1.22] tracking-tight">
          인턴 종료 후 지원하기 좋은{" "}
          <span className="brand-gradient-text">글로브 이용 브랜드 공고</span>
        </h1>
        <p className="mb-7 max-w-[600px] text-[15px] leading-relaxed text-gray-500">
          글로브/플릭스 뷰티 전환형 인턴 경험을 살리기 좋은 신입·경력 무관·2년차 이하 공고를 모아봤어요.
          <br />
          <b className="text-gray-700">
            글로브/플릭스 대표가 직접 추천서를 작성해 해당 브랜드에 전달해요.
          </b>
        </p>

        {entryJobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            지금은 조건에 맞는 공고가 없어요. 나중에 다시 확인해 주세요.
          </p>
        ) : (
          <BrandJobsBrowser
            brands={glovvBrands}
            jobs={entryJobs}
            heading="신입·1년차 공고"
            categoryOptions={INTERN_PAGE_CATEGORIES}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
