/**
 * 구독자의 관심 브랜드·직무와 공고가 맞는지 판정한다.
 *
 * **교집합(AND)** 규칙이다 — LG생활건강을 고르고 MD를 골랐으면 "LG생활건강의 MD 공고"만
 * 해당된다(2026-07-30 변경, 이전에는 합집합이라 LG생활건강 전체 + 모든 브랜드의 MD 전체가 왔다).
 *
 * 단, **비워둔 쪽은 조건 없음(=전체)** 으로 본다. 브랜드만 고르고 직무를 안 고른 구독자에게
 * 엄격한 교집합을 적용하면 공고가 한 건도 안 잡히기 때문이다. 그래서 화면 안내도
 * "모든 브랜드를 선택하고 마케팅을 고르면 마케팅 공고를 전부 보내드린다"는 식으로 설명한다.
 *
 * 둘 다 비어 있으면(등록한 관심사가 없으면) 아무 공고도 해당되지 않는다.
 */
export function matchesInterest(
  jobBrandId: string,
  jobCategory: string,
  brandIds: readonly string[] | null | undefined,
  categories: readonly string[] | null | undefined
): boolean {
  const hasBrands = (brandIds?.length ?? 0) > 0;
  const hasCategories = (categories?.length ?? 0) > 0;
  if (!hasBrands && !hasCategories) return false;

  const brandOk = !hasBrands || brandIds!.includes(jobBrandId);
  const categoryOk = !hasCategories || categories!.includes(jobCategory);
  return brandOk && categoryOk;
}

/** 관심 조건 안내 문구 — 발송·화면에서 같은 표현을 쓰기 위해 여기 모아둔다. */
export const INTEREST_MATCH_NOTICE =
  "고른 브랜드 중에서 고른 직무의 공고만 보내드려요. 모든 브랜드를 선택하고 밑에서 마케팅을 골라주시면, 마케팅 공고가 뜰 때마다 전달합니다.";
