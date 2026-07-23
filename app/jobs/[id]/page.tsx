import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import BrandThumb from "@/components/BrandThumb";
import { getBrands, getJobs } from "@/lib/data";

const SITE_URL = "https://beauty-recruit.vercel.app";

function guessEmploymentType(careerLevel: string): string {
  if (/인턴/.test(careerLevel)) return "INTERN";
  if (/(계약직|프리랜서)/.test(careerLevel)) return "CONTRACTOR";
  return "FULL_TIME";
}

function buildJobDescription(
  job: {
    title: string;
    jobCategory: string;
    region: string;
    description?: string | null;
    responsibilitiesSummary?: string | null;
  },
  brandName: string
) {
  if (job.description) {
    return `${brandName} ${job.title} 채용 공고. ${job.description}`;
  }
  if (job.responsibilitiesSummary) {
    return `${brandName} ${job.title} 채용 공고. ${job.responsibilitiesSummary}`;
  }
  return `${brandName}에서 ${job.jobCategory} 직무 ${job.title}을(를) 채용합니다. 근무지: ${job.region}. 자세한 내용은 원문 공고에서 확인해 주세요.`;
}

export async function generateMetadata(props: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [brands, jobs] = await Promise.all([getBrands(), getJobs()]);
  const job = jobs.find((j) => j.id === id);
  const brand = job && brands.find((b) => b.id === job.brandId);
  if (!job || !brand) return {};
  const description = buildJobDescription(job, brand.name).slice(0, 200);
  return {
    title: `${job.title} | ${brand.name}`,
    description,
    alternates: { canonical: `/jobs/${id}` },
    openGraph: { title: `${job.title} | ${brand.name}`, description },
  };
}

