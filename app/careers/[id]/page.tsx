import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import BrandThumb from "@/components/BrandThumb";
import CareersDetailActions from "@/components/CareersDetailActions";
import { getBrands, getCareersJobs, getJobs } from "@/lib/data";
import type { CareersJob } from "@/lib/types";

const VALUE_ICONS = ["ph-fill ph-sparkle", "ph-fill ph-chart-bar", "ph-fill ph-rocket-launch"];

// 글로브 인턴 채용(https://glovvrecruit.github.io/intern/) 공식 문구 기준 — admin에 아직
// 혜택 상세를 입력하지 않은 인턴 공고를 위한 폴백.
const INTERN_VALUES_FALLBACK = [
  {
    title: "뷰티 업계에서 인정받는 실력",
    desc: "2,000개+ 뷰티 브랜드 마케터, 4,000명+ 인플루언서와 긴밀하게 협업하며 실력을 쌓습니다.",
  },
  {
    title: "데이터 기반 콘텐츠 인사이트",
    desc: "3만개+ 릴스 콘텐츠를 분석하며 어떤 상황에 어떤 콘텐츠가 효과적인지 체득합니다.",
  },
  {
    title: "성장하는 기업에서 키우는 문제 해결력",
    desc: "출시 1년만에 연매출 100억원을 달성한 기업에서 전략·운영을 경험하며 문제 해결력을 기릅니다.",
  },
];

const DEFAULT_VALUES_FALLBACK = [
  {
    title: "빠른 성장",
    desc: "2,000+ 브랜드·4,000+ 인플루언서 협업 데이터를 직접 다루며 뷰티 산업 전체를 배웁니다.",
  },
  {
    title: "진짜 실무",
    desc: "보조 업무가 아닌, 브랜드 담당자와 직접 소통하는 오너십 있는 프로젝트를 맡습니다.",
  },
  {
    title: "AI 최전선",
    desc: "1분 만에 끝내는 뷰티 AI 온보딩을 만드는 서비스의 최전선에서 일합니다.",
  },
];

// admin에서 입력한 4개 필드(줄바꿈 구분)가 하나도 없는 옛 공고를 위한 폴백.
const DEFAULT_SECTIONS = [
  {
    title: "이런 일을 해요",
    items: [
      "뷰티 브랜드 채용 공고 진행 및 인플루언서 매칭 지원",
      "릴스 콘텐츠 데이터 정리·분석 및 인사이트 도출",
      "브랜드 담당자와 커뮤니케이션 및 일정 관리",
      "신규 서비스 기능에 대한 사용자 피드백 수집",
    ],
  },
  {
    title: "이런 분을 찾아요",
    items: [
      "뷰티·콘텐츠 산업에 진심인 분",
      "숫자와 데이터로 생각하는 걸 즐기는 분",
      "주도적으로 문제를 정의하고 해결하는 분",
      "빠르게 배우고 실행하는 걸 좋아하는 분",
    ],
  },
  {
    title: "근무 조건",
    items: ["서울 오피스 · 주 5일 근무", "인턴 종료 후 정규직 전환 기회", "성과에 따른 처우 협의"],
  },
];

