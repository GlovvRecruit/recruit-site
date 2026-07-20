import type { CareersJob, MediaLink } from "@/lib/types";

// Supabase 미연결 시 화면 데모용 폴백 데이터. lib/data.ts에서 조회 실패 시에만 사용.

export const sampleCareersJobs: CareersJob[] = [
  {
    id: "c1",
    title: "Glovv 뷰티 인턴",
    tag: "인턴",
    summary: "뷰티 브랜드·인플루언서 협업 실무를 경험하는 인턴 포지션",
    bodyHtml: "",
    employment: "인턴 (정규직 전환 가능)",
    location: "서울 · 하이브리드 근무",
    status: "open",
  },
  {
    id: "c2",
    title: "그로스 마케터 (신규직)",
    tag: "마케팅",
    summary: "데이터로 성장을 설계하는 퍼포먼스·CRM 마케터",
    bodyHtml: "",
    employment: "정규직",
    location: "서울",
    status: "open",
  },
];

export const sampleMediaLinks: MediaLink[] = [
  {
    id: "m1",
    groupLabel: "언론 보도",
    title: "뷰티 릴스 플랫폼 'Glovv', 30억원 시리즈A 투자 유치",
    url: "https://platum.kr/archives/268968",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "m2",
    groupLabel: "세미나·행사",
    title: "뷰티 릴스 플랫폼 'Glovv', 1주년 세미나 개최… 1,000여 명 참여",
    url: "https://platum.kr/archives/276871",
    createdAt: "2025-06-01T00:00:00.000Z",
  },
];
