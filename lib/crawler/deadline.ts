/**
 * 공고 원문에서 마감일을 뽑아낸다.
 *
 * 브랜드 공고 목록의 "마감 임박순" 정렬을 위해 필요하다. 자사 채용 페이지는 마감일 표기 방식이
 * 제각각이고("~2026.08.15", "2026년 8월 15일까지", "채용시 마감") 아예 없는 경우도 많아서,
 * **확실하게 읽히는 것만 잡고 애매하면 null을 돌려준다** — 잘못된 마감일은 "마감 임박순" 상단을
 * 엉뚱한 공고로 채워버리므로, 없는 것(=상시)으로 두는 쪽이 안전하다.
 */

/** "채용시 마감"류 상시 채용 표현 — 마감일이 없는 것으로 확정한다. */
const ROLLING_PATTERN = /(채용\s*시\s*마감|수시\s*채용|상시\s*채용|충원\s*시\s*마감|채용\s*완료\s*시)/;

/** 마감일 앞에 붙는 표현들. 이 라벨이 있을 때만 날짜를 마감일로 인정한다. */
const DEADLINE_LABEL = /(마감(?:일|일자|기한)?|접수\s*마감|지원\s*마감|모집\s*기간|접수\s*기간|지원\s*기간|~)/;

/** 2026.08.15 / 2026-08-15 / 2026년 8월 15일 / 26.08.15 */
const DATE_PATTERN =
  /(20\d{2}|\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g;

function toIso(y: string, m: string, d: string): string | null {
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // 마감일은 그 날 자정까지 유효한 것으로 본다(23:59:59 KST = 14:59:59 UTC).
  const iso = new Date(Date.UTC(year, month - 1, day, 14, 59, 59));
  if (Number.isNaN(iso.getTime())) return null;
  // 지나치게 과거·미래인 값은 오독으로 보고 버린다(제품 출시일·설립일 등을 잘못 잡는 경우).
  const now = Date.now();
  if (iso.getTime() < now - 400 * 86400_000) return null;
  if (iso.getTime() > now + 730 * 86400_000) return null;
  return iso.toISOString();
}

/**
 * 공고 상세 텍스트에서 마감일을 찾는다. 없거나 상시 채용이면 null.
 * 텍스트가 아주 길면 마감일 표기는 보통 앞/뒤 어딘가에 있으므로 전체를 훑되,
 * "마감/접수기간/~" 라벨 근처(뒤쪽 40자)의 날짜만 후보로 삼는다.
 */
export function parseDeadline(text: string | null | undefined): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ");
  if (ROLLING_PATTERN.test(flat)) return null;

  const candidates: string[] = [];
  const labelRe = new RegExp(DEADLINE_LABEL.source, "g");
  let label: RegExpExecArray | null;
  while ((label = labelRe.exec(flat))) {
    const window = flat.slice(label.index, label.index + 40);
    DATE_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DATE_PATTERN.exec(window))) {
      const iso = toIso(m[1], m[2], m[3]);
      if (iso) candidates.push(iso);
    }
  }
  if (candidates.length === 0) return null;
  // 모집 기간이 "2026.08.01 ~ 2026.08.15"처럼 범위로 적히면 뒤쪽(늦은) 날짜가 마감일이다.
  return candidates.sort().at(-1) ?? null;
}

/** "2026.08.02 23:00"(LG careers API의 recEndDateTime) 같은 확정 마감일 문자열 파싱. */
export function parseExplicitDeadline(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  // KST(UTC+9) 기준 표기이므로 UTC로 변환해 저장한다.
  const utc = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh ?? 23) - 9, Number(mm ?? 59), 0)
  );
  return Number.isNaN(utc.getTime()) ? null : utc.toISOString();
}
