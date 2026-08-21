/**
 * 자사 채용 홈페이지(status='own_site') 대상을 **실제 채용 공고가 있는 페이지인지** 기준으로
 * 재검증한다.
 *
 * 2026-07-30 사용자 검수에서 드러난 문제: "채용 페이지"면 통과시켰더니 **인재상·복지·채용 소개
 * 페이지**가 대상에 섞였다. 공고가 없는 페이지는 크롤링해도 가져올 게 없으므로 대상이 아니다.
 *
 * 판정
 *   ok     : 공고 상세로 이어지는 링크가 2건 이상, 또는 한 페이지에 공고가 펼쳐진 형태
 *   review : 채용 관련 페이지지만 공고 목록을 못 찾음(인재상·소개 페이지 가능) → notes에 표시
 *   remove : 페이지가 없거나 채용과 무관 → not_found로 내림
 *
 * 사용법: node scripts/verify-own-site-postings.mjs [--apply]
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
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** 공고 상세로 이어지는 링크 패턴(게시판형·SPA·ATS를 폭넓게) */
const POSTING_HREF = /(view|detail|read|\/o\/|recruit\?|wr_id=|idx=|no=\d|seq=|bbsIdx|jobId|position)/i;
/** 공고 목록·본문에 반복적으로 나타나는 표현 */
const POSTING_HINT = /(마감|D-\d|접수\s*중|모집\s*중|상시\s*채용|경력|신입|정규직|계약직|자격요건|주요업무)/g;

async function fetchTargets() {
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

async function verify(row) {
  try {
    const res = await fetch(row.career_url, {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return { verdict: "remove", reason: `페이지 없음 (HTTP ${res.status})` };
    const html = await res.text();
    const plain = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    // 제목처럼 보이는 텍스트(6자 이상)를 가진 공고 상세 링크만 센다.
    const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)];
    const postingLinks = anchors.filter(([, href, text]) => {
      const label = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      return POSTING_HREF.test(href) && label.length >= 6;
    });
    const hints = (plain.match(POSTING_HINT) ?? []).length;

    if (postingLinks.length >= 2) {
      return { verdict: "ok", reason: `공고 링크 ${postingLinks.length}건 확인` };
    }
    if (hints >= 6 && plain.length > 1200) {
      return { verdict: "ok", reason: `한 페이지형 공고로 추정(공고 표현 ${hints}회)` };
    }
    if (/(채용|recruit|career|인재|입사)/i.test(html)) {
      return { verdict: "review", reason: "채용 페이지지만 공고 목록 없음(인재상·소개 페이지 가능)" };
    }
    return { verdict: "remove", reason: "채용과 무관한 페이지" };
  } catch (e) {
    return { verdict: "review", reason: `접속 실패 (${String(e).slice(0, 40)})` };
  }
}

const rows = await fetchTargets();
console.log(`자사 홈페이지 대상 ${rows.length}건 검증${APPLY ? " (--apply)" : " (집계만)"}`);

const out = { ok: [], review: [], remove: [] };
for (let i = 0; i < rows.length; i += 6) {
  const results = await Promise.all(
    rows.slice(i, i + 6).map(async (r) => ({ r, v: await verify(r) }))
  );
  for (const { r, v } of results) out[v.verdict].push({ ...r, ...v });
}

console.log(`  공고 확인:        ${out.ok.length}`);
console.log(`  공고 없음(검수):  ${out.review.length}`);
console.log(`  제거:             ${out.remove.length}`);
console.log("\n[공고 확인된 곳]");
out.ok.slice(0, 15).forEach((r) => console.log(`  - ${r.name}: ${r.reason} — ${r.career_url}`));
console.log("\n[제거 대상]");
out.remove.slice(0, 15).forEach((r) => console.log(`  - ${r.name}: ${r.reason}`));

if (!APPLY) {
  console.log("\n--apply 로 실행하면 제거 대상을 not_found로 내리고 검수 대상에 표시를 남깁니다.");
  process.exit(0);
}

const now = new Date().toISOString();
const today = now.slice(0, 10);
for (const r of out.remove) {
  await fetch(`${SUPABASE_URL}/rest/v1/crawl_candidate_brands?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "not_found",
      career_url: null,
      notes: `검증(${today}): ${r.reason} | 이전 URL ${r.career_url}`,
      researched_at: now,
    }),
  });
}
for (const r of out.review) {
  await fetch(`${SUPABASE_URL}/rest/v1/crawl_candidate_brands?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ notes: `검증(${today}): ${r.reason} ※검수필요`, researched_at: now }),
  });
}
for (const r of out.ok) {
  await fetch(`${SUPABASE_URL}/rest/v1/crawl_candidate_brands?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ notes: `검증(${today}): ${r.reason}`, researched_at: now }),
  });
}
console.log(`\n반영 완료 — 제거 ${out.remove.length}, 검수표시 ${out.review.length}, 공고 확인 ${out.ok.length}`);
