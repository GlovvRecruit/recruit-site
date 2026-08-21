/**
 * 리크루터(*.recruiter.co.kr) 공통 크롤러.
 *
 * 자사 채용 페이지 중 가장 많은 기업이 쓰는 ATS다(승인 대상에만 8곳 — 동아제약·매일유업·
 * 광동제약·셀트리온·코스맥스 등). 테넌트마다 진입 경로는 다르지만(`/career/recruit`,
 * `/app/jobnotice/list`, `/career/home` …) **목록 API는 동일**하므로 크롤러 하나로 전부 커버된다.
 *
 * 목록 화면은 SPA라 HTML만 받으면 공고가 비어 있고, 실제 데이터는 아래 폼 POST로 내려온다:
 *   POST https://<slug>.recruiter.co.kr/app/jobnotice/list.json
 *   body: jobnoticeStateCode=10(접수중) & pageSize & currentPage …
 */

import type { CrawledOpening } from "@/lib/crawler/ingest";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** 리크루터가 내려주는 날짜 객체(자바 Calendar 직렬화 형태). time(ms)만 쓴다. */
interface RecruiterDate {
  time?: number;
}

interface RecruiterNotice {
  jobnoticeSn: number;
  jobnoticeName: string;
  applyEndDate?: RecruiterDate | null;
  recruitClassName?: string | null;
  jobnoticeStateCode?: string | number | null;
}

interface RecruiterListResponse {
  list?: RecruiterNotice[];
  pageUtil?: { lastPage?: number };
}

async function fetchPage(host: string, page: number): Promise<RecruiterListResponse | null> {
  try {
    const res = await fetch(`https://${host}/app/jobnotice/list.json`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      // jobnoticeStateCode=10 은 "접수중"만 — 마감된 공고까지 가져오면 목록이 오염된다.
      body: `recruitClassSn=&recruitClassName=&jobnoticeStateCode=10&pageSize=100&searchByNameOnly=true&currentPage=${page}`,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as RecruiterListResponse;
  } catch {
    return null;
  }
}

export async function crawlRecruiter(
  brandName: string,
  careerUrl: string
): Promise<CrawledOpening[]> {
  let host: string;
  try {
    host = new URL(careerUrl).host;
  } catch {
    return [];
  }

  const notices: RecruiterNotice[] = [];
  for (let page = 1; page <= 5; page++) {
    const data = await fetchPage(host, page);
    if (!data?.list?.length) break;
    notices.push(...data.list);
    if (page >= (data.pageUtil?.lastPage ?? 1)) break;
  }

  return notices
    .filter((n) => n?.jobnoticeSn && n?.jobnoticeName)
    .map((n) => ({
      sourcePlatform: "recruiter",
      brandName,
      title: n.jobnoticeName.trim(),
      // 리크루터는 직무 분류를 "채용분야"(recruitClassName)로 준다. 없으면 ingest가 제목으로 추정한다.
      jobCategory: n.recruitClassName ?? null,
      careerLevel: null,
      region: null,
      employmentType: null,
      sourceUrl: `https://${host}/app/jobnotice/view?systemKindCode=MRS2&jobnoticeSn=${n.jobnoticeSn}`,
      description: null,
      descriptionImages: null,
      deadline: n.applyEndDate?.time ? new Date(n.applyEndDate.time).toISOString() : null,
    }));
}
