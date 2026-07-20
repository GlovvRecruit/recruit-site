import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import CareersDetailActions from "@/components/CareersDetailActions";
import { getBrands, getCareersJobs } from "@/lib/data";

const VALUES = [
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

const SECTIONS = [
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

export default async function CareersDetailPage(props: PageProps<"/careers/[id]">) {
  const { id } = await props.params;
  const [jobs, brands] = await Promise.all([getCareersJobs(), getBrands()]);
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();

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
            {VALUES.map((v) => (
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

        {brands.length > 0 && (
          <section className="mt-[52px]">
            <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-[color:var(--brand-pink)]">
              PARTNERS
            </p>
            <h2 className="mb-5 text-2xl font-extrabold tracking-tight">
              이런 브랜드들과 함께 일해요
            </h2>
            <div className="card-shadow rounded-[20px] border border-gray-200 bg-white px-6 py-[34px]">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] place-items-center gap-x-4 gap-y-[34px]">
                {brands.map((b) => (
                  <span key={b.id} className="text-center text-base font-extrabold tracking-tight text-gray-800">
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mt-[52px] grid gap-5">
          {SECTIONS.map((sec, i) => (
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
                  <li key={item} className="relative pl-6 text-[14.5px] leading-relaxed text-gray-700">
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
