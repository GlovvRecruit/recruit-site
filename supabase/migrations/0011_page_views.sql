create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  event_type text not null check (event_type in ('view', 'deep_scroll')),
  brand_id uuid references brands(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_path_idx on page_views (path);
create index if not exists page_views_brand_id_idx on page_views (brand_id);
create index if not exists page_views_event_type_idx on page_views (event_type);

alter table page_views enable row level security;

-- anon 접근 없음(수집은 /api/track 라우트가 service role 키로 RLS 우회). authenticated(관리자)만 조회.
create policy "authenticated read page_views" on page_views
  for select to authenticated using (true);
