create table insight_links (
  id          uuid primary key default gen_random_uuid(),
  group_label text not null default '웨비나',  -- '웨비나' | '아티클' 등
  title       text not null,
  url         text not null,
  created_at  timestamptz not null default now()
);

alter table insight_links enable row level security;

create policy "insight_links public read" on insight_links for select using (true);
create policy "authenticated full insight_links" on insight_links for all to authenticated using (true) with check (true);
