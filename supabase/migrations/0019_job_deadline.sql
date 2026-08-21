-- 공고 마감일. 브랜드 공고 목록을 "마감 임박순"으로 정렬할 수 있게 하려고 추가했다.
-- 크롤링 원본이 마감일을 제공하지 않는 경우가 많아(게시판형 자사 채용 페이지 다수가 "채용시
-- 마감") null을 허용하고, UI에서는 null을 "상시"로 표시하며 마감 임박순 정렬에서 맨 뒤로 보낸다.
alter table jobs add column deadline timestamptz;
alter table crawled_jobs_staging add column deadline timestamptz;

-- 마감 임박순 정렬용. null은 인덱스 뒤쪽에 오도록 nulls last로 맞춘다.
create index jobs_deadline_idx on jobs (deadline asc nulls last);
