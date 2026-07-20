import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import CareersDetailActions from "@/components/CareersDetailActions";
import { getCareersJobs } from "@/lib/data";

// 글로브 인턴 채용(https://glovvrecruit.github.io/intern/) 공식 문구 기준.
const INTERN_VALUES = [
  {
    icon: "ph-fill ph-sparkle",
    title: "뷰티 업계에서 인정받는 실력",
    desc: "2,000개+ 뷰티 브랜드 마케터, 4,000명+ 인플루언서와 긴밀하게 협업하며 실력을 쌓습니다.",
  },
  {
    icon: "ph-fill ph-chart-bar",
    title: "데이터 기반 콘텐츠 인사이트",
    desc: "3만개+ 릴스 콘텐츠를 분석하며 어떤 상황에 어떤 콘텐츠가 효과적인지 체득합니다.",
  },
  {
    icon: "ph-fill ph-rocket-launch",
    title: "성장하는 기업에서 키우는 문제 해결력",
    desc: "출시 1년만에 연매출 100억원을 달성한 기업에서 전략·운영을 경험하며 문제 해결력을 기릅니다.",
  },
];

const DEFAULT_VALUES = [
  {
    icon: "ph-fill ph-rocket-launch",
    title: "빠른 성장",
    desc: "2,000+ 브랜드·4,000+ 인플루언서 협업 데이터를 직접 다루며 뷰티 산업 전체를 배웁니다.",
  },
  {
    icon: "ph-fill ph-users-three",
    title: "진짜 실무",
    desc: "보조 업무가 아닌, 브랜드 담당자와 직접 소통하는 오너십 있는 프로젝트를 맡습니다.",
  },
  {
    icon: "ph-fill ph-sparkle",
    title: "AI 최전선",
    desc: "1분 만에 끝내는 뷰티 AI 온보딩을 만드는 서비스의 최전선에서 일합니다.",
  },
];

const INTERN_SECTIONS = [
  {
    title: "이런 일을 해요",
    items: [
      "3만개 이상 영상 중 광고 효율이 높은 콘텐츠를 분석해 인사이트 도출",
      "브랜드 영상 가이드라인에 대한 피드백 미팅 제공 및 온보딩 진행",
      "브랜드 미팅을 통해 페인 포인트 파악 및 문제 해결",
      "인플루언서가 제작한 영상 퀄리티 컨트롤 및 플랫폼 정착 지원",
    ],
  },
  {
    title: "이런 분을 찾아요",
    items: [
      "논리적으로 사고하고 커뮤니케이션 능력이 뛰어난 분",
      "빠른 실행력과 책임감·열정을 가진 분 (경력 무관)",
      "뷰티 업계에서 커리어 성장을 꿈꾸는 분",
      "로켓 성장하는 스타트업을 직접 경험해보고 싶은 분",
    ],
  },
  {
    title: "근무 조건 · 혜택",
    items: [
      "이태원역 1분 거리 사무실 · 오전 9시~오후 6시 근무",
      "시급 11,000원(월 환산 세전 약 230만원), 성과에 따라 인상",
      "인턴십 1년 완료 시 대표 추천서 작성 + 정규직 전환 검토",
    ],
  },
];

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

export default async function CareersDetailPage(props: PageProps<"/careers/[id]">) {
  const { id } = await props.params;
  const jobs = await getCareersJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();

  const isIntern = job.tag === "인턴";
  const values = isIntern ? INTERN_VALUES : DEFAULT_VALUES;
  const sections = isIntern ? INTERN_SECTIONS : DEFAULT_SECTIONS;

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
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-white/70 no-underline"
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
            {[
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
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[860px] px-5 pb-10 pt-[52px]">
        <section>
          <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
            WHY GLOVV
          </p>
          <h2 className="mb-5 text-2xl font-extrabold tracking-tight">이런 성장을 약속합니다</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {values.map((v) => (
              <div key={v.title} className="card-shadow rounded-2xl border border-gray-200 bg-white p-6">
                <span
                  className="mb-3.5 inline-grid h-11 w-11 place-items-center rounded-xl text-[22px] text-[#b81f6c]"
                  style={{ background: "linear-gradient(120deg, rgba(250,112,53,.14), rgba(255,0,153,.14))" }}
                >
                  <i className={v.icon} />
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

        <div className="mt-[26px] text-center">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-[26px] py-3.5 text-[15px] font-bold text-white no-underline"
          >
            다른 공고 확인하기 <i className="ph-bold ph-arrow-right" />
          </Link>
        </div>

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

      <CareersDetailActions jobTitle={job.title} />
    </div>
  );
}
