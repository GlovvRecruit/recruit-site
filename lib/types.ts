// supabase/migrations/0001_init.sql 과 1:1 대응하는 클라이언트 타입.

export const JOB_CATEGORIES = ["마케팅", "MD", "BD·PM", "운영", "세일즈"] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
  profileAi?: string | null;
  profileReviewed: boolean;
}

export interface Job {
  id: string;
  brandId: string;
  title: string;
  jobCategory: JobCategory;
  careerLevel: string;
  region: string;
  requirementsSummary: string;
  responsibilitiesSummary: string;
  compensationSummary?: string | null;
  sourceUrl: string;
  status: "open" | "closed";
}

export type EmploymentType = "intern" | "fulltime";

export interface CareersJob {
  id: string;
  title: string;
  tag: string;
  employmentType: EmploymentType;
  summary: string;
  bodyHtml: string;
  employment?: string | null;
  location?: string | null;
  status: "open" | "closed";
  /** "#태그1 #태그2 #태그3" 원문. '#' 기준으로 분리해 렌더링 */
  hashtags?: string | null;
  /** "이런 성장을 약속합니다" 섹션 제목. 비어있으면 기본값 사용 */
  benefitTitle?: string | null;
  /** 한 줄에 "제목 - 설명" 형식으로 최대 3개 — 혜택 카드 3종 */
  benefitItems?: string | null;
  /** 한 줄에 하나씩(줄바꿈 구분) — "이런 일을 해요" 체크리스트 */
  responsibilities?: string | null;
  /** 한 줄에 하나씩(줄바꿈 구분) — "이런 분을 찾아요" 체크리스트 */
  requirements?: string | null;
  /** 한 줄에 하나씩(줄바꿈 구분) — "이런 분이면 더 좋아요" 체크리스트 */
  niceToHaves?: string | null;
  /** 한 줄에 하나씩(줄바꿈 구분) — "근무 조건·혜택" 체크리스트 */
  benefits?: string | null;
  /** 다른 자사 공고 목록을 상세 페이지 하단에 보여줄지 여부 */
  showRelated: boolean;
}

export interface MediaLink {
  id: string;
  groupLabel: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface Intern {
  id: string;
  name: string;
  role?: string | null;
  startDate: string; // ISO date
  note?: string | null;
}

/** GlovvRecruit/exam이 쓰는 exam_attempts 테이블. 이 사이트와 같은 Supabase 프로젝트를 공유한다. */
export interface ExamAttempt {
  id: string;
  name: string;
  exam_type: "onboarding" | "sales" | "feedback" | "meta-ads" | string;
  exam_date: string;
  submitted_at: string | null;
  total_score: number;
}
