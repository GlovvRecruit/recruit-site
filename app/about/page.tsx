import Link from "next/link";
import SiteNav from "@/components/SiteNav";

const METRICS = [
  { value: "2,000+", label: "협업 뷰티 브랜드 (자사 인력 상시 40%↑)" },
  { value: "4,000+", label: "협업 인플루언서" },
  { value: "30억", label: "'25 시리즈A 투자 유치" },
  { value: "3만+", label: "생성된 릴스 콘텐츠" },
];

const GLOVV_POINTS = [
  "2,000+ 뷰티 브랜드 & 4,000+ 인플루언서 협업 경험",
  "1분 만에 만드는 뷰티 AI 온보딩",
  "대부분이 재리뷰율 상위 뷰티 브랜드가 이용",
  "BEP 달성 · 일본·북미 시장 진출",
];

const FLIXX_POINTS = [
  "클릭 3번으로 만드는 AI 뷰티 애니메이션",
  "제품 URL 입력 → 시구절·컨셉 도출부터 영상 생성까지 자동",
  "완벽한 한국어 반영과 영·일·중 지원, 이미지 1클릭 생성",
  "4만원 — 3D 실사 스튜디오의 1/100 수준 비용",
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
            뷰티 브랜드가 가장 많이 오는 곳에서,
            <br />
            <span className="brand-gradient-text">함께 성장할 사람</span>을 찾습니다
          </h1>
          <p className="mb-7 max-w-[560px] text-base leading-relaxed text-gray-500">
            글로브의 트렌드를 만드는 스마트린, 그리고 대부분이 재리뷰율 상위 뷰티 브랜드의
            채용 소식을 한곳에서 만나보세요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/brand-jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-[15px] font-bold text-white no-underline"
            >
              브랜드 공고 보러가기 <i className="ph-bold ph-arrow-right" />
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-white no-underline shadow-[0_8px_22px_rgba(250,60,100,0.3)]"
              style={{ background: "var(--brand-gradient)" }}
            >
              Glovv 자사 채용 <i className="ph-bold ph-arrow-right" />
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
          스마트린 주식회사. 두 개의 서비스를 운영합니다.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
          <div className="card-shadow relative overflow-hidden rounded-[20px] border border-gray-200 bg-white p-7">
            <div
              className="absolute -right-[50px] -top-[50px] h-[170px] w-[170px] rounded-full opacity-15 blur-[8px]"
              style={{ background: "linear-gradient(120deg, #FA7035, #FF0099)" }}
            />
            <div className="relative">
              <div className="text-[11px] font-extrabold tracking-[0.1em] text-gray-400">
                BEAUTY REELS · AI
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
              클릭 3번 만에 AI 애니메이션을 생성하는 서비스
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
          </div>
        </div>

        <div
          className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-[20px] p-8 text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <div>
            <h3 className="mb-1.5 text-[22px] font-extrabold tracking-tight">
              스마트린과 함께 성장하실래요?
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
    </div>
  );
}
