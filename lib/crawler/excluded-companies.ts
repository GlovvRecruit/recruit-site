/**
 * 크롤링에서 **영구 제외**할 회사들.
 *
 * 글로브 이용 브랜드 명단에는 뷰티 브랜드만 있는 게 아니라, 브랜드의 광고를 대행하는
 * 마케팅·광고 대행사와 경쟁 서비스도 섞여 있다. 이런 곳의 채용 공고를 브랜드 공고로 올리면
 * 서비스 성격과 맞지 않는다(2026-07-30 결정 — 프로그레스미디어 광고대행사 공고가 실제로
 * 사이트에 올라간 사고 이후).
 *
 * 판정은 **브랜드명과 채용 페이지에 표시된 회사명 둘 다** 대상으로 한다 — 브랜드명만 보면
 * "테이지 → 위마케팅"처럼 대행사가 운영하는 경우를 놓친다.
 */

/** 경쟁 서비스 — 공고를 실어주면 안 된다. */
export const COMPETITOR_NAMES = ["챌린저스", "화이트큐브"];

/** 광고·마케팅 대행사로 확인된 곳(사람이 확인해 추가한다). */
export const AD_AGENCY_NAMES = [
  "프로그레스미디어",
  "지엔엠라이프",
  "위마케팅",
  "에이치마케팅커뮤니케이션즈",
  "지엘커뮤니케이션즈",
  "디오비스튜디오",
  "에코마케팅",
];

/**
 * 이름만으로 대행사가 강하게 의심되는 패턴. 자동 제외에 쓰기엔 위험해서(브랜드명에
 * "미디어"가 들어가는 정상 브랜드도 있다) **검수 플래그**로만 쓴다.
 */
export const AD_AGENCY_HINT =
  /(광고대행|애드에이전시|미디어렙|퍼포먼스마케팅|커뮤니케이션즈|에이전시|agency)/;

const normalize = (name: string) => name.replace(/[\s()㈜]|주식회사/g, "").toLowerCase();

/** 제외 대상인지 — 브랜드명 또는 채용 페이지에 표시된 회사명 중 하나라도 걸리면 제외. */
export function isExcludedCompany(...names: (string | null | undefined)[]): boolean {
  const targets = names.filter(Boolean).map((n) => normalize(n as string));
  if (targets.length === 0) return false;
  const blocked = [...COMPETITOR_NAMES, ...AD_AGENCY_NAMES].map(normalize);
  return targets.some((t) => blocked.some((b) => t.includes(b) || b.includes(t)));
}

/** 자동 제외까진 아니지만 사람이 봐야 하는 경우. */
export function looksLikeAdAgency(...names: (string | null | undefined)[]): boolean {
  return names.filter(Boolean).some((n) => AD_AGENCY_HINT.test(n as string));
}
