-- 그리팅HR/나인하이어/자사 홈페이지 채용 크롤링 확장 후보 조사용 내부 테스팅 테이블.
-- "글로브 이용 브랜드 명단"(2,376개)을 씨딩해두고, 회사별로 채용 채널(자사몰/그리팅/나인하이어/
-- 사람인·잡코리아·원티드 전용이라 제외)을 하나씩 조사해서 채워나간다. 고객 대상 기능이 아니라
-- admin 내부 조사 도구라 anon 접근은 필요 없다.
create table crawl_candidate_brands (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  list_rank        int not null,
  status           text not null default 'unresearched',
    -- 'unresearched' | 'active'(이미 운영 중) | 'own_site' | 'greetinghr' | 'ninehire' | 'excluded' | 'not_found'
  career_url       text,
  matched_brand_id uuid references brands(id),
  notes            text,
  researched_at    timestamptz,
  created_at       timestamptz not null default now()
);

create index crawl_candidate_brands_status_idx on crawl_candidate_brands (status);
create index crawl_candidate_brands_list_rank_idx on crawl_candidate_brands (list_rank);

alter table crawl_candidate_brands enable row level security;

create policy "authenticated full crawl_candidate_brands" on crawl_candidate_brands for all to authenticated using (true) with check (true);
