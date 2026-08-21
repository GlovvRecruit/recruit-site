import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/admin";

// 내부 검수용 테스트 페이지 — 검색 노출 불필요.
export const metadata: Metadata = {
  title: { absolute: "크롤링 대상 채용 페이지 (테스트)" },
  robots: { index: false, follow: false },
};

// 조사가 계속 돌고 있으므로 매 요청마다 최신 상태를 읽는다.
export const dynamic = "force-dynamic";

type Status = "own_site" | "greetinghr" | "ninehire";

interface Row {
  name: string;
  list_rank: number;
  status: Status;
  career_url: string | null;
  notes: string | null;
}

const GROUPS: { status: Status; label: string; desc: string }[] = [
  {
    status: "greetinghr",
    label: "그리팅",
    desc: "career.greetinghr.com 서브도메인. 구조가 동일해 크롤러 하나로 전부 처리할 수 있다.",
  },
  {
    status: "ninehire",
    label: "나인하이어",
    desc: "ninehire.site 서브도메인. 마찬가지로 공통 크롤러 하나로 처리 가능.",
  },
  {
    status: "own_site",
    label: "자사 채용 홈페이지",
    desc: "브랜드·법인이 직접 운영하는 채용 페이지. 사이트마다 구조가 달라 개별 대응이 필요하다.",
  },
];

/** crawl_candidate_brands는 관리자 전용(RLS)이라 서버에서 service role로 읽는다. */
async function fetchTargets(): Promise<{ rows: Row[]; unresearched: number } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const all: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("crawl_candidate_brands")
      .select("name, list_rank, status, career_url, notes")
      .in("status", ["own_site", "greetinghr", "ninehire"])
      .order("list_rank", { ascending: true })
      .range(from, from + 999);
    if (error || !data) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    from += 1000;
  }

  const { count } = await supabase
    .from("crawl_candidate_brands")
    .select("id", { count: "exact", head: true })
    .eq("status", "unresearched");

  return { rows: all, unresearched: count ?? 0 };
}

function needsReview(notes: string | null): boolean {
  return Boolean(notes && notes.includes("검수필요"));
}

/** notes에서 사람이 볼 만한 근거만 추린다(법인명·조사 경로·페이지 제목). */
function evidence(notes: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/자동조사\(/, "출처 ")
    .replace(/\)/, ")")
    .replace(/HTTP 200,?\s*/, "")
    .slice(0, 150);
}

export default async function CrawlTargetsTestPage() {
  const result = await fetchTargets();

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteNav />
        <main className="mx-auto max-w-[1120px] px-5 py-16">
          <p className="text-sm text-gray-500">Supabase가 연결되지 않아 목록을 불러올 수 없어요.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const { rows, unresearched } = result;
  const reviewCount = rows.filter((r) => needsReview(r.notes)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <div className="border-b border-dashed border-amber-400 bg-amber-50 px-5 py-2.5 text-center text-[13px] font-bold text-amber-800">
        🧪 TEST PAGE — 크롤링 확장 후보 조사 결과입니다. 고객에게 노출되는 화면이 아니고 검색에도
        걸리지 않아요.
      </div>

      <main className="mx-auto max-w-[1120px] px-5 pb-[90px] pt-8">
        <p className="m-0 text-xs font-extrabold tracking-[0.18em] text-[color:var(--brand-pink)]">
          CRAWL TARGETS
        </p>
        <h1 className="mb-3 mt-2.5 text-[32px] font-extrabold leading-[1.25] tracking-tight">
          크롤링 대상 채용 페이지 {rows.length.toLocaleString()}건
        </h1>
        <p className="mb-7 max-w-[720px] text-[15px] leading-relaxed text-gray-500">
          &quot;글로브 이용 브랜드 명단&quot; 2,376건을 자동 조사해, 자사 채용 홈페이지·그리팅·나인하이어를
          운영하는 곳만 골라낸 목록이에요. 사람인·잡코리아·원티드 등 외부 채용 플랫폼만 쓰는 브랜드는
          크롤링 대상이 아니라 제외했습니다.
          {unresearched > 0 && (
            <>
              {" "}
              <b className="text-gray-700">
                아직 {unresearched.toLocaleString()}건은 조사 중이라 목록이 더 늘어납니다.
              </b>
            </>
          )}
        </p>

        <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {GROUPS.map((g) => (
            <div key={g.status} className="rounded-[14px] border border-gray-200 bg-white p-4">
              <div className="text-xs font-bold text-gray-500">{g.label}</div>
              <div className="mt-1.5 text-2xl font-extrabold text-gray-800">
                {rows.filter((r) => r.status === g.status).length.toLocaleString()}
              </div>
            </div>
          ))}
          <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-bold text-amber-700">사람 검수 필요</div>
            <div className="mt-1.5 text-2xl font-extrabold text-amber-800">{reviewCount}</div>
          </div>
        </div>

        {GROUPS.map((g) => {
          const groupRows = rows.filter((r) => r.status === g.status);
          if (groupRows.length === 0) return null;
          return (
            <section key={g.status} className="mb-10">
              <h2 className="m-0 text-xl font-extrabold tracking-tight">
                {g.label} <span className="text-[color:var(--brand-pink)]">{groupRows.length}</span>
              </h2>
              <p className="mb-3.5 mt-1.5 text-[13px] text-gray-400">{g.desc}</p>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full min-w-[820px] border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-400">
                      <th className="w-14 py-2.5 pl-4 pr-2 font-bold">순위</th>
                      <th className="w-44 py-2.5 pr-3 font-bold">브랜드</th>
                      <th className="w-[360px] py-2.5 pr-3 font-bold">채용 페이지</th>
                      <th className="py-2.5 pr-4 font-bold">조사 근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((r) => (
                      <tr key={`${r.status}-${r.list_rank}-${r.name}`} className="border-b border-gray-50 align-top">
                        <td className="py-2 pl-4 pr-2 text-gray-400">{r.list_rank}</td>
                        <td className="py-2 pr-3 font-semibold text-gray-800">
                          {r.name}
                          {needsReview(r.notes) && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                              검수
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {r.career_url ? (
                            <a
                              href={r.career_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="break-all text-[12.5px] font-semibold text-[color:var(--brand-pink)]"
                            >
                              {r.career_url}
                            </a>
                          ) : (
                            <span className="text-gray-400">–</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-[12px] leading-relaxed text-gray-500">
                          {evidence(r.notes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <p className="mt-[34px] border-t border-dashed border-gray-200 pt-4 text-[12.5px] leading-relaxed text-gray-400">
          여기 있는 건 <b className="text-gray-600">채용 페이지 주소</b>이고, 개별 공고를 긁어와
          `jobs` 테이블에 넣는 크롤러는 아직 그리팅·나인하이어·일부 자사 사이트에만 있습니다.
          &quot;검수&quot; 표시는 브랜드명이 페이지에 없어 계열사 도메인 일치로 추정한 건이라 사람이
          한 번 확인하는 게 좋아요.
        </p>
      </main>

      <Footer />
    </div>
  );
}
