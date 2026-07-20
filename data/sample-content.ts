import type { CareersJob, MediaLink } from "@/lib/types";

// Supabase 미연결 시 화면 데모용 폴백 데이터. lib/data.ts에서 조회 실패 시에만 사용.

export const sampleCareersJobs: CareersJob[] = [
  {
    id: "c1",
    title: "글로브 뷰티 인턴",
    tag: "인턴",
    summary:
      "대부분의 올리브영 입점 브랜드(2,000개+) 마케팅을 직접 경험하는 곳. 이력서 없이도 30초 만에 지원 가능.",
    bodyHtml: "",
    employment: "인턴 (1년 후 정규직 전환 검토)",
    location: "서울 용산구 이태원 · 사무실 출근",
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
