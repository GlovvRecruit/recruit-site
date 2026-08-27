/**
 * 글로브를 **이용하지 않는** 브랜드 목록.
 *
 * `/brand-jobs/for-interns`(글로브 이용 브랜드 전용 페이지)와 `/brand-jobs`의 "글로브 이용 브랜드"
 * 탭이 같은 기준을 써야 해서 한 곳에 모았다 — 예전에 두 파일에 각각 적어두는 바람에 한쪽만
 * 고쳐지는 문제가 있었다(2026-08-27 정리).
 *
 * `brands`에 들어있는 공고는 애초에 글로브 이용 브랜드를 큐레이션해 크롤링한 결과이므로
 * **이용하지 않는 곳만 빼는** 방식이 정확하다. 이용하지 않는 브랜드가 생기면 여기에 추가한다.
 * (로레알은 채용팀 요청으로 공고만 실어주는 곳이라 이용 브랜드가 아니다.)
 */
export const NON_GLOVV_BRANDS = ["에이피알", "메디큐브", "더파운더즈", "로레알"];

export const normalizeBrandName = (name: string) =>
  name.replace(/[\s()㈜]/g, "").replace("주식회사", "").toLowerCase();

/** 브랜드명(별칭 포함) 중 하나라도 제외 목록에 걸리면 글로브 이용 브랜드가 아니다. */
export function isGlovvBrandName(names: (string | null | undefined)[]): boolean {
  const normalized = names.filter(Boolean).map((n) => normalizeBrandName(n as string));
  return !NON_GLOVV_BRANDS.some((excluded) => {
    const target = normalizeBrandName(excluded);
    return normalized.some((n) => n === target || n.includes(target));
  });
}
