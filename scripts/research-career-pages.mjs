/**
 * 크롤링 확장 후보(crawl_candidate_brands) 자동 조사 스크립트.
 *
 * "글로브 이용 브랜드 명단"(2,376건)의 각 브랜드에 대해 **자사 채용 홈페이지 / 그리팅HR /
 * 나인하이어**만 찾아 status·career_url·notes를 채운다. 사람인·잡코리아·원티드·코공고 같은
 * 제3자 채용 플랫폼은 크롤링 대상이 아니므로 후보로 삼지 않고 'excluded'로만 표시한다
 * (사용자 지시, 2026-07-30). 그리팅·나인하이어는 자사 채용 홈페이지를 호스팅해주는 서비스라
 * 자사 채용 페이지와 같은 취급이다.
 *
 * 판정 원칙 — 오탐을 막기 위해 자사 채용 페이지는 **그 브랜드의 공식 도메인에서 확인된 것만**
 * 인정한다:
 *   1) 검색 결과에서 `*.career.greetinghr.com` / `*.ninehire.site` 를 찾으면 회사 단위로
 *      발급되는 주소이므로 살아있는지 확인 후 채택.
 *   2) 검색 결과 중 루트 페이지의 <title>/og:site_name 에 브랜드명이 걸리는 호스트를
 *      "공식 홈페이지"로 확정하고, 그 홈페이지 HTML의 채용 관련 링크(→ 그리팅/나인하이어 포함)를
 *      따라간다. 링크가 없으면 흔한 채용 경로(/recruit, /careers ...)를 직접 두드린다.
 *   3) 그 외(구인 포털·아웃소싱·헤드헌팅·블로그)는 전부 버린다.
 *
 * 사용법:
 *   node scripts/research-career-pages.mjs                    # unresearched 전부
 *   node scripts/research-career-pages.mjs --limit 12 --dry    # 샘플 검증(DB 미기록)
 *   node scripts/research-career-pages.mjs --names 마녀공장,더샘
 *   node scripts/research-career-pages.mjs --redo not_found    # 특정 status 재조사
 *
 * 진행 상황은 stdout에 라인 단위로 흘린다(Monitor로 tail 하기 좋게):
 *   OK / MISS / PROGRESS / BLOCKED / FATAL / DONE 접두어 사용.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- env

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log("FATAL .env.local에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
}
const DRY = argv.includes("--dry");
const VERBOSE = argv.includes("--verbose");
const LIMIT = Number(arg("limit", 0)) || 0;
const CONCURRENCY = Number(arg("concurrency", 3)) || 3;
const REDO = arg("redo", null);
const ONLY_NAMES = (arg("names", "") || "").split(",").map((s) => s.trim()).filter(Boolean);

// ---------------------------------------------------------------- 상수

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// 제3자 채용 플랫폼·구인 포털·헤드헌팅·아웃소싱 → 크롤링 대상 아님. URL도 기록하지 않는다.
const JOB_BOARDS = [
  "saramin.co.kr", "jobkorea.co.kr", "wanted.co.kr", "incruit.co.kr", "jumpit.co.kr",
  "jobplanet.co.kr", "catch.co.kr", "work.go.kr", "work24.go.kr", "worknet.go.kr",
  "albamon.com", "alba.co.kr", "linkareer.com", "rocketpunch.com", "programmers.co.kr",
  "teamblind.com", "kreditjob.com", "jobsn.co.kr", "superookie.com", "jasoseol.com",
  "comento.kr", "peoplenjob.com", "hibrain.net", "jobaba.net", "job.co.kr",
  "indeed.com", "linkedin.com", "glassdoor.com", "jobis.co", "gojob.co.kr",
  "cogonggo.co", "midas-in.com", "wowjob.co.kr", "medijob.cc", "zighang.com",
  "rememberapp.co.kr", "remember.co.kr", "shopma.net", "ibkonejob.co.kr", "demoday.co.kr",
  "ejungle.co.kr", "happybada.co.kr", "kbstar.com", "fidelitypartners.co.kr",
  "jobtoday.co.kr", "goodjob.co.kr", "worknjob.com", "jobnjoy.com", "unicohr.com",
  "hrdkorea.or.kr", "kbiz.or.kr", "career.co.kr", "scout.co.kr", "wevity.com",
  "campuspick.com", "jobda.im", "blogspot.com", "wordpress.com", "kkunglove.com",
  "bzpp.co.kr", "loyalloadblog.co.kr",
];

// 회사 채용 채널로 볼 수 없는 잡음(뉴스/블로그/SNS/기업정보 DB/커머스) → 무시
const NOISE = [
  "naver.com", "naver.me", "daum.net", "kakao.com", "tistory.com", "brunch.co.kr",
  "medium.com", "youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.com",
  "twitter.com", "x.com", "threads.net", "tiktok.com", "pinterest.com", "wikipedia.org",
  "namu.wiki", "dart.fss.or.kr", "opendart.fss.or.kr", "thevc.kr", "nextunicorn.kr",
  "innoforest.co.kr", "google.com", "bing.com", "duckduckgo.com", "kftc.or.kr",
  "mk.co.kr", "hankyung.com", "chosun.com", "joins.com", "joongang.co.kr", "donga.com",
  "sedaily.com", "etnews.com", "newsis.com", "yna.co.kr", "khan.co.kr", "hani.co.kr",
  "news1.kr", "fnnews.com", "asiae.co.kr", "edaily.co.kr", "cosinkorea.com", "mt.co.kr",
  "beautynury.com", "thebk.co.kr", "cmn.co.kr", "issuemaker.kr", "wishket.com",
  "notefolio.net", "behance.net", "coupang.com", "smartstore.naver.com", "11st.co.kr",
  "gmarket.co.kr", "auction.co.kr", "ably.co.kr", "musinsa.com", "kurly.com",
  "amazon.com", "qoo10.jp", "aliexpress.com", "shopify.com", "cafe24.com", "imweb.me",
  "glowpick.com", "hwahae.co.kr", "ssgdfs.com", "lotteon.com", "shinsegaeduty.com",
  "nicebizinfo.com", "marketbz.com", "cosmorning.com", "udanax.org", "heraldcorp.com",
  "sktelecom.com", "daangn.com", "kmong.com", "sisajournal-e.com", "bloter.net",
];

const CAREER_HOST_PREFIX = /^(career|careers|recruit|recruits|recruiting|job|jobs|hr|people|talent|apply|hiring|joinus)[.-]/i;
const CAREER_PATH = /(recruit|career|jobs?|hiring|employ|인재|채용|입사|joinus|join-us|with-us)/i;
const CAREER_KEYWORD = /(채용|모집|입사|인재|지원하기|커리어|recruit|career|hiring|we are hiring|job description|주요업무|자격요건|우대사항)/i;
// 영문 법인명("Purcell")으로 2차 조사할 때 해외 동명 기업(영국 건축사무소 Purcell)을 걸러내려면
// 한국어 채용 표현이 있는지도 봐야 한다.
const CAREER_KEYWORD_KO = /(채용|모집|입사|인재|지원하기|커리어|주요업무|자격요건|우대사항)/;
const CAREER_LINK_TEXT = /(채용|인재|커리어|리크루|입사|人材|recruit|career|jobs?|hiring|join\s*us|we'?re hiring)/i;

// 자사 홈페이지에서 흔히 쓰는 채용 경로(공식 도메인을 확정했을 때만 시도)
const CAREER_PATHS = [
  "/recruit", "/careers", "/career", "/jobs", "/recruit.html", "/company/recruit",
];

// 검색 결과 HTML에 구조적으로 섞여 들어오는 잡음 호스트(네임스페이스·포털·기관)
// 검색 결과 페이지마다 항상 박혀 있는 자사 서비스·광고·표준 링크들. 특히 다음(Daum) SERP는
// 멜론·a9 같은 카카오 계열 링크를 상단에 고정 노출해서, 걸러내지 않으면 이들이 공식 홈페이지
// 후보 상위를 전부 차지해 실제 결과를 밀어낸다(실측: 이 때문에 적중률이 30%→2%로 떨어졌다).
const JUNK_HOSTS = [
  "w3.org", "schema.org", "navercorp.com", "nid.naver.com", "adcr.naver.com",
  "gstatic.com", "googleapis.com", "melon.com", "a9.com", "kakaocorp.com",
  "kakaopay.com", "kakaomobility.com", "daumcdn.net", "search.daum.net",
  "storage.live.com", "schemas.live.com", "live.com", "msn.com", "microsoft.com",
  "dcinside.com", "fmkorea.com", "clien.net", "ruliweb.com", "theqoo.net",
  "udiscovermusic.com", "zhihu.com", "daumcorp.com", "inven.co.kr", "theteams.kr",
];
const INSTITUTION_TLD = /\.(ac|or|go|re)\.kr$|\.(gov|edu)(\.[a-z]{2})?$/i;

const TLD_LABELS = new Set([
  "kr", "co", "com", "net", "org", "io", "site", "me", "shop", "store", "info", "biz",
  "app", "ai", "cc", "tv", "jp", "us", "gg", "or", "go", "ne", "pe", "re", "world", "global",
]);

// ---------------------------------------------------------------- util

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base) => base + Math.floor(Math.random() * base * 0.6);
const log = (s) => process.stdout.write(s + "\n");
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};
const hostIn = (host, list) => list.some((d) => host === d || host.endsWith("." + d));
/** career.manyo.co.kr → manyo (등록 가능 도메인 라벨) */
function sldOf(host) {
  const labels = host.split(".").filter(Boolean);
  while (labels.length > 1 && TLD_LABELS.has(labels[labels.length - 1])) labels.pop();
  return labels[labels.length - 1] || host;
}
const NAME_STOPWORD = /^(주식회사|㈜|주|코리아|korea|inc|co|ltd|corp|us|글로벌|global|공식|본사)$/i;
const NAME_SUFFIX = /(코스메틱스|코스메틱|코스메슈티컬|코스메|화장품|뷰티|비주얼|컴퍼니|코리아|글로벌|주식회사|그룹|랩스|스토어|공식몰|공식스토어)$/;

