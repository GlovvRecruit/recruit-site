import { createAdminClient } from "@/lib/supabase/admin";
import { ingestCrawledOpenings, type CrawledOpening } from "@/lib/crawler/ingest";
import { crawlGreeting, crawlNinehire, fetchOpeningDetail } from "@/lib/crawler/ats";
import { isExcludedCompany } from "@/lib/crawler/excluded-companies";
import { resolveBrandName } from "@/lib/crawler/brand-aliases";
import { crawlRecruiter } from "@/lib/crawler/recruiter";

/**
 * 그리팅·나인하이어를 쓰는 브랜드 전체를 한 번에 크롤링한다.
 *
 * 대상은 `crawl_candidate_brands`에서 조사된 것(status = greetinghr | ninehire)을 그대로 쓰므로,
 * 조사가 진행돼 대상이 늘어나면 이 크론이 자동으로 함께 커버한다 — 브랜드가 추가될 때마다
 * 크롤러를 새로 만들 필요가 없다.
 *
 * 파라미터:
 *   ?platform=greetinghr|ninehire  특정 플랫폼만
 *   ?limit=N                        앞 N개만(시험 실행용)
 *   ?dry=1                          DB에 넣지 않고 수집 결과만 확인
 */
export const maxDuration = 300;

// 한 번에 너무 많은 사이트를 동시에 두드리지 않도록 제한한다(대상 도메인이 전부 달라 병렬은
// 안전하지만, 서버리스 실행 시간과 상대 서버 부하를 함께 고려한 값).
const CONCURRENCY = 6;

interface CandidateRow {
  name: string;
  crawl_approved?: boolean;
  status: "greetinghr" | "ninehire" | "own_site" | "active";
  career_url: string | null;
}

/**
 * 어떤 크롤러로 수집할지는 **주소로 판별**한다. 조사 단계에서 status가 own_site로 잡혔지만
 * 실제로는 그리팅·나인하이어 주소인 행이 있어(에이솔루션 → ak.career.greetinghr.com),
 * status로 분기하면 그런 곳을 놓치고 사이트 중복 제거 과정에서 정상 행까지 밀어낸다.
 */
function platformOf(url: string | null): "greetinghr" | "ninehire" | "recruiter" | null {
  const host = hostOf(url);
  if (!host) return null;
  if (host.endsWith("career.greetinghr.com") || host.endsWith("greetinghr.com")) return "greetinghr";
  if (host.endsWith("ninehire.site") || host.endsWith("ninehire.com")) return "ninehire";
  if (host.endsWith("recruiter.co.kr")) return "recruiter";
  return null;
}

