import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import CareersDetailActions from "@/components/CareersDetailActions";
import ApplyCtaButton from "@/components/ApplyCtaButton";
import { getCareersJobs } from "@/lib/data";
import type { CareersJob } from "@/lib/types";

export async function generateMetadata(
  props: PageProps<"/careers/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const jobs = await getCareersJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) return {};
  return {
    title: job.title,
    description: job.summary,
    alternates: { canonical: `/careers/${id}` },
    openGraph: { title: job.title, description: job.summary },
  };
}

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

type JobStep = { label: string; note?: string };
type JobSection = {
  title: string;
  items: string[];
  note?: string[];
  flow?: JobStep[];
  /** 데스크톱에서 이 순번 앞에서 줄을 바꾼다(모바일은 폭에 맞춰 자연스럽게 접힘). */
  flowBreakAt?: number;
};

// 인턴 채용 절차. /careers 의 INTERN_STEPS 와 목적이 달라(여기는 지원자가 공고에서 바로 보는
// 상세 흐름) 별도로 둔다 — 절차가 바뀌면 두 곳을 함께 고칠 것.
const INTERN_HIRING_FLOW: JobStep[] = [
  { label: "지원" },
  { label: "서류 평가", note: "영업일 기준 하루 이내 안내" },
  { label: "오프라인 면접", note: "서울특별시 용산구 보광로60길 3 이화빌딩 2층" },
  { label: "1차 합격" },
  { label: "일주일 테스팅", note: "유급" },
  { label: "최종 합격" },
];

/**
 * 안내 문구 속 `__강조__` 구간에 노란 밑줄을 긋는다. 빨간 배경 위에서 한 문장만
 * 도드라지게 하려는 것이라 색이 아니라 밑줄로 표시한다.
 */