/**
 * 브랜드명 매칭 변형들. "브이티코스메틱" → [브이티코스메틱, 브이티],
 * "유앤유커뮤니케이션즈" → [유앤유커뮤니케이션즈], "라카코스메틱스" → [라카코스메틱스, 라카].
 * 사이트 제목이 브랜드 약칭만 쓰는 경우(vt-cosmetics.com → "브이티 공식 웹사이트")를 잡기 위함.
 */
function nameVariants(brandName) {
  const cleaned = brandName.replace(/\([^)]*\)/g, " ").replace(/[·,]/g, " ").trim();
  const set = new Set();
  const add = (s) => {
    const t = (s || "").replace(/\s+/g, "");
    if (t.length >= 2) set.add(t.toLowerCase());
  };
  add(cleaned);
  for (const t of cleaned.split(/\s+/)) if (!NAME_STOPWORD.test(t)) add(t);
  let base = cleaned.replace(/\s+/g, "");
  for (let i = 0; i < 3; i++) {
    const next = base.replace(NAME_SUFFIX, "");
    if (next === base || next.length < 2) break;
    base = next;
    add(base);
  }
  return [...set];
}

/** haystack(제목·본문 등)에 브랜드/법인명이 들어있는지. 공백 무시, 대소문자 무시. */
function matchesName(haystack, names) {
  const hay = (haystack || "").replace(/\s+/g, "").toLowerCase();
  if (!hay) return false;
  return names.some((n) => nameVariants(n).some((v) => hay.includes(v)));
}

