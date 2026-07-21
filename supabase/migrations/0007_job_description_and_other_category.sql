-- 크롤링한 브랜드 공고에 상세 설명(description) 저장 지원.
-- greetinghr는 리스트 페이지에 요약 정보만 있고, 개별 공고 페이지(/ko/o/{id})에
-- 실제 상세 설명(주요 업무/자격 요건/우대 사항/근무 조건)이 있어 2단계로 수집한다.

alter table jobs add column if not exists description text;
alter table crawled_jobs_staging add column if not exists description text;