function renderUnderline(text: string) {
  return text.split("__").map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        className="font-extrabold"
        style={{
          textDecorationLine: "underline",
          textDecorationColor: "var(--highlight-yellow)",
          textDecorationThickness: "3px",
          textUnderlineOffset: "4px",
        }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

/**
 * 체크리스트 항목 속 `**강조**` 구간을 글로브 그라데이션 텍스트로 렌더한다.
 * admin에서 문구만 고쳐도 강조를 줄 수 있도록 마크다운식 표기를 쓴다.
 */
function renderEmphasis(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="brand-gradient-text font-extrabold">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function buildSections(job: CareersJob): JobSection[] {
  const hasCustomSections = !!(
    job.responsibilities ||
    job.requirements ||
    job.niceToHaves ||
    job.benefits
  );
  if (!hasCustomSections) return DEFAULT_SECTIONS;

  // 근무 조건·혜택을 **맨 앞**에 둔다(2026-08-21 결정). 시급·근무지·정규직 전환 정보를
  // 네 번째가 아니라 첫 번째로 올려, 스크롤이 얕은 모바일 유입자도 조건을 보게 하는 것이 목적이다.
  // 급여는 히어로에서 단독 강조하지 않고 이 섹션 안에서 다른 혜택과 함께 읽히게 한다.
  return [
    { title: "근무 조건·혜택", items: splitLines(job.benefits) },
    {
      title: "이런 일을 해요",
      items: splitLines(job.responsibilities),
      // 인턴은 초기에 운영 업무 비중이 크다. 마케팅 업무를 기대하고 지원했다가 어긋나는 일을
      // 줄이려고 지원 전에 미리 알린다(2026-08-27 요청).
      note:
        job.employmentType === "intern"
          ? [
              "인턴 포지션인만큼 바로 퍼포먼스를 내는 업무에 투입되진 않아요.",
              "증명할수록 커리어 성장에 필요한 업무를 많이 맡게돼요.",
              "또한, 초기 3개월은 운영 업무 위주로 진행돼요.",
              "__마케팅 업무를 바로 맡고 싶다면 Fit이 맞지 않을 수 있어요.__",
            ]
          : undefined,
    },
    { title: "이런 분을 찾아요", items: splitLines(job.requirements) },
    { title: "이런 분이면 더 좋아요", items: splitLines(job.niceToHaves) },
    {
      title: "채용 프로세스는 다음과 같아요",
      items: [],
      flow: job.employmentType === "intern" ? INTERN_HIRING_FLOW : undefined,
      // 6단계가 한 줄에 안 들어가 "최종 합격"만 다음 줄로 떨어지고 화살표가 허공에 남았다.
      // 4단계 + 2단계로 끊어 두 줄이 고르게 보이도록 한다.
      flowBreakAt: 4,
    },
  ].filter((s) => s.items.length > 0 || (s.flow?.length ?? 0) > 0);
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

// 커리어 전환을 준비하는 지원자에게 보내는 환영 문구(인턴 공고에만 노출).
const CAREER_SWITCH_WELCOME = [
  "자신의 꿈을 향해 열심히 달렸던 분",
  "이제는 다른 도전을 하고 싶은 분",
  "팀의 목표를 개인의 목표보다 우선시하는 분",
  "그러면서도 성장에 욕심있고 꾸준히 자기계발 하는 분",
];

// 인턴 1년 후 직무 적합도 — 세일즈/운영/마케팅/BM·PM/MD 순으로 고정 노출.
// 경력 요건은 제외하고 실제 인턴 수행 업무와 70%↑ 일치하면 "잘 맞아요"로 표시.
// pct 를 생략하면 체크 비율로 계산한다.
type RoleFitSource = { name: string; pct?: number; reqs: { text: string; ok: boolean }[] };

const ROLE_FIT = ([
  {
    name: "세일즈",
    reqs: [
      { text: "고객·바이어 커뮤니케이션", ok: true },
      { text: "B2B 영업·제안 경험", ok: true },
      { text: "매출 목표 관리 경험", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "운영",
    reqs: [
      { text: "데이터 정리·분석 및 리포팅", ok: true },
      { text: "유관부서 협업 경험", ok: true },
      { text: "이커머스 플랫폼 운영 경험", ok: false },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "마케팅",
    // 체크 4/5 = 80%지만 실제 인턴 업무 범위를 반영해 70%로 표기한다(2026-08-27 요청).
    pct: 70,
    reqs: [
      { text: "뷰티 트렌드·콘텐츠에 대한 이해", ok: true },
      { text: "SNS·숏폼 콘텐츠 운영 경험", ok: false },
      { text: "인플루언서 마케팅·시딩 협업 경험", ok: true },
      { text: "캠페인 운영 경험", ok: true },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "BM·PM",
    reqs: [
      { text: "유관부서 협업·일정 관리 경험", ok: true },
      { text: "브랜드·파트너 담당자 커뮤니케이션", ok: true },
      { text: "상품 기획 경험", ok: false },
      { text: "사업개발·제휴 경험", ok: false },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
  {
    name: "MD",
    reqs: [
      { text: "뷰티 트렌드에 대한 높은 이해", ok: true },
      { text: "판매 데이터 기반 트렌드 분석 경험", ok: true },
      { text: "리오더·재고 관리 경험", ok: false },
      { text: "데이터 분석 툴 활용 · 기본 역량", ok: true },
    ],
  },
]).map((r: RoleFitSource) => {
  const okCount = r.reqs.filter((q) => q.ok).length;
  // pct 를 직접 적어둔 직무는 그 값을 쓰고, 없으면 체크 비율로 계산한다.
  const pct = r.pct ?? Math.round((okCount / r.reqs.length) * 100);
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

  const jobPostingJsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.summary,
    datePosted: job.createdAt,
    employmentType: isIntern ? "INTERN" : "FULL_TIME",
    identifier: {
      "@type": "PropertyValue",
      propertyID: "beauty-recruit",
      value: job.id,
    },
    hiringOrganization: {
      "@type": "Organization",
      name: "앤마들린 주식회사",
      sameAs: "https://beauty-recruit.vercel.app/about",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location || "서울",
        addressCountry: "KR",
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: "https://beauty-recruit.vercel.app/about" },
      { "@type": "ListItem", position: 2, name: "자사 채용", item: "https://beauty-recruit.vercel.app/careers" },
      {
        "@type": "ListItem",
        position: 3,
        name: job.title,
        item: `https://beauty-recruit.vercel.app/careers/${job.id}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
          <p className="max-w-[560px] whitespace-pre-line text-[17px] leading-relaxed text-white/80">
            {job.summary}
          </p>
          {hashtags.length > 0 && (
            <div className="mt-[26px] flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[.16] bg-white/10 px-3.5 py-2 text-[13px] font-semibold"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[860px] px-5 pb-10 pt-[52px]">
        {isIntern && (
          <section className="mb-[52px]">
            <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
              WELCOME
            </p>
            <h2 className="mb-5 text-2xl font-extrabold tracking-tight">
              <span className="brand-gradient-text">커리어 전환 희망자</span> 환영
            </h2>
            <div
              className="card-shadow rounded-2xl border p-7"
              style={{
                background: "linear-gradient(120deg, rgba(250,112,53,.05), rgba(255,0,153,.05))",
                borderColor: "rgba(255,0,153,.16)",
              }}
            >
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {CAREER_SWITCH_WELCOME.map((line) => (
                  <li
                    key={line}
                    className="relative pl-[22px] text-[14.5px] leading-relaxed text-gray-700"
                  >
                    <i
                      className="ph-bold ph-check absolute left-0 top-0.5"
                      style={{ color: "var(--brand-pink)" }}
                    />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-4 mb-0 text-[14.5px] font-extrabold text-gray-900">을 환영합니다.</p>
            </div>
          </section>
        )}

        <section>
          <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
            WHY GLOVV/FLIXX
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
            <p className="mt-6 text-center text-xs font-bold text-gray-400">
              ... 등 2,000개+
            </p>
          </div>

          {/* PARTNERS 아래 얇은 CTA 바. 하단 그라디언트 CTA를 복제하면 페이지가 끝난 것처럼
              보여 스크롤이 멈추므로, 높이를 낮추고 아웃라인 톤으로 위계를 낮춘다(2026-08-21). */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-gray-200 bg-white px-5 py-3.5">
            <p className="m-0 text-[14px] font-bold text-gray-700">
              지금 보신 브랜드들과 함께 일하게 됩니다
            </p>
            <ApplyCtaButton
              jobTitle={job.title}
              className="inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-[10px] border-0 px-4 py-2 text-[13.5px] font-extrabold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              이력서 없이도 3분 이내 지원하기 <i className="ph-bold ph-arrow-right" />
            </ApplyCtaButton>
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
              {sec.flow && (
                <div className="flex flex-wrap items-stretch gap-x-2 gap-y-2.5">
                  {sec.flow.map((step, idx) => (
                    <Fragment key={step.label}>
                      {idx === sec.flowBreakAt && <div className="hidden w-full md:block" />}
                      {idx > 0 && (
                        <i className="ph-bold ph-caret-right self-center text-[13px] text-gray-300" />
                      )}
                      <div className="grow rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-center">
                        <div className="text-[14px] font-extrabold text-gray-900">{step.label}</div>
                        {step.note && (
                          <div className="mt-0.5 text-[11.5px] leading-snug text-gray-400">
                            {step.note}
                          </div>
                        )}
                      </div>
                    </Fragment>
                  ))}
                </div>
              )}
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {sec.items.map((item) => (
                  <li key={item} className="relative pl-[22px] text-[14.5px] leading-relaxed text-gray-700">
                    <i
                      className="ph-bold ph-check absolute left-0 top-0.5"
                      style={{ color: "var(--brand-pink)" }}
                    />
                    {renderEmphasis(item)}
                  </li>
                ))}
              </ul>
              {sec.note && (
                <div
                  className="mt-4 flex items-start gap-2.5 rounded-xl p-[15px] text-[13.5px] leading-relaxed text-white"
                  style={{ background: "var(--danger)" }}
                >
                  <i className="ph-bold ph-warning-circle mt-0.5 flex-none text-base" />
                  <div className="grid gap-1">
                    {sec.note.map((line) => (
                      <p key={line} className="m-0">
                        {renderUnderline(line)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        {isIntern && (
          <section className="mt-[52px]">
            <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
              GROWTH ROADMAP
            </p>
            <h2 className="mb-5 text-2xl font-extrabold tracking-tight">
              이렇게 성장해요 — 1년 로드맵
            </h2>

            <div className="mb-[52px] rounded-2xl border border-gray-200 bg-white p-7">
              <div className="mb-1.5 flex items-baseline justify-between text-xs text-gray-400">
                <span>인턴</span>
                <span className="inline-flex items-center gap-1.5">
                  1년 차
                  <i className="ph-bold ph-check text-[13px] text-[color:var(--brand-pink)]" />
                  <b className="brand-gradient-text text-[13px] font-extrabold">전환 평가</b>
                </span>
              </div>
              <div className="mb-2.5 flex h-[46px] w-full overflow-hidden rounded-[10px]">
                <div
                  className="flex flex-none items-center justify-center bg-gray-900 text-center text-[11px] font-bold leading-tight text-white"
                  style={{ flex: "0 0 8%" }}
                >
                  1주
                  <br />
                  스타트
                </div>
                <div
                  className="flex flex-1 items-center justify-center text-[12px] font-bold"
                  style={{ background: "#F4C0D1", color: "#72243E" }}
                >
                  1~3개월
                </div>
                <div
                  className="flex items-center justify-center text-[12px] font-bold text-white"
                  style={{ flex: "3", background: "var(--brand-pink)" }}
                >
                  4~12개월
                </div>
              </div>
              <div className="mb-7 flex w-full text-[11px] text-gray-400">
                <div style={{ flex: "0 0 8%" }} />
                <div className="flex-1 text-center">Q1</div>
                <div className="text-center" style={{ flex: "3" }}>
                  Q2 ~ Q4
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-none rounded-[3px] bg-gray-900" />
                    <span className="text-sm font-bold">첫 1주 · 스타트</span>
                  </div>
                  <div className="flex gap-2 text-[13px] leading-relaxed text-gray-600">
                    <i className="ph-bold ph-check mt-0.5 flex-none text-[color:var(--brand-pink)]" />
                    <span>글로브/플릭스 가이드라인 숙지 및 테스팅</span>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 flex-none rounded-[3px]"
                      style={{ background: "#ED93B1" }}
                    />
                    <span className="text-sm font-bold">1~3개월 · 정착</span>
                  </div>
                  <div className="grid gap-2 text-[13px] leading-relaxed text-gray-600">
                    {["브랜드 온보딩", "브랜드 온라인 미팅", "콘텐츠 검수"].map((t) => (
                      <div key={t} className="flex gap-2">
                        <i className="ph-bold ph-check mt-0.5 flex-none text-[color:var(--brand-pink)]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 flex-none rounded-[3px]"
                      style={{ background: "#993556" }}
                    />
                    <span className="text-sm font-bold">4~12개월 · 확장 &amp; 심화</span>
                  </div>
                  <div className="grid gap-2 text-[13px] leading-relaxed text-gray-600">
                    {[
                      "브랜드 콘텐츠 피드백",
                      "브랜드 세일즈",
                      "인플루언서 관리",
                      "퍼포먼스 마케팅 (메타 광고 운영)",
                      "AI 애니메이션 영상 제작",
                    ].map((t) => (
                      <div key={t} className="flex gap-2">
                        <i className="ph-bold ph-check mt-0.5 flex-none text-[color:var(--brand-pink)]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-400">
                <i className="ph ph-info-fill mt-0.5 flex-none" />
                <span>
                  고정된 업무 범위는 아니며, 개인 역량과 팀 상황에 따라 일정과 담당 업무는
                  유연하게 조정됩니다.
                </span>
              </div>
            </div>

            <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
              AFTER 1 YEAR
            </p>
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight">
              인턴 1년을 마치면, 이런 직무와 잘 맞아요
            </h2>
            <p className="mb-5 max-w-[660px] text-[13.5px] leading-relaxed text-gray-500">
              각 직무 자격 요건 중 <b className="font-bold text-gray-700">경력 요건은 제외</b>하고,
              인턴 1년간 실제 수행 업무와 <b className="font-bold text-gray-700">70% 이상 일치</b>
              하면 잘 맞는 직무로 표시했어요. 데이터 분석 툴 활용 같은 기본 역량은 충족으로
              간주합니다.
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
              <p className="mb-3 text-[17px] font-extrabold leading-snug text-[color:var(--brand-pink)]">
                ★ 앤마들린 대표가 이용 브랜드 대표에게 직접 연락해 추천
              </p>
              <Link
                href="/brand-jobs/for-interns"
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-[26px] py-3.5 text-[15px] font-bold text-white no-underline"
              >
                {/* 모바일에서는 한 줄로 넣으면 버튼이 너무 넓어져 두 줄로 끊어 보여준다. */}
                <span className="hidden sm:inline">
                  인턴 종료 후 취업할 확률이 높은 글로브 이용 브랜드 공고 확인하기
                </span>
                <span className="text-left leading-snug sm:hidden">
                  인턴 종료 후 취업할 확률 높은
                  <br />
                  글로브 이용 브랜드 공고 확인하기
                </span>
                <i className="ph-bold ph-arrow-right" />
              </Link>
            </div>
          </section>
        )}

        <ApplyCtaButton
          jobTitle={job.title}
          className="mt-[52px] block w-full cursor-pointer rounded-[24px] p-12 text-center text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <h2 className="mb-2.5 text-[28px] font-extrabold tracking-tight">
            이력서 없이도 3분 이내 지원 가능
          </h2>
          <p className="mb-5 text-[15px] leading-relaxed opacity-90">
            간단한 정보만 남기면 됩니다. 적합한 마감이면 지금 지원해 주세요.
          </p>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white px-[26px] py-3.5 text-[15px] font-extrabold">
            <span style={{ color: "#b81f6c" }}>이력서 없이도 3분 이내 지원하기</span>
            <i className="ph-bold ph-arrow-right" style={{ color: "#b81f6c" }} />
          </span>
          <p className="mt-5 text-[12.5px] opacity-80">
            문의: youjin@glovv.co.kr · 직무·경력 무관 상시
          </p>
        </ApplyCtaButton>
      </main>

      <Footer />

      <CareersDetailActions jobTitle={job.title} />
    </div>
  );
}
