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

export interface CareersJob {
  id: string;
  title: string;
  tag: string;
  summary: string;
  bodyHtml: string;
  employment?: string | null;
  location?: string | null;
  status: "open" | "closed";
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

/** GlovvRecruit/exam 프로젝트의 exam_attempts 테이블 (읽기 전용, 별도 Supabase 프로젝트). */
export interface ExamAttempt {
  id: string;
  name: string;
  exam_type: "onboarding" | "sales" | "feedback" | "meta-ads" | string;
  exam_date: string;
  submitted_at: string | null;
  total_score: number;
}
