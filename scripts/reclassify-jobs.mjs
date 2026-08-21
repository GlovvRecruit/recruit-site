/**
 * 이미 저장된 공고의 직무 분류를 **제목 기준으로 다시 매긴다**.
 *
 * 분류 규칙을 고쳐도(AMD·VMD → MD 등) 기존 행은 그 브랜드를 담당하는 크롤러가 다시 돌아야
 * 갱신된다. 담당 크롤러가 없는 브랜드(올리브인터내셔널·토니모리 등)는 옛 분류가 계속 남으므로
 * 이 스크립트로 한 번에 맞춘다. 크롤러의 categoryFromTitle과 같은 규칙을 쓴다.
 *
 * 사용법: node scripts/reclassify-jobs.mjs [--apply]
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");

/** lib/crawler/ingest.ts 의 categoryFromTitle 과 동일한 규칙 */
function categoryFromTitle(title) {
  const t = " " + title.toLowerCase() + " ";
  const word = (w) => new RegExp("(^|[^a-z])(" + w + ")([^a-z]|$)").test(t);
  if (word("a?md|vmd") || t.includes("엠디")) return "MD";
  if (word("a?bm|pm") || /브랜드 *매니저|상품 *기획|사업 *기획|프로덕트 *매니저/.test(t)) return "BM·PM";
  if (/marketing|marketer|마케팅|마케터|퍼포먼스/.test(t)) return "마케팅";
  if (/영업|세일즈|sales|채널 *관리|바이어/.test(t)) return "세일즈";
  if (word("scm") || /운영|operation|물류|고객 *(지원|경험)/.test(t)) return "운영";
  return null;
}

const jobs = [];
let from = 0;
while (true) {
  const res = await fetch(`${SB}/rest/v1/jobs?select=id,title,job_category&status=eq.open`, {
    headers: { ...H, Range: `${from}-${from + 999}` },
  });
  const d = await res.json();
  if (!Array.isArray(d) || d.length === 0) break;
  jobs.push(...d);
  if (d.length < 1000) break;
  from += 1000;
}

const changes = jobs
  .map((j) => ({ ...j, next: categoryFromTitle(j.title) }))
  .filter((j) => j.next && j.next !== j.job_category);

console.log(`공개 공고 ${jobs.length}건 중 재분류 대상 ${changes.length}건`);
const summary = {};
for (const c of changes) {
  const k = `${c.job_category} → ${c.next}`;
  summary[k] = (summary[k] ?? 0) + 1;
}
console.log(JSON.stringify(summary, null, 1));
console.log("\n[예시]");
changes.slice(0, 10).forEach((c) => console.log(`  ${c.job_category} → ${c.next}  ${c.title.slice(0, 46)}`));

if (!APPLY) {
  console.log("\n--apply 로 실행하면 반영합니다.");
  process.exit(0);
}

let done = 0;
for (const c of changes) {
  const res = await fetch(`${SB}/rest/v1/jobs?id=eq.${c.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ job_category: c.next }),
  });
  if (res.status < 300) done++;
}
console.log(`\n반영 완료: ${done}건`);
