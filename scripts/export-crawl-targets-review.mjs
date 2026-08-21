/**
 * 크롤링 대상 검수용 목록을 CSV로 뽑는다(사람이 확인한 뒤 크롤링을 붙이기 위한 중간 산출물).
 *
 * 자동 조사만으로는 정밀도가 안 나온다는 게 2026-07-30 검수에서 확인됐다 — 잘못된 회사에
 * 붙거나(뷰→fastview), 공고가 없는 인재상 페이지가 대상에 들어갔다. 그래서 각 대상에
 * **실제 운영 회사명**과 **확인된 공고 수**를 붙여, 사람이 한 줄씩 O/X만 남기면 되게 한다.
 *
 * 사용법: node scripts/export-crawl-targets-review.mjs [출력경로.csv]
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const OUT = process.argv[2] ?? path.join(ROOT, "..", "..", "Downloads", "크롤링대상_검수.csv");

const LABEL = { greetinghr: "그리팅", ninehire: "나인하이어", own_site: "자사 홈페이지" };
const POSTING_HREF = /(view|detail|read|\/o\/|recruit\?|wr_id=|idx=|no=\d|seq=|bbsIdx|jobId|position)/i;

const norm = (s) => (s || "").replace(/[\s()㈜]|주식회사/g, "").toLowerCase();
const decode = (s) =>
  (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

async function getText(url, timeoutMs = 14000) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function rawTitleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]{0,120}?)<\/title>/i);
  return decode((m?.[1] ?? "").replace(/\s+/g, " ").trim());
}

/**
 * 페이지에서 **회사명**을 뽑는다.
 *
 * <title>만 쓰면 "생각하는 아름다움의 가치가 깃든 웰니스…"처럼 마케팅 문구나 엉뚱한 페이지
 * 제목이 들어와 검수에 도움이 안 된다(2026-07-30 지적). 회사명이 실제로 적혀 있을 가능성이
 * 높은 순서로 본다:
 *   1) 푸터 사업자정보의 "상호"  — 한국 사이트에서 가장 확실
 *   2) JSON-LD Organization.name
 *   3) og:site_name            — 보통 사이트(=회사) 이름
 *   4) <title>을 구분자로 쪼갠 뒤 짧은 토막(설명문보다 회사명일 확률이 높다)
 */
function pageCompany(html) {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const biz = plain.match(
    /(?:상호명|상\s?호|회사명|법인명|사업자명)\s*[:：]?\s*([^:：|]{2,25}?)\s*(?:대표|사업자|주소|전화|통신판매|이메일|개인정보|호스팅|팩스|$)/
  )?.[1];
  if (biz) {
    const v = decode(biz).replace(/\(주\)|주식회사|㈜/g, "").trim();
    if (v.length >= 2) return v;
  }

  const ld = html.match(
    /"@type"\s*:\s*"Organization"[\s\S]{0,200}?"name"\s*:\s*"([^"]{2,40})"/
  )?.[1];
  if (ld) return decode(ld).trim();

  const site = html.match(
    /property=["']og:site_name["'][^>]*content=["']([^"']{2,40})["']/i
  )?.[1];
  if (site) return decode(site).trim();

  const title = rawTitleOf(html);
  if (!title) return "";
  const parts = title
    .split(/\s*[|｜·–—]\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
  const best = parts.length > 1 ? parts.reduce((a, b) => (a.length <= b.length ? a : b)) : title;
  return best
    .replace(/\s*(채용|커리어|career|채용\s*홈페이지|채용사이트|공식몰|공식\s*홈페이지)\s*$/i, "")
    .trim();
}

async function inspectGreeting(url) {
  const host = new URL(url).host;
  const html = await getText(`https://${host}/`);
  if (!html) return { company: "(접속 실패)", rawTitle: "", count: null, verdict: "확인 실패" };
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  let count = null;
  if (nd) {
    try {
      const queries = JSON.parse(nd[1])?.props?.pageProps?.dehydratedState?.queries ?? [];
      const q = queries.find((x) => JSON.stringify(x.queryKey) === '["openings"]');
      count = Array.isArray(q?.state?.data) ? q.state.data.length : null;
    } catch {}
  }
  return {
    company: pageCompany(html) || "(회사명 못 찾음)",
    rawTitle: rawTitleOf(html),
    count,
    verdict: count ? `공고 ${count}건 확인` : "공고 0건",
  };
}

async function inspectNinehire(url) {
  const host = new URL(url).host;
  const html = await getText(`https://${host}/`);
  if (!html) return { company: "(접속 실패)", rawTitle: "", count: null, verdict: "확인 실패" };
  const companyId = html.match(/"companyId":"([0-9a-f-]{20,})"/)?.[1];
  let count = null;
  if (companyId) {
    const json = await getText(
      `https://api.ninehire.com/identity-access/homepage/recruitments?companyId=${companyId}&page=1&countPerPage=100`
    );
    try {
      const results = JSON.parse(json ?? "{}").results ?? [];
      count = results.filter((r) => r.status === "in_progress").length;
    } catch {}
  }
  return {
    company: pageCompany(html) || "(회사명 못 찾음)",
    rawTitle: rawTitleOf(html),
    count,
    verdict: count ? `공고 ${count}건 확인` : "공고 0건",
  };
}

async function inspectOwnSite(url) {
  const html = await getText(url);
  if (!html) return { company: "(접속 실패)", rawTitle: "", count: null, verdict: "확인 실패" };
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)];
  const links = anchors.filter(([, href, text]) => {
    const label = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return POSTING_HREF.test(href) && label.length >= 6;
  }).length;
  return {
    company: pageCompany(html) || "(회사명 못 찾음)",
    rawTitle: rawTitleOf(html),
    count: links || null,
    // 자사 사이트는 쇼핑몰 링크가 공고 링크와 구분되지 않아 자동 판정을 믿을 수 없다.
    verdict: links >= 2 ? `공고로 보이는 링크 ${links}건(자동판정 불확실)` : "공고 목록 못 찾음",
  };
}