function splitLines(text?: string | null): string[] {
  return (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseHashtags(text?: string | null): string[] {
  return (text ?? "")
    .split("#")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBenefitItems(text?: string | null): { title: string; desc: string }[] {
  return splitLines(text)
    .map((line) => {
      const idx = line.indexOf(" - ");
      if (idx === -1) return null;
      return { title: line.slice(0, idx).trim(), desc: line.slice(idx + 3).trim() };
    })
    .filter((v): v is { title: string; desc: string } => !!v && !!v.title && !!v.desc);
}

function buildSections(job: CareersJob) {
  const hasCustomSections = !!(
    job.responsibilities ||
    job.requirements ||
    job.niceToHaves ||
    job.benefits
  );
  if (!hasCustomSections) return DEFAULT_SECTIONS;

  return [
    { title: "이런 일을 해요", items: splitLines(job.responsibilities) },
    { title: "이런 분을 찾아요", items: splitLines(job.requirements) },
    { title: "이런 분이면 더 좋아요", items: splitLines(job.niceToHaves) },
    { title: "근무 조건·혜택", items: splitLines(job.benefits) },
  ].filter((s) => s.items.length > 0);
}

// 함께하는 주요 뷰티 브랜드 (glovvrecruit.github.io/intern 로고 그리드 기준)
const PARTNER_BRANDS: { name: string; style?: React.CSSProperties }[] = [
  { name: "AMOREPACIFIC", style: { textTransform: "uppercase", letterSpacing: "0.02em" } },
  { name: "LG생활건강" },
  { name: "MUSINSA BEAUTY", style: { textTransform: "uppercase" } },
  { name: "Banila co", style: { fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 400 } },
  { name: "VT Cosmetics", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "LANEIGE", style: { textTransform: "uppercase", letterSpacing: "0.08em" } },
  { name: "마녀공장" },
  { name: "goodal", style: { letterSpacing: "0.02em" } },
  { name: "MEDIHEAL", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "AESTURA", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "Torriden", style: { textTransform: "uppercase", letterSpacing: "0.02em" } },
  { name: "ROUND LAB", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "rom&nd", style: { fontStyle: "italic", letterSpacing: "-0.02em", fontWeight: 800 } },
  { name: "hince", style: { fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.12em" } },
  { name: "PERIPERA", style: { textTransform: "uppercase", letterSpacing: "0.08em" } },
  { name: "CLIO", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "Centellian24", style: { letterSpacing: "0.02em" } },
  { name: "SKIN1004", style: { textTransform: "uppercase", letterSpacing: "0.02em" } },
  { name: "COSRX", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "Age 20's", style: { letterSpacing: "0.02em" } },
  { name: "정샘물" },
  { name: "FWEE", style: { textTransform: "uppercase", letterSpacing: "0.05em" } },
  { name: "무지개맨션" },
  { name: "Huxley", style: { letterSpacing: "0.02em" } },
];

// 인턴 1년 후 직무 적합도 — 마케팅/운영/세일즈/BD·PM/MD 순으로 고정 노출.
// 경력 요건은 제외하고 실제 인턴 수행 업무와 70%↑ 일치하면 "잘 맞아요"로 표시.
const ROLE_FIT = [
  {
    name: "마케팅",
    reqs: [
      { text: "뷰티 트렌드·콘텐츠에 대한 이해", ok: true },
      { text: "SNS·숏폼 콘텐츠 운영 경험", ok: true },
      { text: "마케팅 캠페인 기획·집행 경험", ok: true },
      { text: "논리적 커뮤니케이션 역량 · 기본 역량", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "운영",
    reqs: [
      { text: "데이터 정리·분석 및 리포팅", ok: true },
      { text: "유관부서 협업 경험", ok: true },
      { text: "이커머스 플랫폼 운영 경험", ok: false },
      { text: "논리적 커뮤니케이션 역량 · 기본 역량", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "세일즈",
    reqs: [
      { text: "고객·바이어 커뮤니케이션", ok: true },
      { text: "B2B 영업·제안 경험", ok: false },
      { text: "매출 목표 관리 경험", ok: true },
      { text: "논리적 커뮤니케이션 역량 · 기본 역량", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "BD·PM",
    reqs: [
      { text: "유관부서 협업·일정 관리 경험", ok: true },
      { text: "브랜드·파트너 담당자 커뮤니케이션", ok: false },
      { text: "사업개발·제휴 경험", ok: false },
      { text: "논리적 커뮤니케이션 역량 · 기본 역량", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "MD",
    reqs: [
      { text: "뷰티 트렌드에 대한 높은 이해", ok: true },
      { text: "상품기획·시즌 라인업 구성 경험", ok: false },
      { text: "리오더·재고 관리 경험", ok: false },
      { text: "논리적 커뮤니케이션 역량 · 기본 역량", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
].map((r) => {
  const okCount = r.reqs.filter((q) => q.ok).length;
  const pct = Math.round((okCount / r.reqs.length) * 100);
  return { ...r, pct, fit: pct >= 70 };
});

export default async function CareersDetailPage(props: PageProps<"/careers/[id]">) {
  const { id } = await props.params;
  const jobs = await getCareersJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();

  const isIntern = job.employmentType === "intern";
  const sections = buildSections(job);
  const hashtags = parseHashtags(job.hashtags);
  const benefitTitle = job.benefitTitle?.trim() || "이런 성장을 약속합니다";
  const benefitItems = parseBenefitItems(job.benefitItems);
  const values = benefitItems.length > 0
    ? benefitItems
    : isIntern
      ? INTERN_VALUES_FALLBACK
      : DEFAULT_VALUES_FALLBACK;

  let relatedBrandJobs: { id: string; title: string; jobCategory: string; brandName: string }[] = [];
  if (job.showRelated) {
    const [brandJobs, brands] = await Promise.all([getJobs(), getBrands()]);
    const brandById = new Map(brands.map((b) => [b.id, b]));
    relatedBrandJobs = brandJobs.slice(0, 4).map((bj) => ({
      id: bj.id,
      title: bj.title,
      jobCategory: bj.jobCategory,
      brandName: brandById.get(bj.brandId)?.name ?? "브랜드",
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <SiteNav />

      <section className="relative overflow-hidden text-white" style={{ background: "#0e0a0c" }}>
        <div
          className="absolute -right-[140px] -top-[120px] h-[420px] w-[420px] rounded-full opacity-50 blur-[30px]"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="relative mx-auto max-w-[860px] px-5 pb-[60px] pt-14">
          <Link
            href="/careers"
            className="mb-8 flex items-center gap-1.5 text-[13px] font-bold text-white/70 no-underline"
          >
            <i className="ph-bold ph-arrow-left" /> 자사 채용
          </Link>
          <span className="mb-[18px] inline-block rounded-full bg-white/[.14] px-3 py-1.5 text-xs font-extrabold tracking-[0.08em]">
            {job.tag} · Glovv/Flixx
          </span>
          <h1 className="mb-3.5 text-[40px] font-extrabold leading-[1.22] tracking-tight">
            {job.title}
          </h1>
          <p className="max-w-[560px] text-[17px] leading-relaxed text-white/80">{job.summary}</p>
          <div className="mt-[26px] flex flex-wrap gap-2">
            {hashtags.length > 0 ? (
              hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[.16] bg-white/10 px-3.5 py-2 text-[13px] font-semibold"
                >
                  #{tag}
                </span>
              ))
            ) : (
              [
                { icon: "ph ph-briefcase", text: job.employment ?? "채용 형태 미정" },
                { icon: "ph ph-buildings", text: job.location ?? "서울" },
                { icon: "ph ph-clock", text: "주 5일 · 상시 모집" },
              ].map((m) => (
                <span
                  key={m.text}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[.16] bg-white/10 px-3.5 py-2 text-[13px] font-semibold"
                >
                  <i className={`${m.icon} opacity-80`} />
                  {m.text}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[860px] px-5 pb-10 pt-[52px]">
        <section>
          <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
            WHY GLOVV
          </p>
          <h2 className="mb-5 text-2xl font-extrabold tracking-tight">{benefitTitle}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {values.map((v, i) => (
              <div key={v.title} className="card-shadow rounded-2xl border border-gray-200 bg-white p-6">
                <span
                  className="mb-3.5 inline-grid h-11 w-11 place-items-center rounded-xl text-[22px] text-[#b81f6c]"
                  style={{ background: "linear-gradient(120deg, rgba(250,112,53,.14), rgba(255,0,153,.14))" }}
                >
                  <i className={VALUE_ICONS[i % VALUE_ICONS.length]} />
                </span>
                <h3 className="mb-1.5 text-[16.5px] font-extrabold">{v.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-gray-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-[52px]">
          <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
            PARTNERS
          </p>
          <h2 className="mb-5 text-2xl font-extrabold tracking-tight">
            이런 브랜드들과 함께 일해요
          </h2>
          <div className="card-shadow rounded-[20px] border border-gray-200 bg-white px-6 py-[34px]">
            <p className="mb-7 text-center text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
              함께하는 주요 뷰티 브랜드
            </p>
            <div className="grid grid-cols-2 place-items-center gap-x-4 gap-y-[28px] sm:grid-cols-4">
              {PARTNER_BRANDS.map((b) => (
                <span
                  key={b.name}
                  className="text-center text-sm font-extrabold leading-tight tracking-tight text-gray-800"
                  style={b.style}
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-[52px] grid gap-5">
          {sections.map((sec, i) => (
            <div
              key={sec.title}
              className="card-shadow rounded-[18px] border border-gray-200 bg-white px-7 py-[26px]"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-gray-900 text-[13px] font-extrabold text-white">
                  {i + 1}
                </span>
                <h3 className="text-lg font-extrabold tracking-tight">{sec.title}</h3>
              </div>
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {sec.items.map((item) => (
                  <li key={item} className="relative pl-[22px] text-[14.5px] leading-relaxed text-gray-700">
                    <i
                      className="ph-bold ph-check absolute left-0 top-0.5"
                      style={{ color: "var(--brand-pink)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {isIntern && (
          <section className="mt-[52px]">
            <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
              AFTER 1 YEAR
            </p>
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight">
              인턴 1년을 마치면, 이런 직무와 잘 맞아요
            </h2>
            <p className="mb-5 max-w-[660px] text-[13.5px] leading-relaxed text-gray-500">
              각 직무 자격 요건 중 <b className="font-bold text-gray-700">경력 요건은 제외</b>하고,
              인턴 1년간 실제 수행 업무와 <b className="font-bold text-gray-700">70% 이상 일치</b>
              하면 잘 맞는 직무로 표시했어요. 논리적 커뮤니케이션·데이터 분석 툴 같은 기본 역량은
              충족으로 간주합니다.
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(258px,1fr))] gap-4">
              {ROLE_FIT.map((r) => (
                <div
                  key={r.name}
                  className="rounded-2xl border-[1.5px] bg-white p-[22px]"
                  style={{
                    borderColor: r.fit ? "var(--brand-pink)" : "var(--gray-200)",
                    background: r.fit
                      ? "linear-gradient(180deg, rgba(255,0,153,.03), #fff)"
                      : "#fff",
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-2.5">
                    <h3 className="text-lg font-extrabold tracking-tight">{r.name}</h3>
                    <span
                      className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold"
                      style={
                        r.fit
                          ? { background: "var(--brand-gradient)", color: "#fff" }
                          : { background: "var(--gray-100)", color: "var(--gray-500)" }
                      }
                    >
                      {r.fit ? `잘 맞아요 · ${r.pct}%` : `일치 ${r.pct}%`}
                    </span>
                  </div>
                  <ul className="m-0 grid list-none gap-2.5 p-0">
                    {r.reqs.map((q) => (
                      <li key={q.text} className="flex items-start gap-2 text-[13.5px] leading-snug">
                        <i
                          className={q.ok ? "ph-fill ph-check-circle" : "ph ph-x-circle"}
                          style={{
                            color: q.ok ? "var(--success)" : "var(--gray-300)",
                            marginTop: 1,
                            flex: "none",
                          }}
                        />
                        <span className={q.ok ? "text-gray-700" : "text-gray-400"}>{q.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/brand-jobs"
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-[26px] py-3.5 text-[15px] font-bold text-white no-underline"
              >
                인턴 종료 후 취업할 확률이 높은 채용 공고 확인하기{" "}
                <i className="ph-bold ph-arrow-right" />
              </Link>
            </div>
          </section>
        )}

        {relatedBrandJobs.length > 0 && (
          <section className="mt-[52px]">
            <h2 className="mb-4 text-xl font-extrabold tracking-tight">
              이런 브랜드 공고도 확인해보세요
            </h2>
            <div className="grid gap-2.5">
              {relatedBrandJobs.map((rj) => (
                <Link
                  key={rj.id}
                  href={`/jobs/${rj.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-inherit no-underline hover:bg-gray-50"
                >
                  <BrandThumb
                    name={rj.brandName}
                    className="h-9 w-9 flex-none rounded-lg"
                    textClassName="text-sm"
                    initialOnly
                  />
                  <span className="flex-none rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                    {rj.jobCategory}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{rj.title}</span>
                  <i className="ph-bold ph-caret-right text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section
          className="mt-[52px] rounded-[24px] p-12 text-center text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <h2 className="mb-2.5 text-[28px] font-extrabold tracking-tight">
            이력서 없이도 3분 이내 지원 가능
          </h2>
          <p className="mb-1 text-[15px] leading-relaxed opacity-90">
            간단한 정보만 남기면 됩니다. 적합한 마감이면 지금 지원해 주세요.
          </p>
          <p className="mt-5 text-[12.5px] opacity-80">
            문의: youjin@glovv.co.kr · 직무·경력 무관 상시
          </p>
        </section>
      </main>

      <Footer />

      <CareersDetailActions jobTitle={job.title} />
    </div>
  );
}