export default async function JobDetailPage(props: PageProps<"/jobs/[id]">) {
  const { id } = await props.params;
  const [brands, jobs] = await Promise.all([getBrands(), getJobs()]);

  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();

  const brand = brands.find((b) => b.id === job.brandId);
  if (!brand) notFound();

  const brandOpenJobs = jobs.filter((j) => j.brandId === brand.id && j.id !== job.id);

  const jobPostingJsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: buildJobDescription(job, brand.name),
    datePosted: job.createdAt,
    employmentType: guessEmploymentType(job.careerLevel || ""),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "beauty-recruit",
      value: job.id,
    },
    hiringOrganization: { "@type": "Organization", name: brand.name },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.region || "서울", addressCountry: "KR" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${SITE_URL}/about` },
      { "@type": "ListItem", position: 2, name: "브랜드 공고", item: `${SITE_URL}/brand-jobs` },
      { "@type": "ListItem", position: 3, name: job.title, item: `${SITE_URL}/jobs/${job.id}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <span id="__brand_marker" data-brand-id={brand.id} hidden />
      <SiteNav />

      <main className="mx-auto max-w-[860px] px-5 pb-[90px] pt-6">
        <Link
          href="/brand-jobs"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-500 no-underline"
        >
          <i className="ph-bold ph-arrow-left" /> 브랜드 공고 목록
        </Link>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr] sm:items-start">
          <BrandThumb
            name={brand.name}
            className="aspect-square w-full rounded-2xl border border-gray-200"
            textClassName="text-3xl"
          />
          <div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span
                className="rounded-lg px-2.5 py-1 text-xs font-bold"
                style={{
                  background: "linear-gradient(120deg, rgba(250,112,53,.14), rgba(255,0,153,.14))",
                  color: "#b81f6c",
                }}
              >
                {brand.name}
              </span>
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                {job.jobCategory}
              </span>
              <span className="rounded-lg px-2.5 py-1 text-xs font-bold text-[color:var(--success)]"
                style={{ background: "rgba(18,161,80,.1)" }}
              >
                {job.status === "open" ? "진행 중" : "마감"}
              </span>
            </div>
            <h1 className="mb-4 text-2xl font-extrabold leading-snug tracking-tight">
              {job.title}
            </h1>

            <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl border border-gray-200 bg-white p-[18px]">
              <div>
                <div className="mb-1 text-[11px] font-bold text-gray-400">경력</div>
                <div className="text-sm font-bold">{job.careerLevel}</div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold text-gray-400">지역</div>
                <div className="text-sm font-bold">{job.region}</div>
              </div>
              {job.compensationSummary && (
                <div className="col-span-2">
                  <div className="mb-1 text-[11px] font-bold text-gray-400">연봉 및 혜택</div>
                  <div className="text-sm font-bold">{job.compensationSummary}</div>
                </div>
              )}
            </div>

            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-[10px] bg-gray-900 py-3.5 text-[14.5px] font-bold text-white no-underline"
            >
              원문에서 지원하기 <i className="ph-bold ph-arrow-up-right" />
            </a>
          </div>
        </div>

        <section className="mt-9 grid gap-5">
          {job.description && (
            <div className="card-shadow rounded-2xl border border-gray-200 bg-white px-6 py-[22px]">
              <h2 className="mb-3.5 text-base font-extrabold tracking-tight">상세 내용</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {job.description}
              </p>
            </div>
          )}
          {!job.description && job.responsibilitiesSummary && (
            <div className="card-shadow rounded-2xl border border-gray-200 bg-white px-6 py-[22px]">
              <h2 className="mb-3.5 text-base font-extrabold tracking-tight">주요 업무</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                {job.responsibilitiesSummary}
              </p>
            </div>
          )}
          {!job.description && job.requirementsSummary && (
            <div className="card-shadow rounded-2xl border border-gray-200 bg-white px-6 py-[22px]">
              <h2 className="mb-3.5 text-base font-extrabold tracking-tight">요구 경력</h2>
              <p className="text-sm leading-relaxed text-gray-700">{job.requirementsSummary}</p>
            </div>
          )}
          {job.descriptionImages && job.descriptionImages.length > 0 && (
            <div className="card-shadow overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {job.descriptionImages.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- 크롤링 출처 도메인이 제각각이라 next/image 허용목록 대신 일반 img 사용
                <img key={src} src={src} alt={`${job.title} 상세 이미지 ${i + 1}`} className="block w-full" />
              ))}
            </div>
          )}
          {!job.description &&
            !job.responsibilitiesSummary &&
            !job.requirementsSummary &&
            (!job.descriptionImages || job.descriptionImages.length === 0) && (
              <div className="card-shadow rounded-2xl border border-gray-200 bg-white px-6 py-[22px] text-center">
                <p className="mb-3 text-sm text-gray-500">
                  상세 업무·자격 요건은 원문 공고에서 확인해 주세요.
                </p>
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-700 no-underline"
                >
                  원문 공고 보기 <i className="ph-bold ph-arrow-up-right" />
                </a>
              </div>
            )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3.5 text-lg font-extrabold tracking-tight">브랜드 프로필</h2>
          <div className="card-shadow rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3.5">
              <BrandThumb
                name={brand.name}
                className="h-[52px] w-[52px] flex-none rounded-[14px]"
                textClassName="text-lg"
                initialOnly
              />
              <div>
                <div className="text-[17px] font-extrabold">{brand.name}</div>
              </div>
            </div>

            {brand.profileReviewed && brand.profileAi ? (
              <div
                className="mb-4 flex items-start gap-2.5 rounded-xl border p-3.5"
                style={{
                  background:
                    "linear-gradient(120deg, rgba(250,112,53,.08), rgba(255,0,153,.08))",
                  borderColor: "rgba(255,0,153,.14)",
                }}
              >
                <i className="ph-fill ph-sparkle mt-0.5 text-[18px] text-[color:var(--brand-pink)]" />
                <div>
                  <div className="mb-0.5 text-[11px] font-extrabold tracking-[0.06em] text-[#b81f6c]">
                    AI 브랜드 매력도
                  </div>
                  <div className="text-sm font-bold leading-relaxed">{brand.profileAi}</div>
                </div>
              </div>
            ) : null}

            {brandOpenJobs.length > 0 && (
              <>
                <div className="mb-2.5 text-xs font-extrabold text-gray-400">
                  {brand.name}의 열린 공고 {brandOpenJobs.length}
                </div>
                <div className="grid gap-2.5">
                  {brandOpenJobs.map((rj) => (
                    <Link
                      key={rj.id}
                      href={`/jobs/${rj.id}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-3 text-inherit no-underline hover:bg-gray-50"
                    >
                      <span className="flex-none rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                        {rj.jobCategory}
                      </span>
                      <span className="flex-1 text-sm font-bold">{rj.title}</span>
                      <span className="text-[12.5px] text-gray-400">{rj.careerLevel}</span>
                      <i className="ph-bold ph-caret-right text-gray-300" />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
