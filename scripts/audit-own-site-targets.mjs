/**
 * `crawl_candidate_brands`의 status='own_site' 건을 실제로 열어보고 채용 페이지가 맞는지 감사한다.
 *
 * 자동 조사(research-career-pages.mjs)는 "브랜드명이 제목에 있고 채용 키워드가 있는 페이지"를
 * 자사 채용 페이지로 인정하는데, 그 결과 공식몰·동명 업체가 섞여 들어왔다
 * (지베르니→비앤에이치코스메틱 공식몰, 912→지티타이어, 아임프롬→아임프롬 보컬학원 등).
 * 크롤러를 붙이기 전에 이런 오탐을 걷어내는 용도.
 *
 * 판정을 두 단계로 나눈다 — JS로 렌더링되는 진짜 채용 페이지(본문이 비어 있음)를 잘못 지우지
 * 않기 위해서다:
 *   remove : 채용 관련 내용이 전혀 없고 **URL에도** career/recruit/job 흔적이 없음 → not_found로 내림
 *   review : 내용은 확인 못 했지만 URL이 채용 경로임(=JS 렌더링 가능) → 유지하고 notes에 검수 표시
 *   keep   : 채용 페이지로 확인됨
 *
 * 사용법: node scripts/audit-own-site-targets.mjs [--apply]   (--apply 없으면 집계만)
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
const APPLY = process.argv.includes("--apply");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// /hr/people.php(동국제약)처럼 career·recruit가 안 들어간 채용 경로가 있어 토큰을 넓게 잡는다.
const CAREER_URL_TOKEN = /(career|recruit|job|hiring|채용|인재|employ|join|hr|people|talent|personnel|culture)/i;
const CAREER_TITLE = /(채용|recruit|career|인재|입사|hiring|jobs?)/i;
const CAREER_BODY = /(자격요건|주요업무|모집분야|모집부문|접수기간|지원방법|우대사항|담당업무)/;

async function fetchRows() {
  const all = [];
  let from = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crawl_candidate_brands?select=id,name,career_url,notes&status=eq.own_site&order=list_rank.asc`,
      { headers: { ...H, Range: `${from}-${from + 999}` } }
    );
    const d = await res.json();
    if (!Array.isArray(d) || d.length === 0) break;
    all.push(...d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return all.filter((r) => r.career_url);
}

async function inspect(row) {
  try {
    const res = await fetch(row.career_url, {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(13000),
    });
    if (!res.ok) return { verdict: "review", reason: `HTTP ${res.status}`, title: "" };
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([\s\S]{0,90}?)<\/title>/i)?.[1] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const plain = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    // 이미지·JS 위주 페이지는 본문 키워드가 없어도 내비 링크에 "채용/인재/커리어"가 있으면 채용 섹션이다.
    const navCareerLink = /<a[^>]*>[^<]{0,20}(채용|인재|커리어|리크루|입사)/.test(html);
    const careerish = CAREER_TITLE.test(title) || CAREER_BODY.test(plain) || navCareerLink;

    // 채용 페이지이긴 해도 **다른 회사**의 채용 페이지인 경우가 있다(912 → 지티타이어,
    // 후르디아 → 웰코스). 브랜드명이 페이지에 안 보이면 사람이 봐야 한다 — 모회사 채용
    // 페이지(마데카프라임 → 동국제약)도 같은 모양이라 자동으로 지울 수는 없다.
    // 2글자 미만·숫자만인 브랜드명은 우연히 걸리기 쉬워 매칭 근거로 쓰지 않는다.
    const brandToken = row.name.replace(/\([^)]*\)/g, "").replace(/\s/g, "");
    const usableToken = brandToken.length >= 2 && !/^\d+$/.test(brandToken);
    const brandSeen = usableToken && (title + " " + plain.slice(0, 4000)).includes(brandToken);

    if (careerish && (!usableToken || brandSeen)) {
      return { verdict: "keep", reason: "채용 페이지 확인", title };
    }
    if (careerish) {
      return { verdict: "review", reason: `채용 페이지지만 브랜드명 없음 (${title || "제목없음"})`, title };
    }
    if (CAREER_URL_TOKEN.test(row.career_url)) {
      return { verdict: "review", reason: "URL은 채용 경로지만 본문에서 공고 확인 불가", title };
    }
    return { verdict: "remove", reason: `채용 페이지 아님 (${title || "제목없음"})`, title };
  } catch (e) {
    return { verdict: "review", reason: `접속 실패 (${String(e).slice(0, 40)})`, title: "" };
  }
}

const rows = await fetchRows();
console.log(`감사 대상 own_site ${rows.length}건${APPLY ? " (--apply: DB 반영)" : " (집계만)"}`);

const buckets = { keep: [], review: [], remove: [] };
for (let i = 0; i < rows.length; i += 8) {
  const slice = rows.slice(i, i + 8);
  const results = await Promise.all(slice.map((r) => inspect(r).then((v) => ({ r, v }))));
  for (const { r, v } of results) buckets[v.verdict].push({ ...r, ...v });
}

console.log(`  유지(채용 페이지 확인): ${buckets.keep.length}`);
console.log(`  검수 필요(JS 렌더링 등):  ${buckets.review.length}`);
console.log(`  제거(채용 페이지 아님):   ${buckets.remove.length}`);
console.log("\n제거 대상 예시:");
buckets.remove.slice(0, 12).forEach((r) => console.log(`  - ${r.name}: ${r.reason}`));

if (!APPLY) {
  console.log("\n--apply 를 붙이면 위 제거 대상을 not_found로 내리고 검수 필요 건에 표시를 남깁니다.");
  process.exit(0);
}

for (const r of buckets.remove) {
  await fetch(`${SUPABASE_URL}/rest/v1/crawl_candidate_brands?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "not_found",
      career_url: null,
      notes: `감사(${new Date().toISOString().slice(0, 10)}): ${r.reason} | 이전 URL ${r.career_url}`,
      researched_at: new Date().toISOString(),
    }),
  });
}
for (const r of buckets.review) {
  const notes = `${r.notes ?? ""} | 감사: ${r.reason} ※검수필요`.slice(0, 900);
  await fetch(`${SUPABASE_URL}/rest/v1/crawl_candidate_brands?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ notes }),
  });
}
console.log(`\n반영 완료: ${buckets.remove.length}건 제거(not_found), ${buckets.review.length}건 검수 표시`);
