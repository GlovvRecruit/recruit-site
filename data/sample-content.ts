import type { CareersJob, MediaLink } from "@/lib/types";

// Supabase 미연결 시 화면 데모용 폴백 데이터. lib/data.ts에서 조회 실패 시에만 사용.

export const sampleCareersJobs: CareersJob[] = [
  {
    id: "c1",
    title: "글로브 뷰티 인턴",
    tag: "인턴",
    employmentType: "intern",
    summary:
      "대부분의 올리브영 입점 브랜드(2,000개+) 마케팅을 직접 경험하는 곳. 이력서 없이도 30초 만에 지원 가능.",
    bodyHtml: "",
    employment: "인턴 (1년 후 정규직 전환 검토)",
    location: "서울 용산구 이태원 · 사무실 출근",
    status: "open",
    hashtags: "#1년 후 정규직 전환 검토 #서울 용산구 이태원 사무실 출근 #선착순 마감",
    benefitTitle: "이런 성장을 약속합니다",
    benefitItems:
      "뷰티 업계에서 인정받는 실력 - 2,000개+ 뷰티 브랜드 마케터, 4,000명+ 인플루언서와 긴밀하게 협업하며 실력을 쌓습니다.\n데이터 기반 콘텐츠 인사이트 - 3만개+ 릴스 콘텐츠를 분석하며 어떤 상황에 어떤 콘텐츠가 효과적인지 체득합니다.\n성장하는 기업에서 키우는 문제 해결력 - 출시 1년만에 연매출 100억원을 달성한 기업에서 전략·운영을 경험하며 문제 해결력을 기릅니다.",
    responsibilities:
      "3만개 이상 영상 중 광고 효율이 높은 콘텐츠를 분석해 인사이트 도출\n브랜드 영상 가이드라인에 대한 피드백 미팅 제공 및 온보딩 진행\n브랜드 미팅을 통해 페인 포인트 파악 및 문제 해결\n인플루언서가 제작한 영상 퀄리티 컨트롤 및 플랫폼 정착 지원",
    requirements:
      "논리적으로 사고하고 커뮤니케이션 능력이 뛰어난 분\n빠른 실행력과 책임감·열정을 가진 분 (경력 무관)\n뷰티 업계에서 커리어 성장을 꿈꾸는 분\n로켓 성장하는 스타트업을 직접 경험해보고 싶은 분",
    niceToHaves:
      "SNS·숏폼 콘텐츠 운영 경험\n엑셀·데이터 분석 툴 활용 능력\n뷰티 브랜드 마케팅에 대한 관심",
    benefits:
      "이태원역 1분 거리 사무실 · 오전 9시~오후 6시 근무\n시급 11,000원(월 환산 세전 약 230만원), 성과에 따라 인상\n인턴십 1년 완료 시 대표 추천서 작성 + 정규직 전환 검토",
    showRelated: true,
  },
  {
    id: "c2",
    title: "그로스 마케터 (신규직)",
    tag: "마케팅",
    employmentType: "fulltime",
    summary: "데이터로 성장을 설계하는 퍼포먼스·CRM 마케터",
    bodyHtml: "",
    employment: "정규직",
    location: "서울",
    status: "open",
    showRelated: true,
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
