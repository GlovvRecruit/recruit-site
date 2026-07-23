-- Glovv 채용 사이트 초기 스키마
-- 참조: DESIGN_BRIEF.md, exam 프로젝트(GlovvRecruit/exam)의 RLS 패턴을 그대로 따름:
--   anon = 제한된 insert/select만, authenticated(관리자 1인) = 전체 권한.
-- 관리자 계정은 Supabase Dashboard > Authentication > Users 에서 수동 생성(이메일/비번).

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. 브랜드(법인) — 브랜드 공고 피드용
-- ============================================================
create table brands (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  logo_url          text,
  profile_ai        text,                       -- AI 매력도 한 줄
  profile_reviewed  boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- 2. 브랜드 채용 공고
-- ============================================================
create table jobs (
  id                        uuid primary key default gen_random_uuid(),
  brand_id                  uuid not null references brands(id) on delete cascade,
  title                     text not null,
  job_category              text,               -- 마케팅|MD|BM·PM|운영|세일즈
  career_level              text,
  region                    text,
  requirements_summary      text,
  responsibilities_summary  text,
  compensation_summary      text,
  source_url                text not null,      -- 원문 링크(링크아웃)
  status                    text not null default 'open', -- 'open' | 'closed'
  created_at                timestamptz not null default now()
);

create index jobs_status_idx on jobs (status);
create index jobs_brand_id_idx on jobs (brand_id);

-- ============================================================
-- 3. 리드(관심사 등록 + 카카오 알림 신청) — 로그인 없이 전화번호로 식별
-- ============================================================
create table leads (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null,
  brand_ids        uuid[] not null default '{}',
  categories       text[] not null default '{}',
  marketing_opt_in boolean not null default false,
  unsubscribed     boolean not null default false,
  created_at       timestamptz not null default now()
);

create index leads_phone_idx on leads (phone);

-- ============================================================
-- 4. 자사(Glovv/Flixx) 채용 공고 — careers 페이지용
-- ============================================================
create table careers_jobs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  tag           text not null,     -- '인턴' | '마케팅' 등 뱃지 라벨
  summary       text not null,
  body_html     text not null default '',
  employment    text,              -- 예: '인턴(정규직 전환 가능)'
  location      text,
  status        text not null default 'open',
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 5. 자사 인턴/직원 지원서 (careers 페이지 지원 폼)
-- ============================================================
create table career_applications (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact       text not null,        -- 이메일 또는 전화
  role_interest text,
  portfolio_url text,
  resume_path   text,                 -- Supabase Storage 경로
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 6. MEDIA(보도·미디어 링크)
-- ============================================================
create table media_links (
  id          uuid primary key default gen_random_uuid(),
  group_label text not null default '언론 보도',  -- '언론 보도' | '세미나·행사' 등
  title       text not null,
  url         text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 7. 인턴 관리 (admin 전용) — 입사일 기반 6개월/1년 마일스톤,
--    exam 프로젝트(exam_attempts)의 name과 매칭해 점수 조회
-- ============================================================
create table interns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,          -- exam_attempts.name 과 동일하게 입력해야 점수 매칭됨
  role        text,
  start_date  date not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table brands enable row level security;
alter table jobs enable row level security;
alter table leads enable row level security;
alter table careers_jobs enable row level security;
alter table career_applications enable row level security;
alter table media_links enable row level security;
alter table interns enable row level security;

-- 공개 읽기: brands / jobs / careers_jobs(열린 공고) / media_links
create policy "brands public read" on brands for select using (true);
create policy "jobs public read" on jobs for select using (true);
create policy "careers_jobs public read" on careers_jobs for select using (true);
create policy "media_links public read" on media_links for select using (true);

-- leads: anon은 insert만(신청), 본인 확인 후 unsubscribed 갱신은 select+update 허용
-- (전화번호를 아는 사람만 조회/해지 가능 — exam 프로젝트와 동일한 신뢰 수준의 MVP 정책)
create policy "leads anon insert" on leads for insert to anon with check (true);
create policy "leads anon select" on leads for select to anon using (true);
create policy "leads anon update unsubscribe" on leads for update to anon using (true) with check (true);

-- career_applications: anon insert만(지원서 제출), 조회는 관리자만
create policy "career_applications anon insert" on career_applications for insert to anon with check (true);

-- authenticated(관리자 1인) = 전체 테이블 전체 권한
create policy "authenticated full brands" on brands for all to authenticated using (true) with check (true);
create policy "authenticated full jobs" on jobs for all to authenticated using (true) with check (true);
create policy "authenticated full leads" on leads for all to authenticated using (true) with check (true);
create policy "authenticated full careers_jobs" on careers_jobs for all to authenticated using (true) with check (true);
create policy "authenticated full career_applications" on career_applications for all to authenticated using (true) with check (true);
create policy "authenticated full media_links" on media_links for all to authenticated using (true) with check (true);
create policy "authenticated full interns" on interns for all to authenticated using (true) with check (true);
