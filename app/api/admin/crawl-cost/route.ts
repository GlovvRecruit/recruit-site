import { createClient } from "@/lib/supabase/server";

// 이 두 Apify 태스크는 이 저장소 밖(Apify 콘솔)에서 매일 스케줄로 도는 크롤러다 — 네이티브
// 정규식 크롤러 5개(LG/APR그룹/삐아/코리아나/에이블씨엔씨)가 못 덮는 나머지 브랜드들을
// 그리팅HR/나인하이어 채용 플랫폼에서 긁어온다. 같은 Apify 계정에 다른 프로젝트(광고 분석 등)의
// 액터도 같이 있어서, 반드시 이 두 actorId로만 필터링해야 크롤링 비용만 정확히 잡힌다.
const CRAWL_ACTORS = [
  { actorId: "YrQuEkowkNCLdk4j2", label: "그리팅HR" },
  { actorId: "YJCnS9qogi9XxDgLB", label: "나인하이어" },
];

interface ApifyRun {
  startedAt: string;
  usageTotalUsd: number;
}

async function fetchActorRuns(actorId: string, token: string): Promise<ApifyRun[]> {
  const runs: ApifyRun[] = [];
  const PAGE_SIZE = 200;
  let offset = 0;
  while (true) {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&desc=true&limit=${PAGE_SIZE}&offset=${offset}`
    );
    if (!res.ok) break;
    const json = await res.json();
    const items = (json?.data?.items ?? []) as ApifyRun[];
    runs.push(...items);
    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 2000) break; // 안전장치 — 하루 1회 실행 기준 수년치를 초과하면 중단
  }
  return runs;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return Response.json({ error: "apify not configured" }, { status: 500 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 6);
  const last30Start = new Date(todayStart);
  last30Start.setDate(last30Start.getDate() - 29);

  try {
    const perActor = await Promise.all(
      CRAWL_ACTORS.map(async ({ actorId, label }) => {
        const runs = await fetchActorRuns(actorId, token);
        const sumSince = (since: Date) =>
          runs
            .filter((r) => new Date(r.startedAt) >= since)
            .reduce((sum, r) => sum + (r.usageTotalUsd ?? 0), 0);
        return {
          label,
          today: sumSince(todayStart),
          last7Days: sumSince(last7Start),
          last30Days: sumSince(last30Start),
          runCount30d: runs.filter((r) => new Date(r.startedAt) >= last30Start).length,
        };
      })
    );

    const total = {
      today: perActor.reduce((s, a) => s + a.today, 0),
      last7Days: perActor.reduce((s, a) => s + a.last7Days, 0),
      last30Days: perActor.reduce((s, a) => s + a.last30Days, 0),
    };

    return Response.json({ total, perActor });
  } catch (error) {
    console.error("[crawl-cost] apify fetch failed:", error);
    return Response.json({ error: "apify fetch failed" }, { status: 502 });
  }
}