async function fetchTargets() {
  const all = [];
  for (const st of ["greetinghr", "ninehire", "own_site"]) {
    let from = 0;
    while (true) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/crawl_candidate_brands?select=name,list_rank,status,career_url,notes&status=eq.${st}&order=list_rank.asc`,
        { headers: { ...H, Range: `${from}-${from + 999}` } }
      );
      const d = await res.json();
      if (!Array.isArray(d) || d.length === 0) break;
      all.push(...d);
      if (d.length < 1000) break;
      from += 1000;
    }
  }
  return all.filter((r) => r.career_url);
}

/**
 * 사이트별 상태 두 가지를 따로 센다.
 *  - 수집됨(staging): 크롤러가 가져와 보관 중인 공고 수 — 검수 대상 판단 기준
 *  - 공개됨(jobs): 사이트·카톡에 실제 노출되는 공고 수(승인된 것만)
 */
async function countByHost(table, filter) {
  const counts = new Map();
  let from = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=source_url${filter}`, {
      headers: { ...H, Range: `${from}-${from + 999}` },
    });
    const d = await res.json();
    if (!Array.isArray(d) || d.length === 0) break;
    for (const j of d) {
      try {
        const h = new URL(j.source_url).hostname.replace(/^www\./, "");
        counts.set(h, (counts.get(h) ?? 0) + 1);
      } catch {}
    }
    if (d.length < 1000) break;
    from += 1000;
  }
  return counts;
}

const stagedHosts = await countByHost("crawled_jobs_staging", "");
const publishedHosts = await countByHost("jobs", "&status=eq.open");
const rows = await fetchTargets();
console.log(`검수 목록 생성 — 대상 ${rows.length}건`);

const enriched = [];
for (let i = 0; i < rows.length; i += 6) {
  const results = await Promise.all(
    rows.slice(i, i + 6).map(async (r) => {
      const info =
        r.status === "greetinghr"
          ? await inspectGreeting(r.career_url)
          : r.status === "ninehire"
            ? await inspectNinehire(r.career_url)
            : await inspectOwnSite(r.career_url);
      const match =
        norm(info.company).includes(norm(r.name)) ||
        (norm(r.name).length >= 3 && norm(r.name).includes(norm(info.company)));
      let host = "";
      try {
        host = new URL(r.career_url).hostname.replace(/^www\./, "");
      } catch {}
      return {
        ...r,
        ...info,
        match,
        host,
        staged: stagedHosts.get(host) ?? 0,
        published: publishedHosts.get(host) ?? 0,
      };
    })
  );
  enriched.push(...results);
  if ((i + 6) % 60 === 0) console.log(`  ...${Math.min(i + 6, rows.length)}/${rows.length}`);
}

// 한 회사의 채용 사이트를 브랜드명 여러 개가 가리키는 경우가 많다(달바/달바(재팬)/dalba US →
// 같은 dalba.career.greetinghr.com). 검수는 **사이트 단위로 한 번만** 하면 되므로 합친다.
const bySite = new Map();
for (const r of enriched) {
  const key = r.host || r.career_url;
  const prev = bySite.get(key);
  if (!prev) {
    bySite.set(key, { ...r, brands: [r.name] });
    continue;
  }
  prev.brands.push(r.name);
  if (r.list_rank < prev.list_rank) prev.list_rank = r.list_rank;
  if (r.match) prev.match = true;
}
const sites = [...bySite.values()].sort((a, b) => a.list_rank - b.list_rank);

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const header = [
  "기업명",
  "브랜드명",
  "채용 사이트 주소",
  "구분",
  "공고수",
  "자동판정",
  "수집됨(보관)",
  "공개됨",
  "브랜드명 일치",
  "페이지 제목(원문)",
  "검수결과(O/X)",
  "메모",
];
const lines = [header.map(csvCell).join(",")];
for (const r of sites) {
  lines.push(
    [
      r.company,
      r.brands.join(" / "),
      r.career_url,
      LABEL[r.status],
      r.count ?? "",
      r.verdict,
      r.staged ? `${r.staged}건 보관` : "없음",
      r.published ? `${r.published}건 공개` : "미공개",
      r.match ? "일치" : "불일치 — 확인 필요",
      r.rawTitle ?? "",
      "",
      "",
    ]
      .map(csvCell)
      .join(",")
  );
}
fs.writeFileSync(OUT, "﻿" + lines.join("\r\n"), "utf8");

const stat = (st) => sites.filter((r) => r.status === st);
console.log(`\n저장: ${OUT}`);
console.log(`  사이트 기준 ${sites.length}행 (브랜드 ${enriched.length}건을 사이트 단위로 합침)`);
console.log(
  `  자사 ${stat("own_site").length} / 그리팅 ${stat("greetinghr").length} / 나인하이어 ${stat("ninehire").length}`
);
console.log(`  회사명 못 찾음: ${sites.filter((r) => r.company.startsWith("(")).length}곳`);
console.log(`  브랜드명 불일치(확인 필요): ${sites.filter((r) => !r.match).length}곳`);