// 법인명이 적혀 있을 확률이 높은 페이지들(전자상거래법상 사업자정보 고지 의무 때문에
// 카페24/아임웹 몰도 이용약관·회사소개 페이지에는 상호를 정적 HTML로 노출하는 경우가 많다).
const COMPANY_INFO_PATHS = [
  "/shopinfo/company.html", "/shopinfo/guide.html", "/member/agreement.html",
  "/terms", "/policy", "/privacy", "/company", "/about", "/board/terms",
];

// 법인명으로 오인하기 쉬운 일반 단어들. "ⓒ Copyright ..." 푸터에서 "Copyright"를 상호로 뽑아
// copyright.com을 조사하러 가는 사고가 실제로 있었다.
const COMPANY_STOP =
  /^(주식회사|㈜|유한회사|사업자|대표자?|정보|안내|없음|호스팅|서비스|고객센터|이용약관|개인정보|쇼핑몰|브랜드|http|www|kr|com|copyright|all|rights|reserved|company|corporation|corp|group|inc|ltd|llc|by|the|and|design|powered|brand|brands|shop|store|mall|market|official|home|main|online|global|beauty|cosmetic|cosmetics|skin|care|style|life|world|korea|new|best|top|event|notice|login|join|cart|order|review|product|products)$/i;

/**
 * 한국 쇼핑몰/기업 사이트에서 법인 상호를 뽑는다(브랜드명 ≠ 법인명 대응).
 * 예: 마데카프라임 → 동국제약, 쿤달 → 더스킨팩토리, 에스네이처 → (삼표가 아니라) 에스네이처 법인.
 */
function extractCompanyName(plain) {
  const text = plain.replace(/\s+/g, " ");
  const pats = [
    // 주의: "사업자등록번호" 앞 단어를 잡으면 대표자 이름(라카 → "이지철")이 섞이므로 쓰지 않는다.
    /(?:상호명|상\s?호|회사명|법인명|사업자명|기업명)\s*[:：]?\s*([^:：|]{2,30}?)\s*(?:대표|사업자|주소|전화|통신판매|이메일|개인정보|호스팅|팩스|고객|$)/,
    /company\s*(?:name)?\s*[:：]\s*([^:：|]{2,40}?)\s*(?:ceo|address|tel|business|$)/i,
    /(?:©|ⓒ|copyright)\s*(?:20\d\d(?:\s*[-–]\s*20\d\d)?)?\s*(?:by\s*)?([A-Za-z가-힣0-9&.\-]{2,25})/i,
  ];
  for (const p of pats) {
    // 같은 패턴이 여러 번 걸릴 수 있어(푸터 반복) 전부 훑고 첫 유효값을 쓴다
    const re = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    let m;
    while ((m = re.exec(text))) {
      const v = m[1]
        .replace(/\(주\)|\(유\)|주식회사|㈜|유한회사|co\.,?\s*ltd\.?|inc\.?/gi, " ")
        .replace(/[.,·|/]+$/, "")
        .replace(/\s+/g, " ")
        .trim();
      if (v.length < 2 || v.length > 25) continue;
      if (/^[0-9\-]+$/.test(v) || COMPANY_STOP.test(v)) continue;
      if (v.split(/\s+/).some((w) => COMPANY_STOP.test(w)) && v.split(/\s+/).length <= 2) continue;
      return v;
    }
  }
  return null;
}

/**
 * 공식 도메인에서 법인명을 찾아낸다. 홈페이지 정적 HTML에 없으면
 * 이용약관·회사소개 등 사업자정보 고지 페이지를 뒤진다.
 */
async function resolveCompanyName(host, names, fromRoot) {
  if (fromRoot) return fromRoot;
  const paths = COMPANY_INFO_PATHS.slice(0, 4);
  const results = await Promise.all(paths.map((p) => inspect(`https://${host}${p}`, names)));
  for (const v of results) if (v.ok && v.companyName) return v.companyName; // 경로 우선순위 유지
  return null;
}

/**
 * 후보들을 배치 단위로 **병렬** 확인하고, 성공한 것 중 원래 순서상 가장 앞선 것을 돌려준다.
 * 검색은 전역 큐로 직렬화되지만 페이지 확인 fetch는 대상 도메인이 달라 병렬로 돌려도 안전하다
 * — 브랜드당 최대 20회를 순차로 돌리던 것이 실제 병목이었다.
 */
async function firstHit(items, fn, batch = 3) {
  for (let i = 0; i < items.length; i += batch) {
    const results = await Promise.all(items.slice(i, i + batch).map((it) => fn(it)));
    const hit = results.find((r) => r && r.hit);
    if (hit) return hit;
  }
  return null;
}

