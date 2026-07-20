import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import CareersApplyForm from "@/components/CareersApplyForm";
import FaqAccordion from "@/components/FaqAccordion";
import { getCareersJobs } from "@/lib/data";

const STEPS = [
  { n: 1, title: "지원서 제출", note: "이력서·포트폴리오" },
  { n: 2, title: "서류 전형", note: "직무 적합성 중심" },
  { n: 3, title: "1차 인터뷰", note: "온라인 진행" },
  { n: 4, title: "2차 인터뷰", note: "조직 적합성 중심" },
  { n: 5, title: "처우 협의", note: "" },
  { n: 6, title: "최종 합격", note: "" },
];

const INTERN_STEPS = [
  { n: 1, title: "지원서 제출", note: "이력서 혹은 자유 양식 지원" },
  { n: 2, title: "서류 전형", note: "" },
  { n: 3, title: "인터뷰", note: "" },
  { n: 4, title: "Fit Testing", note: "일주일간 진행" },
  { n: 5, title: "정식 계약", note: "최종 합격" },
];

const FAQS = [
  {
    q: "경력이 없어도 지원할 수 있나요?",
    a: "네. 인턴·신입 포지션은 경력이 없어도 지원 가능합니다. 뷰티 산업에 대한 관심과 성장 의지를 가장 중요하게 봅니다.",
  },
  {
    q: "포트폴리오는 필수인가요?",
    a: "직무에 따라 다릅니다. 마케팅·MD·BD 직무는 관련 경험을 보여줄 수 있는 자료가 있으면 좋지만, 필수는 아닙니다.",
  },
  {
    q: "지원 결과는 언제 알 수 있나요?",
    a: "전형별로 1~2주 내 이메일로 안내드립니다. 내부 사정으로 지연될 경우 별도로 공지합니다.",
  },
  {
    q: "상시 인재풀에 등록하면 어떻게 되나요?",
    a: "관련 직무의 채용 계획이 생기면 등록해주신 정보를 우선 검토하고, 적합한 분께 개별 연락을 드립니다.",
  },
];

export default async function CareersPage() {
  const jobs = await getCareersJobs();

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="mx-auto max-w-[1120px] px-5 pb-[90px] pt-10">
        <p className="m-0 text-xs font-extrabold tracking-[0.18em] text-[color:var(--brand-pink)]">
          JOIN US
        </p>
        <h1 className="mb-2 mt-2.5 text-[32px] font-extrabold tracking-tight">Glovv 자사 채용</h1>
        <p className="mb-8 max-w-[560px] text-[15px] text-gray-500">
          Glovv·Flixx를 함께 만들 동료를 찾습니다. 지금 열린 포지션이 없어도 인재풀에
          등록해두면 딱 맞는 자리가 열릴 때 먼저 연락드려요.
        </p>

        <h2 className="mb-3.5 text-xl font-extrabold tracking-tight">진행 중인 공고</h2>
        <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/careers/${job.id}`}
              className="card-shadow card-shadow-hover block rounded-2xl border border-gray-200 bg-white p-[22px] text-inherit no-underline transition-transform hover:-translate-y-0.5"
            >
              <div className="mb-3 flex gap-1.5">
                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                  {job.tag}
                </span>
                <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-[color:var(--success)]"
                  style={{ background: "rgba(18,161,80,.1)" }}
                >
                  진행 중
                </span>
              </div>
              <h3 className="mb-1.5 text-[17px] font-extrabold tracking-tight">{job.title}</h3>
              <p className="mb-3.5 text-[13.5px] leading-relaxed text-gray-500">{job.summary}</p>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--brand-pink)]">
                자세히 보기 <i className="ph-bold ph-arrow-right" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mb-[52px] flex items-start gap-2 rounded-xl border p-[13px] text-[13px] leading-relaxed text-gray-500"
          style={{ background: "rgba(43,127,255,.06)", borderColor: "rgba(43,127,255,.16)" }}
        >
          <i className="ph-bold ph-info mt-0.5 text-[color:var(--info)]" />
          <span>
            외국인 채용 공고는 목록에 <b className="font-bold text-gray-700">&apos;외국인 채용&apos;</b>으로
            별도 표기됩니다.
          </span>
        </p>

        <h2 className="mb-1 text-xl font-extrabold tracking-tight">채용 프로세스</h2>
        <p className="mb-[18px] text-sm text-gray-500">
          지원부터 최종 합격까지, 보통 3~5주가 소요됩니다.
        </p>
        <div className="mb-4 flex gap-2.5 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="card-shadow min-w-[150px] flex-none rounded-2xl border border-gray-200 bg-white px-4 py-[18px]"
            >
              <span
                className="mb-2.5 inline-grid h-[26px] w-[26px] place-items-center rounded-lg text-xs font-extrabold text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                {s.n}
              </span>
              <div className="text-[14.5px] font-extrabold">{s.title}</div>
              {s.note && <div className="mt-0.5 text-xs text-gray-400">{s.note}</div>}
            </div>
          ))}
        </div>

        <h2 className="mb-1 text-xl font-extrabold tracking-tight">인턴 채용 프로세스</h2>
        <p className="mb-[18px] text-sm text-gray-500">지원부터 최종 합격까지, 2주일 이내로 진행됩니다.</p>
        <div className="mb-[52px] flex gap-2.5 overflow-x-auto pb-2">
          {INTERN_STEPS.map((s) => (
            <div
              key={s.n}
              className="card-shadow min-w-[160px] flex-none rounded-2xl border border-gray-200 bg-white px-4 py-[18px]"
            >
              <span className="mb-2.5 inline-grid h-[26px] w-[26px] place-items-center rounded-lg bg-gray-900 text-xs font-extrabold text-white">
                {s.n}
              </span>
              <div className="text-[14.5px] font-extrabold">{s.title}</div>
              {s.note && <div className="mt-0.5 text-xs text-gray-400">{s.note}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-2">
          <CareersApplyForm />
          <section>
            <h2 className="mb-4 text-lg font-extrabold tracking-tight">채용 FAQ</h2>
            <FaqAccordion items={FAQS} />
          </section>
        </div>
      </main>
    </div>
  );
}
