-- 카카오 알림 신청 플로우 재설계 검증용 테스트 테이블. 실제 leads와 완전히 분리해서,
-- 테스트 제출 건이 주간 카카오 발송 크론(실제 브랜드메시지 발송 대상)에 절대 섞이지 않게 한다.
create table test_leads (
  id                uuid primary key default gen_random_uuid(),
  phone             text not null,
  brand_ids         uuid[] not null default '{}',
  categories        text[] not null default '{}',
  marketing_opt_in  boolean not null default false,
  channel_verified  boolean not null default false, -- Kakao.Channel.followChannel() 실제 검증 결과
  created_at        timestamptz not null default now()
);

alter table test_leads enable row level security;

-- anon(테스트 페이지 방문자)이 insert만 가능. 조회는 관리자만.
create policy "test_leads anon insert" on test_leads for insert to anon with check (true);
create policy "authenticated full test_leads" on test_leads for all to authenticated using (true) with check (true);