async function get(url, timeoutMs = 14000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: ac.signal,
    });
    const text = await res.text();
    return { status: res.status, text, finalUrl: res.url || url };
  } catch (e) {
    return { status: 0, text: "", finalUrl: url, error: String(e).slice(0, 100) };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- 검색

function extractLinks(html) {
  const urls = [];
  const seen = new Set();
  const re = /https?:\/\/[^\s"'<>\\)]+/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[0].replace(/&amp;/g, "&").replace(/[.,)\]}'"]+$/, "");
    if (u.length > 300) continue;
    if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|mp4|json|xml)(\?|$)/i.test(u)) continue;
    const host = hostOf(u);
    if (!host || host.includes("pstatic.net") || host.includes("naver.net")) continue;
    if (host.includes("daumcdn.net") || host.includes("kakaocdn.net") || host.includes("kakaoi.ai")) continue;
    const key = u.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(u);
  }
  return urls;
}

function isBlocked(res) {
  if (res.status === 429 || res.status === 403 || res.status === 0) return true;
  return /captcha|자동입력\s*방지|비정상적인 접근|Access Denied/i.test(res.text.slice(0, 4000));
}

/**
 * 검색 엔진별 상태. 한 엔진 안에서는 동시 요청이 곧 403이라 직렬 큐 + 최소 간격을 지키고,
 * **엔진끼리는 레이트리밋이 독립적이라 병렬로 던진다** — 이게 이 스크립트에서 실제로 가능한
 * 유일한 검색 병렬화다. 403을 맞은 엔진은 쿨다운 동안 아예 건너뛴다(매 브랜드마다 재시도하면
 * 차단이 계속 갱신되고 전체가 멈춘다 — 실측으로 확인됨).
 */
const ENGINES = {
  naver: {
    // 8워커 × 브랜드당 2질의로 분당 50회를 넘기면 네이버가 IP를 길게 차단한다(실측: 250건쯤에서
    // 30분 쿨다운 반복). 조사 품질이 네이버에 달려 있으므로 느리더라도 지속 가능한 간격을 쓴다.
    // --gap 으로 조절한다. 2.5초로는 50~100건마다 30분 차단이 걸려 실질 처리량이 오히려 낮았다.
    gap: Number(arg("gap", 2500)) || 2500,
    url: (q) => "https://search.naver.com/search.naver?where=web&query=" + encodeURIComponent(q),
  },
  daum: { gap: 900, url: (q) => "https://search.daum.net/search?q=" + encodeURIComponent(q) },
  // 빙은 제외 — 한국어 브랜드 질의에 무관한 결과(구글 맵 지원 문서 등)를 돌려주고 결과 URL도
  // ck/a 리다이렉트로 감싸서, 파싱해봐도 조사 품질에 도움이 되지 않는 것을 실측으로 확인했다.
};
const engineState = Object.fromEntries(
  Object.keys(ENGINES).map((k) => [k, { chain: Promise.resolve(), lastAt: 0, cooldownUntil: 0, strikes: 0 }])
);
const COOLDOWN_STEPS = [5 * 60_000, 15 * 60_000, 30 * 60_000];


// 검색 요청은 **전역 큐로 직렬화하고 최소 간격을 지킨다**. 워커를 여러 개 돌리면 검색이 동시에
// 몰려 403을 맞고, 백오프가 끝나는 순간 워커들이 또 동시에 재시도해 서로를 계속 차단시키는
// 루프에 빠진다(실측: 이 루프에서 10분간 처리 0건). 페이지 확인 fetch는 대상 도메인이 달라
// 병렬로 둬도 문제 없으므로 검색만 직렬화한다.
/** 한 엔진의 직렬 큐를 타고 검색을 던진다(엔진별 최소 간격 유지). */
function queuedFetch(key, query) {
  const st = engineState[key];
  const run = async () => {
    const gap = ENGINES[key].gap - (Date.now() - st.lastAt);
    if (gap > 0) await wait(gap + Math.floor(Math.random() * 300));
    st.lastAt = Date.now();
    const res = await get(ENGINES[key].url(query));
    return { blocked: isBlocked(res), links: extractLinks(res.text), status: res.status };
  };
  const p = st.chain.then(run, run);
  st.chain = p.then(
    () => {},
    () => {}
  );
  return p;
}

async function askEngine(key, query) {
  const st = engineState[key];
  if (Date.now() < st.cooldownUntil) return { key, links: [], skipped: true };
  const r = await queuedFetch(key, query);
  if (r.blocked || !r.links.length) {
    if (r.blocked) {
      const step = COOLDOWN_STEPS[Math.min(st.strikes, COOLDOWN_STEPS.length - 1)];
      st.strikes++;
      st.cooldownUntil = Date.now() + step;
      log(`BLOCKED ${key} 차단(status=${r.status}) → ${Math.round(step / 60000)}분 쿨다운(이 엔진 건너뜀)`);
    }
    return { key, links: [] };
  }
  st.strikes = Math.max(0, st.strikes - 1);
  return { key, links: r.links };
}

