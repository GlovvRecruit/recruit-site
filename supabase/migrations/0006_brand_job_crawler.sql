-- 브랜드 공고 크롤링 파이프라인(Apify) 지원.
-- 크롤러는 brands/jobs에 직접 쓰지 않고 crawled_jobs_staging에만 적재한다.
-- admin이 검수(승인/거절)한 것만 brands/jobs로 승격(promote)된다.

alter table brands add constraint brands_name_key unique (name);

alter table jobs add column if not exists source_platform text;
alter table jobs add constraint jobs_source_url_key unique (source_url);

create table crawled_jobs_staging (
  id                uuid primary key default gen_random_uuid(),
  crawl_run_id      text,
  source_platform   text not null,        -- 'greetinghr' 등
  brand_name        text not null,
  title             text not null,
  job_category      text,
  career_level      text,
  region            text,
  employment_type   text,
  source_url        text not null,
  raw_payload       jsonb,
  review_status     text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  promoted_job_id   uuid references jobs(id) on delete set null,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create unique index crawled_jobs_staging_source_url_key on crawled_jobs_staging (source_url);
create index crawled_jobs_staging_review_status_idx on crawled_jobs_staging (review_status);

alter table crawled_jobs_staging enable row level security;

-- anon 접근 없음(웹훅은 service role 키로 RLS 우회). authenticated(관리자)만 전체 권한.
create policy "authenticated full crawled_jobs_staging" on crawled_jobs_staging
  for all to authenticated using (true) with check (true);
