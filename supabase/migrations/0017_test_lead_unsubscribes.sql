-- 테스트 온보딩 플로우에서 "알림 해지"를 확정한 기록. test_leads는 insert-only라 기존 행을
-- 갱신하지 않고, 해지 이벤트를 별도 테이블에 남겨 추후 발송 파이프라인이 이 표와 대조해
-- 해지자에게 보내지 않도록 참고할 수 있게 한다.
create table test_lead_unsubscribes (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null,
  brand_ids       uuid[] not null default '{}',
  categories      text[] not null default '{}',
  unsubscribed_at timestamptz not null default now()
);

alter table test_lead_unsubscribes enable row level security;

create policy "test_lead_unsubscribes anon insert" on test_lead_unsubscribes for insert to anon with check (true);
create policy "authenticated full test_lead_unsubscribes" on test_lead_unsubscribes for all to authenticated using (true) with check (true);