/** 살아있는 엔진들에 **동시에** 질의하고 결과를 번갈아 병합한다. */
async function search(query) {
  const keys = Object.keys(ENGINES).filter((k) => Date.now() >= engineState[k].cooldownUntil);
  if (!keys.length) {
    const soonest = Math.min(...Object.values(engineState).map((s) => s.cooldownUntil));
    const waitMs = Math.min(60_000, Math.max(1_000, soonest - Date.now()));
    await wait(waitMs);
    return { engine: "none", links: [] };
  }
  const results = (await Promise.all(keys.map((k) => askEngine(k, query)))).filter((r) => r.links.length);
  if (!results.length) return { engine: "none", links: [] };
  // 엔진 신뢰도 순으로 이어붙인다(라운드로빈으로 섞으면 품질 낮은 엔진의 상단 결과가
  // 네이버의 진짜 결과를 밀어낸다). 다음(Daum)은 네이버가 못 찾은 꼬리를 보태는 역할.
  const order = Object.keys(ENGINES);
  results.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const merged = [];
  const seen = new Set();
  for (const r of results) {
    for (const u of r.links) {
      const key = u.replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(u);
    }
  }
  return { engine: results.map((r) => r.key).join("+"), links: merged };
}

// ---------------------------------------------------------------- 페이지 판정

function classifyHost(host) {
  if (!host) return "drop";
  if (host.endsWith("career.greetinghr.com")) return "greetinghr";
  if (host.endsWith("ninehire.site")) return "ninehire";
  if (host === "greetinghr.com" || host === "ninehire.com" || host.endsWith(".ninehire.com")) return "drop";
  if (hostIn(host, JOB_BOARDS) || hostIn(host, NOISE)) return "drop";
  if (hostIn(host, JUNK_HOSTS) || INSTITUTION_TLD.test(host)) return "drop";
  return "own";
}

