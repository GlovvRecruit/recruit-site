import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "회사 소개 | 글로브·플릭스 운영사",
  description:
    "글로브 채용, 플릭스 채용을 진행하는 앤마들린 채용 페이지입니다. 뷰티 채용 플랫폼 글로브(Glovv)와 AI 뷰티 애니메이션 플릭스(Flixx)를 운영하는 앤마들린 주식회사를 소개합니다.",
  alternates: { canonical: "/about" },
};

const METRICS = [
  { value: "2,000+", label: "협업 뷰티 브랜드" },
  { value: "4,000+", label: "협업 인플루언서" },
  { value: "30억", label: "'25 시리즈A 투자 유치" },
  { value: "3만+", label: "생성된 릴스 콘텐츠" },
];

const GLOVV_POINTS = [
  "대부분의 올리브영 입점 브랜드(2,000개+)가 이용하는 뷰티 릴스 플랫폼",
  "4,000명+ 국내 인플루언서, 1,300명+ 일본 인플루언서가 매일 접속",
  "출시 3개월 만에 BEP 달성, '25년 시리즈A 30억원 투자유치",
  "1년만에 국내 매출 100억원 달성, 일본 엔화 매출 발생 중",
];

const FLIXX_POINTS = [
  "기획부터 영상 제작 완료까지 클릭 3번 만에 완성",
  "영상 제작 6시간 → 5분",
  "쉬운 사용법으로 AI 초보자도 편하게 이용 가능",
  "일상생활형 영상, 판타지 영상, 브랜딩 영상 등 제작",
];

