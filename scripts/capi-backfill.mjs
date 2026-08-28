/**
 * 08/21~08/26 지원 건을 Meta 전환 API(CAPI)로 소급 전송한다.
 *
 * 왜 필요한가: 그 기간 `/thankyou`가 픽셀 이벤트를 하나도 쏘지 않아 CompleteRegistration이
 * 0건으로 기록됐다(픽셀 데이터로 확인). 실제로는 지원이 78건 접수됐고, 그 신호가 없으니
 * 캠페인 최적화가 잘못된 근거로 돌아갔다.
 *
 * 매칭 근거:
 *  - fbclid → fbc 파라미터로 재구성하면 **광고 클릭까지 귀속**된다(가장 정확).
 *  - 연락처(휴대폰) → SHA-256 해시로 ph.
 *  - 이름 → 성/이름 분리가 어려워 fn 하나로만 넣는다(한글 이름은 소문자·공백 제거).
 *
 * 중복 방지: event_id를 지원서 고유값(tally_submission_id 또는 row id)으로 고정한다.
 * 같은 스크립트를 두 번 돌려도 메타가 같은 event_id를 하나로 합친다.
 *
 * 사용법:
 *   META_CAPI_TOKEN=<액세스 토큰> node scripts/capi-backfill.mjs           # 미리보기(전송 안 함)
 *   META_CAPI_TOKEN=<액세스 토큰> node scripts/capi-backfill.mjs --send    # 실제 전송
 *   ... --test-code=TESTxxxxx    # Events Manager '테스트 이벤트' 탭으로만 보내 확인
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.META_CAPI_TOKEN;
const PIXEL_ID = "881944777433930";
const SEND = process.argv.includes("--send");
const TEST_CODE = (process.argv.find((a) => a.startsWith("--test-code=")) ?? "").split("=")[1] || null;

const FROM = "2026-08-21";
const TO = "2026-08-27"; // 미만
const EVENT_SOURCE_URL = "https://beauty-recruit.vercel.app/thankyou";

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

/** 메타 규격: 소문자·공백 제거 후 해시. 전화번호는 국가코드 포함 숫자만(한국 82). */
function hashPhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return sha256("82" + national);
}
function hashName(raw) {
  const v = String(raw ?? "").replace(/\s/g, "").toLowerCase();
  return v && v !== "(이름미확인)" ? sha256(v) : null;
}

function fieldsOf(rawPayload) {
  const rp = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  const list = rp?.data?.fields ?? [];
  const out = {};
  for (const f of list) {
    const label = String(f.label ?? "").trim().toLowerCase();
    if (f.value !== null && f.value !== undefined && f.value !== "") out[label] = f.value;
  }
  return out;
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const rows = await (
  await fetch(
    `${SB}/rest/v1/career_applications?select=id,created_at,name,contact,raw_payload,tally_submission_id` +
      `&created_at=gte.${FROM}&created_at=lt.${TO}&order=created_at.asc`,
    { headers: H }
  )
).json();

const nowSec = Math.floor(Date.now() / 1000);
const events = [];
let noPhone = 0;
let weakMatch = 0;
let tooOld = 0;

for (const r of rows) {
  const f = fieldsOf(r.raw_payload);
  const eventTime = Math.floor(new Date(r.created_at).getTime() / 1000);

  // CAPI는 7일(604800초)보다 오래된 이벤트를 거부한다.
  if (nowSec - eventTime > 604800) {
    tooOld++;
    continue;
  }

  const user_data = {};
  const ph = hashPhone(r.contact ?? f["연락처"]);
  if (ph) user_data.ph = [ph];
  else noPhone++;
  const fn = hashName(r.name);
  if (fn) user_data.fn = [fn];

  // fbclid → fbc. 형식: fb.<subdomainIndex>.<clickTime(ms)>.<fbclid>
  if (f.fbclid) user_data.fbc = `fb.1.${eventTime * 1000}.${f.fbclid}`;

  // 이름만 있는 건은 메타가 "매칭에 효과적이지 않다"며 배치 전체를 거부한다(실제로 확인).
  // 전화번호 해시나 fbc 중 하나는 반드시 있어야 보낸다.
  if (!user_data.ph && !user_data.fbc) {
    weakMatch++;
    continue;
  }

  events.push({
    event_name: "CompleteRegistration",
    event_time: eventTime,
    event_id: r.tally_submission_id || r.id,
    event_source_url: EVENT_SOURCE_URL,
    action_source: "website",
    user_data,
  });
}

const withFbc = events.filter((e) => e.user_data.fbc).length;
console.log(`대상 기간: ${FROM} ~ ${TO} (미만)`);
console.log(`지원서 ${rows.length}건 중 전송 대상 ${events.length}건`);
console.log(`  7일 초과로 제외: ${tooOld}건`);
console.log(`  전화번호 없음: ${noPhone}건`);
console.log(`  매칭 정보 부족으로 제외: ${weakMatch}건`);
console.log(`  fbclid 보유(광고 귀속 가능): ${withFbc}건`);
if (events[0]) {
  const s = events[0];
  console.log(
    `\n예시: event_id=${s.event_id} time=${new Date(s.event_time * 1000).toISOString()} ` +
      `ph=${s.user_data.ph ? "있음" : "없음"} fbc=${s.user_data.fbc ? "있음" : "없음"}`
  );
}

if (!SEND) {
  console.log("\n--send 를 붙이면 실제로 전송합니다. (--test-code=TESTxxxx 로 테스트 전송 가능)");
  process.exit(0);
}
if (!TOKEN) {
  console.error("\nMETA_CAPI_TOKEN 이 없습니다. Events Manager → 데이터 소스 → 설정 → 전환 API에서 발급하세요.");
  process.exit(1);
}

// 메타 권장 배치 크기는 1000이지만, 실패 시 원인 파악이 쉽도록 50건씩 끊어 보낸다.
let sent = 0;
const failures = [];
for (let i = 0; i < events.length; i += 50) {
  const batch = events.slice(i, i + 50);
  const body = { data: batch, access_token: TOKEN };
  if (TEST_CODE) body.test_event_code = TEST_CODE;
  const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (res.ok && json.events_received != null) {
    sent += json.events_received;
    console.log(`  배치 ${i / 50 + 1}: ${json.events_received}건 접수 (fbtrace ${json.fbtrace_id ?? "-"})`);
  } else {
    failures.push(json);
    console.error(`  배치 ${i / 50 + 1} 실패:`, JSON.stringify(json).slice(0, 400));
  }
}
console.log(`\n총 ${sent}건 전송 완료${failures.length ? ` / 실패 배치 ${failures.length}개` : ""}`);