/** URL을 열어 채용 페이지 여부·브랜드 소유 여부를 판정한다. names는 [브랜드명, (법인명)] */
async function inspect(url, names) {
  let res = await get(url);
  if (res.status === 0 || res.status >= 500) {
    await wait(700);
    res = await get(url); // 일시적 네트워크/TLS 오류 1회 재시도
  }
  if (res.status === 0) return { ok: false, note: `확인실패(${res.error || "no response"})` };
  if (res.status >= 400) return { ok: false, note: `확인실패(HTTP ${res.status})` };
  const body = res.text;
  const plain = body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const careerHit = CAREER_KEYWORD.test(plain.slice(0, 25000)) || CAREER_KEYWORD.test(body.slice(0, 8000));
  const title = (body.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
  const ogSite = body.match(/property=["']og:site_name["'][^>]*content=["']([^"']{0,120})["']/i)?.[1] || "";
  const ogTitle = body.match(/property=["']og:title["'][^>]*content=["']([^"']{0,200})["']/i)?.[1] || "";
  const desc = body.match(/name=["']description["'][^>]*content=["']([^"']{0,300})["']/i)?.[1] || "";
  const host = hostOf(res.finalUrl || url);
  const header = `${title} ${ogSite} ${ogTitle} ${desc} ${host}`;
  return {
    ok: true,
    status: res.status,
    body,
    plain,
    title: title.slice(0, 70),
    careerHit,
    careerHitKo: CAREER_KEYWORD_KO.test(plain.slice(0, 25000)) || CAREER_KEYWORD_KO.test(body.slice(0, 8000)),
    strongHit: matchesName(header, names),
    bodyHit: matchesName(plain.slice(0, 40000), names),
    companyName: extractCompanyName(plain.slice(0, 60000)),
    finalUrl: res.finalUrl,
    note: `HTTP ${res.status}`,
  };
}

/** 공식 홈페이지 HTML에서 채용 관련 링크를 뽑는다(그리팅/나인하이어 링크 포함). */
function careerLinksFrom(html, baseUrl) {
  const out = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1].replace(/&amp;/g, "&");
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    let abs;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    const host = hostOf(abs);
    const kind = classifyHost(host);
    if (kind === "drop") continue;
    let pathname = "/";
    try {
      pathname = decodeURIComponent(new URL(abs).pathname + new URL(abs).search);
    } catch {}
    const hit =
      kind === "greetinghr" || kind === "ninehire" || CAREER_PATH.test(pathname) || CAREER_LINK_TEXT.test(text);
    if (!hit) continue;
    const score =
      kind === "greetinghr" ? 100 : kind === "ninehire" ? 95 : CAREER_LINK_TEXT.test(text) ? 80 : 70;
    out.push({ kind: kind === "own" ? "own_site" : kind, url: abs, score, via: text.slice(0, 30) });
  }
  const byUrl = new Map();
  for (const c of out) if (!byUrl.has(c.url)) byUrl.set(c.url, c);
  return [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}

// ---------------------------------------------------------------- Supabase

async function fetchTargets() {
  const status = REDO || "unresearched";
  const all = [];
  let from = 0;
  while (true) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/crawl_candidate_brands?select=id,name,list_rank,status&status=eq.${status}&order=list_rank.asc`,
      { headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, Range: `${from}-${from + 999}` } }
    );
    const d = await r.json();
    if (!Array.isArray(d) || d.length === 0) break;
    all.push(...d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function saveRow(row, patch) {
  if (DRY) return true;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/crawl_candidate_brands?id=eq.${row.id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ...patch, researched_at: new Date().toISOString() }),
    });
    if (res.status >= 200 && res.status < 300) return true;
    await wait(1200 * (attempt + 1));
  }
  log(`FATAL DB 저장 실패: ${row.name}`);
  return false;
}

// ---------------------------------------------------------------- 브랜드 1건 조사

/**
 * 이름 하나(브랜드명 또는 법인명)로 채용 채널을 찾아본다.
 * @returns {{result: object|null, officialHost: string|null, companyName: string|null,
 *            tried: string[], sawJobBoard: boolean, engine: string}}
 */
async function probe(queryName, names, label) {
  const tried = [];
  let engine = "none";
  let sawJobBoard = false;
  let officialHost = null;
  let officialChecked = 0;
  let companyName = null;
  const atsCands = [];
  const siteHits = new Map(); // 공식 홈페이지 후보 호스트 → {count, order}
  const tag = label ? `${label} ` : "";
  // 영문 법인명으로 조사할 때는 한국어 채용 표현까지 요구해 해외 동명 기업을 배제한다
  // (퍼셀 → 영국 건축사무소 Purcell careers 페이지가 잡히던 문제).
  const asciiQuery = !/[가-힣]/.test(queryName);
  const careerOk = (v) => v.ok && v.careerHit && (!asciiQuery || v.careerHitKo);

  // --- 1) 검색으로 후보 수집. "공식 홈페이지" 질의는 반드시 같이 던진다 — "OO 채용" 질의만으로는
  // 기업 홈페이지가 상위에 안 잡히는 경우가 많다(동국제약 dkpharm.co.kr이 이 질의에서만 나왔다).
  // 검색이 직렬 큐를 타므로 비용은 크지만, 브랜드↔법인 연결 정확도가 이 조사의 핵심이다.
  for (const q of [`${queryName} 채용`, `${queryName} 공식 홈페이지`]) {
    if (q.endsWith("공식 홈페이지") && atsCands.length) break; // ATS를 이미 찾았으면 불필요
    const { engine: e, links } = await search(q);
    if (engine === "none" && e !== "none") engine = e;
    links.forEach((u, i) => {
      const host = hostOf(u);
      const kind = classifyHost(host);
      if (kind === "drop") {
        if (hostIn(host, JOB_BOARDS)) sawJobBoard = true;
        return;
      }
      if (kind === "greetinghr" || kind === "ninehire") {
        if (!atsCands.some((c) => hostOf(c.url) === host)) atsCands.push({ kind, url: `https://${host}/` });
        return;
      }
      if (aggregatorIsh(host)) {
        sawJobBoard = true;
        return;
      }
      const prev = siteHits.get(host);
      if (prev) prev.count++;
      else siteHits.set(host, { count: 1, order: siteHits.size * 100 + i });
    });
    if (atsCands.length) break; // ATS를 찾았으면 추가 검색 불필요
    await wait(jitter(600));
  }

  // 여러 번 등장한 호스트가 공식 홈페이지일 가능성이 높다.
  const siteCands = [...siteHits.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].order - b[1].order)
    .map(([host]) => host);

  // --- 2) 그리팅/나인하이어 확인.
  // 회사 단위 서브도메인이지만 검색 결과에 엉뚱한 회사가 섞이므로(예: "에스네이처 채용" →
  // sampyo.career.greetinghr.com = 삼표) 페이지에 브랜드/법인명이 실제로 등장할 때만 채택한다.
  for (const cand of atsCands.slice(0, 3)) {
    const v = await inspect(cand.url, names);
    // 이름이 안 걸려도, 그 ATS 서브도메인과 같은 계열 도메인이 같은 검색 결과에 함께 등장하면
    // 그 브랜드의 모회사 채용 페이지로 본다(웰라쥬 → hugel.career.greetinghr.com + hugel-inc.com).
    const slug = hostOf(cand.url).split(".")[0];
    const corroborated =
      slug.length >= 4 &&
      siteCands.some((h) => {
        const s = sldOf(h);
        return s === slug || (s.length >= 4 && (s.startsWith(slug) || slug.startsWith(s)));
      });
    tried.push(`${cand.url}[${v.note || "실패"}${v.ok && !v.strongHit && !v.bodyHit ? ",이름X" : ""}]`);
    if (careerOk(v) && (v.strongHit || v.bodyHit || corroborated)) {
      return {
        result: {
          status: cand.kind,
          career_url: cand.url,
          notes:
            `${tag}자동조사(${engine}) ${v.note} 이름일치${v.strongHit ? "O(제목)" : v.bodyHit ? "△(본문)" : `X·계열도메인 ${slug} 일치 ※검수필요`}` +
            (v.title ? ` | ${v.title}` : ""),
        },
        officialHost,
        companyName,
        tried,
        sawJobBoard,
        engine,
      };
    }
    await wait(jitter(300));
  }

  // --- 3) 공식 홈페이지를 확정하고 그 안의 채용 링크를 따라간다
  for (const host of siteCands.slice(0, 5)) {
    const root = await inspect(`https://${host}/`, names);
    if (!root.ok) {
      tried.push(`${host}[루트확인실패]`);
      continue;
    }
    if (!root.strongHit) {
      tried.push(`${host}[이름X:${root.title || "제목없음"}]`);
      continue; // 그 브랜드/법인의 공식 홈페이지가 아님
    }
    officialHost = host;
    companyName = root.companyName || companyName;

    const links = careerLinksFrom(root.body, root.finalUrl || `https://${host}/`);
    // 공식 홈페이지에 걸린 링크라도 외부 도메인이면 이름이 걸릴 때만 인정한다
    // (홈페이지 하단의 copyright.com 같은 무관한 "careers" 링크를 걸러내기 위함).
    const linkHit = await firstHit(links, async (cand) => {
      const v = await inspect(cand.url, names);
      tried.push(`${cand.url}[${v.note || "실패"}]`);
      const sameDomain = sldOf(hostOf(cand.url)) === sldOf(host);
      const trustable = sameDomain || cand.kind !== "own_site" || v.strongHit || v.bodyHit;
      return { hit: careerOk(v) && trustable, cand, v };
    });
    if (linkHit) {
      const { cand, v } = linkHit;
      return {
        result: {
          status: cand.kind,
          career_url: cand.url,
          notes: `${tag}자동조사(${engine}+공식홈링크"${cand.via}") ${v.note} 공식도메인 ${host}` + (v.title ? ` | ${v.title}` : ""),
        },
        officialHost,
        companyName,
        tried,
        sawJobBoard,
        engine,
      };
    }

    // 공식 도메인 이름으로 그리팅·나인하이어 서브도메인을 추정해본다(medipeel.co.kr → medipeel.ninehire.site)
    const slug = sldOf(host);
    const guessHit = await firstHit(
      [
        { kind: "greetinghr", url: `https://${slug}.career.greetinghr.com/` },
        { kind: "ninehire", url: `https://${slug}.ninehire.site/` },
      ],
      async (guess) => {
        const v = await inspect(guess.url, names);
        return { hit: careerOk(v) && (v.strongHit || v.bodyHit), guess, v };
      },
      2
    );
    if (guessHit) {
      const { guess, v } = guessHit;
      return {
        result: {
          status: guess.kind,
          career_url: guess.url,
          notes: `${tag}자동조사(${engine}+슬러그추정 ${slug}) ${v.note} 공식도메인 ${host}` + (v.title ? ` | ${v.title}` : ""),
        },
        officialHost,
        companyName,
        tried,
        sawJobBoard,
        engine,
      };
    }

    // 홈페이지에 채용 링크가 없으면 흔한 채용 경로를 직접 두드려본다
    const pathHit = await firstHit(CAREER_PATHS, async (p) => {
      const v = await inspect(`https://${host}${p}`, names);
      return { hit: careerOk(v) && (v.strongHit || v.bodyHit), url: `https://${host}${p}`, v };
    });
    if (pathHit) {
      {
        const { url, v } = pathHit;
        return {
          result: {
            status: "own_site",
            career_url: url,
            notes: `${tag}자동조사(${engine}+경로탐색) ${v.note} 공식도메인 ${host}` + (v.title ? ` | ${v.title}` : ""),
          },
          officialHost,
          companyName,
          tried,
          sawJobBoard,
          engine,
        };
      }
    }
    // 자사 채용 페이지가 없다면 법인명을 확보해 2차 조사로 넘긴다
    // (브랜드는 브랜드몰만 운영하고 채용은 법인 이름으로 여는 경우가 대다수)
    const resolved = await resolveCompanyName(host, names, root.companyName);
    if (resolved && !companyName) companyName = resolved;
    tried.push(`${host}[공식홈확인·채용페이지없음${resolved ? `,법인 ${resolved}` : ",법인명확인실패"}]`);
    // 브랜드몰과 기업 홈페이지가 따로 있는 경우가 많아 공식 도메인은 최대 2개까지 본다.
    if (++officialChecked >= 2) break;
  }

  return { result: null, officialHost, companyName, tried, sawJobBoard, engine };
}

async function research(row) {
  const names = [row.name];
  const pass1 = await probe(row.name, names, "");
  if (pass1.result) return pass1.result;

  // 검색 엔진이 통째로 막혀 결과가 0건이면 "채용 페이지 없음"이 아니라 **판정 불가**다.
  // 이때 not_found로 기록하면 거짓 음성이 DB에 남으므로 건드리지 않고 넘긴다(재실행 시 다시 집어감).
  if (pass1.engine === "none" && !pass1.officialHost && !pass1.sawJobBoard) {
    return { skip: true };
  }

  // 브랜드명으로 못 찾으면 공식몰 푸터의 법인 상호로 한 번 더 조사한다
  // (예: 마데카프라임 → 동국제약, 바닐라코 → 에프앤코 처럼 채용은 법인 이름으로 열린다)
  const company = pass1.companyName;
  let pass2 = null;
  if (company && !matchesName(company, names) && company !== row.name) {
    names.push(company);
    pass2 = await probe(company, names, `[법인명 ${company}]`);
    if (pass2.result) return pass2.result;
  }

  const officialHost = pass1.officialHost || pass2?.officialHost || null;
  const sawJobBoard = pass1.sawJobBoard || pass2?.sawJobBoard || false;
  const engine = pass1.engine;
  const tried = [...pass1.tried, ...(pass2?.tried || [])];
  const head = officialHost
    ? `자동조사(${engine}): 공식 홈페이지 ${officialHost} 확인 — 자사 채용 페이지 없음`
    : `자동조사(${engine}): 자사 채용 페이지·그리팅·나인하이어 미발견`;
  return {
    status: sawJobBoard ? "excluded" : "not_found",
    career_url: null,
    notes:
      head +
      (company ? ` | 법인명 추정 ${company}` : "") +
      (sawJobBoard ? " | 외부 채용 플랫폼만 확인(크롤링 대상 아님)" : "") +
      (tried.length ? ` | 확인: ${tried.slice(0, 6).join(" ; ")}` : ""),
  };
}

/** 도메인 이름 자체가 구인 서비스로 보이면 자사 홈페이지 후보에서 뺀다. */
function aggregatorIsh(host) {
  const sld = sldOf(host);
  if (/(job|recruit|hire|alba|scout|saram|employ|headhunt|hrcap|incruit)/i.test(sld)) return true;
  const sub = host.slice(0, host.length - sld.length);
  return /(goodjob|onejob|jobcenter|jobfair)/i.test(sub);
}


/** 도메인 이름 자체가 구인 서비스로 보이면 자사 홈페이지 후보에서 뺀다. */
function AGGREGATOR_ISH(host) {
  const sld = sldOf(host);
  if (/(job|recruit|hire|alba|scout|saram|employ|headhunt|hrcap|incruit)/i.test(sld)) return true;
  const sub = host.slice(0, host.length - sld.length);
  return /(goodjob|onejob|jobcenter|jobfair)/i.test(sub);
}

// ---------------------------------------------------------------- main

/**
 * 네이버가 살아날 때까지 기다린다. 다음(Daum)만으로도 돌아가긴 하지만 한국 브랜드의 공식
 * 홈페이지·그리팅·나인하이어를 찾는 재현율이 확연히 떨어져(실측: 마데카프라임·아이레놀 모두
 * 놓침) 품질이 균일하지 않은 결과가 DB에 섞이는 걸 막는 편이 낫다.
 */
async function waitForNaver(maxWaitMs = 25 * 60_000) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const r = await queuedFetch("naver", "테스트 채용");
    if (!r.blocked && r.links.length) {
      engineState.naver.cooldownUntil = 0;
      engineState.naver.strikes = 0;
      log(`READY 네이버 검색 정상 (대기 ${Math.round((Date.now() - started) / 60000)}분)`);
      return true;
    }
    log(`WAIT 네이버 차단 상태(status=${r.status}) — 60초 후 재확인 (경과 ${Math.round((Date.now() - started) / 60000)}분)`);
    await wait(60_000);
  }
  log("WAIT 네이버가 계속 막혀 있어 다음(Daum) 단독으로 진행합니다 — 재현율 저하 가능(notes의 엔진 표기로 재조사 가능)");
  return false;
}

async function main() {
  if (!argv.includes("--no-wait")) await waitForNaver();
  let targets = await fetchTargets();
  if (ONLY_NAMES.length) targets = targets.filter((t) => ONLY_NAMES.includes(t.name));
  if (LIMIT) targets = targets.slice(0, LIMIT);
  log(`START 대상 ${targets.length}건 (concurrency=${CONCURRENCY}${DRY ? ", DRY-RUN" : ""})`);

  const counts = {};
  let done = 0;
  let skipped = 0;
  let waitLogAt = 0;
  let cursor = 0;
  const started = Date.now();

  async function worker() {
    while (cursor < targets.length) {
      // 네이버가 쿨다운이면 **다음(Daum) 단독으로 진행하지 않고 기다린다**. 다음만으로는
      // 자사 채용 페이지 재현율이 확연히 낮아(마데카프라임·아이레놀 모두 놓침) 거짓 음성이
      // 대량으로 DB에 남는다 — 느려지는 것보다 그게 더 나쁘다.
      while (!argv.includes("--no-wait") && Date.now() < engineState.naver.cooldownUntil) {
        const left = Math.ceil((engineState.naver.cooldownUntil - Date.now()) / 60000);
        if (waitLogAt < Date.now() - 60_000) {
          waitLogAt = Date.now();
          log(`WAIT 네이버 쿨다운 ${left}분 남음 — 품질 유지를 위해 대기(다음 단독 진행 안 함)`);
        }
        await wait(30_000);
        if (Date.now() >= engineState.naver.cooldownUntil) await waitForNaver(10 * 60_000);
      }
      const row = targets[cursor++];
      let result;
      try {
        result = await research(row);
      } catch (e) {
        result = { status: "not_found", career_url: null, notes: `자동조사 오류: ${String(e).slice(0, 200)}` };
        log(`FATAL ${row.name} 조사 중 예외: ${String(e).slice(0, 160)}`);
      }
      if (result.skip) {
        skipped++;
        log(`SKIP [${done}/${targets.length}] ${row.name} → 검색 차단으로 판정 불가(미조사 유지)`);
        await wait(jitter(2000));
        continue;
      }
      await saveRow(row, result);
      counts[result.status] = (counts[result.status] || 0) + 1;
      done++;
      log(
        `${result.career_url ? "OK  " : "MISS"} [${done}/${targets.length}] ${row.name} → ${result.status} ` +
          (result.career_url || "") +
          (VERBOSE ? ` :: ${result.notes}` : "")
      );
      if (done % 50 === 0) {
        const elapsedMin = (Date.now() - started) / 60000;
        const eta = ((targets.length - done) / (done / elapsedMin)).toFixed(0);
        log(
          `PROGRESS ${done}/${targets.length} (${elapsedMin.toFixed(1)}분 경과, 남은시간 약 ${eta}분) ` +
            Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ")
        );
      }
      await wait(jitter(400));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  log(
    `DONE ${done}/${targets.length} 완료 (${((Date.now() - started) / 60000).toFixed(1)}분) ` +
      Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ") +
      (skipped ? ` | 검색차단으로 판정보류 ${skipped}건(재실행 필요)` : "")
  );
}

main().catch((e) => {
  log("FATAL " + String(e));
  process.exit(1);
});