function hostOf(url: string | null): string {
  try {
    return new URL(url as string).hostname.replace(/^www./, "").toLowerCase();
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;
  const manualSecret = process.env.APIFY_WEBHOOK_SECRET;
  const isVercelCron =
    cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  const isManualCall = manualSecret && url.searchParams.get("secret") === manualSecret;
  if (!isVercelCron && !isManualCall) {
    return Response.json({ error: "invalid secret" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ error: "supabase not configured" }, { status: 500 });
  }

  const platform = url.searchParams.get("platform");
  const limit = Number(url.searchParams.get("limit") ?? 0) || 0;
  const dry = url.searchParams.get("dry") === "1";

  let query = supabase
    .from("crawl_candidate_brands")
    .select("name, status, career_url, crawl_approved")
    // active(이미 운영 중)도 포함한다 — 지원 플랫폼 주소인데 담당 크롤러가 없어 공고·직무 분류가
    // 옛 상태로 남아 있던 브랜드가 있었다(올리브인터내셔널·토니모리 등).
    .in("status", platform ? [platform] : ["greetinghr", "ninehire", "own_site", "active"])
    .not("career_url", "is", null)
    .order("list_rank", { ascending: true });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: "failed to load targets", detail: error.message }, { status: 500 });
  }
  const rawTargets = (data as CandidateRow[]) ?? [];

  // 한 회사의 채용 사이트를 브랜드명 여러 개가 가리키는 경우가 있다
  // (ak.career.greetinghr.com = 애경산업 + 에이지투웨니스, dalba… = 달바글로벌 + dalba(달바 US)).
  // 그대로 크롤링하면 같은 공고가 브랜드만 다른 두 행으로 저장되므로 **호스트 단위로 한 번만**
  // 가져온다. 이름은 이미 brands에 있는 것을 우선해(기존 데이터와 이어지도록) 고르고, 없으면
  // 명단 순위가 앞선 것을 쓴다.
  const { data: brandRows } = await supabase.from("brands").select("name");
  const knownBrandNames = new Set((brandRows ?? []).map((b) => b.name as string));
  const byHost = new Map<string, CandidateRow>();
  for (const t of rawTargets) {
    let host: string;
    try {
      host = new URL(t.career_url as string).host;
    } catch {
      continue;
    }
    const prev = byHost.get(host);
    if (!prev) {
      byHost.set(host, t);
      continue;
    }
    if (!knownBrandNames.has(prev.name) && knownBrandNames.has(t.name)) byHost.set(host, t);
  }
  // 광고대행사·경쟁사는 아예 수집하지 않는다(글로브 이용 브랜드 명단에 섞여 있다).
  const targets = [...byHost.values()]
    .filter((t) => !isExcludedCompany(t.name))
    // 공통 크롤러가 있는 플랫폼만 수집한다. 나머지 자사 사이트는 구조가 제각각이라 개별 대응 전까지
    // 대상에서 빼서 헛된 요청을 만들지 않는다.
    .filter((t) => platformOf(t.career_url) !== null);
  const excludedCompanies = byHost.size - targets.length;
  const mergedDuplicateSites = rawTargets.length - targets.length;

  const items: CrawledOpening[] = [];
  const perBrand: { brand: string; platform: string; openings: number }[] = [];
  let failed = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const slice = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (t) => {
        try {
          // 이미 우리 DB에 법인명으로 있는 회사는 그 이름으로 수집한다(브랜드 중복 생성 방지).
          const brandName = resolveBrandName(t.career_url as string, t.name);
          const platform = platformOf(t.career_url);
          const openings =
            platform === "greetinghr"
              ? await crawlGreeting(brandName, t.career_url as string)
              : platform === "ninehire"
                ? await crawlNinehire(brandName, t.career_url as string)
                : await crawlRecruiter(brandName, t.career_url as string);
          return { t, openings };
        } catch {
          return { t, openings: null };
        }
      })
    );
    for (const { t, openings } of results) {
      if (openings === null) {
        failed += 1;
        continue;
      }
      items.push(...openings);
      perBrand.push({ brand: t.name, platform: platformOf(t.career_url) ?? t.status, openings: openings.length });
    }
  }

  // ---- 신규 공고만 상세 본문을 채운다.
  // 목록 API에는 본문이 없어 공고마다 한 번 더 요청해야 한다. 전체(1,200건 이상)를 매번 받으면
  // 서버리스 실행 시간을 넘기므로, **아직 본문이 없는 공고**만 가져온다(보통 하루 수십 건).
  const DETAIL_LIMIT = Number(url.searchParams.get("detailLimit") ?? 120) || 120;
  const DETAIL_CONCURRENCY = 5;
  let detailFetched = 0;
  if (items.length > 0) {
    const { data: known } = await supabase
      .from("crawled_jobs_staging")
      .select("source_url, description")
      .in(
        "source_url",
        items.map((i) => i.sourceUrl).slice(0, 1000)
      );
    const hasDescription = new Set(
      (known ?? []).filter((k) => (k.description ?? "").length > 30).map((k) => k.source_url)
    );
    const needDetail = items.filter((i) => !hasDescription.has(i.sourceUrl)).slice(0, DETAIL_LIMIT);
    for (let i = 0; i < needDetail.length; i += DETAIL_CONCURRENCY) {
      const slice = needDetail.slice(i, i + DETAIL_CONCURRENCY);
      const details = await Promise.all(slice.map((it) => fetchOpeningDetail(it.sourceUrl)));
      slice.forEach((it, idx) => {
        const d = details[idx];
        if (d.description) {
          it.description = d.description;
          it.descriptionImages = d.descriptionImages;
          detailFetched++;
        }
      });
    }
  }

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      targets: targets.length,
      mergedDuplicateSites,
      excludedCompanies,
      failed,
      collected: items.length,
      detailFetched,
      brandsWithOpenings: perBrand.filter((b) => b.openings > 0).length,
      perBrand: perBrand.filter((b) => b.openings > 0).slice(0, 50),
      sample: items.slice(0, 10),
    });
  }

  // **검수 전 공개 금지** — 조사 자동화로 붙인 대상에는 광고대행사·동명 업체가 섞여 있어
  // (프로그레스미디어 등) 사람이 확인한 것만 공개해야 한다. staging에만 적재된다.
  // 사이트 단위로 승인된 대상의 공고는 검수 없이 공개하고, 미승인 대상은 staging에만 쌓는다.
  // 공개 대상 브랜드명은 수집할 때와 **같은 규칙(별칭 적용)** 으로 만들어야 한다.
  // 후보 이름 그대로 쓰면 별칭이 걸린 사이트(oliveinter → 올리브인터내셔널)에서 이름이 어긋나
  // 승인해둔 곳인데도 공개되지 않는다.
  const approvedBrands = targets
    .filter((t) => t.crawl_approved)
    .map((t) => resolveBrandName(t.career_url as string, t.name));
  const result = await ingestCrawledOpenings(items, null, {
    publish: false,
    publishBrands: approvedBrands,
  });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({
    ...result,
    targets: targets.length,
    mergedDuplicateSites,
    excludedCompanies,
    approvedTargets: targets.filter((t) => t.crawl_approved).length,
    failed,
    collected: items.length,
    detailFetched,
    brandsWithOpenings: perBrand.filter((b) => b.openings > 0).length,
  });
}