const TALENT_PROFILE = [
  { title: "Passion Person", description: ["높은 목표를 세우고", "열정적으로 도전하는 사람"] },
  {
    title: "Problem Solver",
    description: ["직무의 경계를 넘어 본질적인 문제를", "정확히 파악하고 해결하는 사람"],
  },
  { title: "Honest Person", description: ["신뢰할 수 있는 정직한 사람"] },
  { title: "Co-worker", description: ["회사의 성장을 위해", "팀원들과 잘 협동하는 사람"] },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-white to-gray-50">
        <div
          className="absolute -right-[120px] -top-[120px] h-[360px] w-[360px] rounded-full opacity-15 blur-[20px]"
          style={{ background: "linear-gradient(120deg, #FA7035, #FF0099)" }}
        />
        <div className="relative mx-auto max-w-[1120px] px-5 pb-16 pt-[72px]">
          <p className="m-0 text-xs font-extrabold tracking-[0.2em] text-[color:var(--brand-pink)]">
            ABOUT US
          </p>
          <h1 className="mb-4 mt-3.5 max-w-[720px] text-[44px] font-extrabold leading-[1.18] tracking-tight">
            대부분의 뷰티 브랜드가 이용하는{" "}
            <br className="sm:hidden" />
            <span className="whitespace-nowrap">글로브/플릭스에서</span>
            <br />
            <span className="brand-gradient-text">함께 성장할 사람</span>을 찾습니다
          </h1>
          <p className="mb-7 max-w-[620px] text-base leading-relaxed text-gray-500">
            대부분의 올리브영 입점 브랜드가 사용하는 1등 뷰티 릴스 제작 플랫폼 글로브,
            <br />
            5분만에 AI 뷰티 애니메이션을 만들 수 있는 플릭스를 운영하는 앤마들린 주식회사입니다.
            <br />
            자사 채용 공고 뿐만 아니라 주요 뷰티 브랜드 채용공고도 전달드릴게요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/brand-jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-[15px] font-bold text-white no-underline"
            >
              타 뷰티 브랜드 공고 보러가기 <i className="ph-bold ph-arrow-right" />
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-white no-underline shadow-[0_8px_22px_rgba(250,60,100,0.3)]"
              style={{ background: "var(--brand-gradient)" }}
            >
              글로브/플릭스 채용 <i className="ph-bold ph-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1120px] px-5 pb-[90px] pt-14">
        <div className="mb-16 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="card-shadow rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="brand-gradient-text text-[34px] font-extrabold tracking-tight">
                {m.value}
              </div>
              <div className="mt-1.5 text-[13.5px] font-semibold text-gray-500">{m.label}</div>
            </div>
          ))}
        </div>

        <h2 className="mb-1.5 text-[26px] font-extrabold tracking-tight">우리가 만드는 서비스</h2>
        <p className="mb-6 text-[15px] text-gray-500">
          앤마들린 주식회사. 두 개의 서비스를 운영합니다.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
          <div className="card-shadow relative overflow-hidden rounded-[20px] border border-gray-200 bg-white p-7">
            <div
              className="absolute -right-[50px] -top-[50px] h-[170px] w-[170px] rounded-full opacity-15 blur-[8px]"
              style={{ background: "linear-gradient(120deg, #FA7035, #FF0099)" }}
            />
            <div className="relative">
              <div className="text-[11px] font-extrabold tracking-[0.1em] text-gray-400">
                BEAUTY REELS
              </div>
              <h3 className="brand-gradient-text mb-1 mt-1.5 inline-block text-2xl font-extrabold">
                글로브 (Glovv)
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                뷰티 브랜드의 인플루언서를 잇는 뷰티 릴스 전용 플랫폼
              </p>
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {GLOVV_POINTS.map((p) => (
                  <li
                    key={p}
                    className="relative pl-[22px] text-sm leading-relaxed text-gray-700"
                  >
                    <span
                      className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--brand-gradient)" }}
                    />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href="https://glovv.co.kr/intro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700 no-underline"
                >
                  글로브 소개서 <i className="ph-bold ph-arrow-up-right" />
                </a>
                <a
                  href="https://glovv.co.kr/reference"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700 no-underline"
                >
                  글로브 레퍼런스 <i className="ph-bold ph-arrow-up-right" />
                </a>
              </div>
            </div>
          </div>

          <div className="card-shadow rounded-[20px] border border-gray-200 bg-white p-7">
            <div className="text-[11px] font-extrabold tracking-[0.1em] text-gray-400">
              AI 뷰티 애니메이션
            </div>
            <h3 className="brand-gradient-text mb-1 mt-1.5 inline-block text-2xl font-extrabold">
              플릭스 (FLIXX)
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              클릭 3번으로 만드는 AI 뷰티 애니메이션
            </p>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {FLIXX_POINTS.map((p) => (
                <li key={p} className="relative pl-[22px] text-sm leading-relaxed text-gray-700">
                  <span
                    className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--brand-gradient)" }}
                  />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://slashpage.com/nmodelin/flixx_intro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700 no-underline"
              >
                플릭스 소개서 <i className="ph-bold ph-arrow-up-right" />
              </a>
              <a
                href="https://instagram.com/flixx.official"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700 no-underline"
              >
                플릭스 레퍼런스 <i className="ph-bold ph-arrow-up-right" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight">앤마들린 인재상</h2>
          <p className="mb-9 text-[15px] text-gray-500">우리는 이런 분들과 함께 하고 싶습니다</p>
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {TALENT_PROFILE.map((t) => (
              <div key={t.title}>
                <h3 className="text-lg font-extrabold tracking-tight">{t.title}</h3>
                <p className="mx-auto mt-2.5 max-w-[220px] text-sm leading-relaxed text-gray-500">
                  {t.description.flatMap((line, i, arr) =>
                    i < arr.length - 1 ? [line, <br key={i} />] : [line]
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-[20px] p-8 text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <div>
            <h3 className="mb-1.5 text-[22px] font-extrabold tracking-tight">
              앤마들린과 함께 성장하실래요?
            </h3>
            <p className="m-0 text-[14.5px] opacity-90">
              진행 중인 포지션이 없어도 인재풀에 등록해두세요.
            </p>
          </div>
          <Link
            href="/careers"
            className="flex-none rounded-xl bg-white px-6 py-3.5 text-[15px] font-extrabold no-underline"
            style={{ color: "#b81f6c" }}
          >
            자사 채용 보기
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
