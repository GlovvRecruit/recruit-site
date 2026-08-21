/**
 * 채용 사이트 호스트 → **우리 DB에서 쓰는 브랜드명** 매핑.
 *
 * 한 회사의 채용 사이트를 글로브 브랜드 명단에서는 브랜드명으로 부르지만(에이지투웨니스,
 * 달바(재팬), 디어 클레어스), 우리 `brands` 테이블에는 이미 법인명으로 들어와 있다
 * (애경산업, 주식회사 달바글로벌, 위시컴퍼니). 매핑 없이 크롤링하면 같은 회사가 브랜드명으로
 * 한 번 더 생기고, 같은 공고가 두 벌로 저장된다 — 2026-07-30에 실제로 발생해 중복 정리 과정에서
 * 기존 공개 공고 91건이 사라지는 사고로 이어졌다.
 */
export const BRAND_NAME_BY_HOST: Record<string, string> = {
  "ak.career.greetinghr.com": "애경산업",
  "dalba.career.greetinghr.com": "주식회사 달바글로벌",
  "wishcompany.career.greetinghr.com": "위시컴퍼니",
  "goodaiglobal.ninehire.site": "구다이글로벌",
  "oliveinter.ninehire.site": "올리브인터내셔널",
};

/** 호스트에 지정된 정식 브랜드명이 있으면 그것을, 없으면 후보 이름을 그대로 쓴다. */
export function resolveBrandName(careerUrl: string, fallback: string): string {
  try {
    const host = new URL(careerUrl).host.replace(/^www\./, "");
    return BRAND_NAME_BY_HOST[host] ?? fallback;
  } catch {
    return fallback;
  }
}
