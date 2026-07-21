-- 온보딩에서 "더 많은 회사의 알림을 받아보고 싶으신가요?"에 입력한 회사명을 기록.
-- admin이 어떤 회사가 요청되었는지 확인할 수 있도록 별도 테이블로 관리한다.

create table brand_requests (
  id             uuid primary key default gen_random_uuid(),
  requested_name text not null,
  phone          text,
  created_at     timestamptz not null default now()
);

alter table brand_requests enable row level security;

create policy "brand_requests anon insert" on brand_requests for insert to anon with check (true);
create policy "authenticated full brand_requests" on brand_requests for all to authenticated using (true) with check (true);
