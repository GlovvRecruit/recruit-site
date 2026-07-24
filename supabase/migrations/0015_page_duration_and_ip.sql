-- 체류시간(page_duration) 이벤트, 클릭 이벤트 IP 중복 제거를 위한 ip 컬럼 추가.
alter table page_views add column if not exists ip text;
alter table page_views add column if not exists duration_ms integer;
create index if not exists page_views_ip_event_type_idx on page_views (ip, event_type);

alter table page_views drop constraint if exists page_views_event_type_check;
alter table page_views add constraint page_views_event_type_check
  check (event_type in (
    'view',
    'deep_scroll',
    'alert_cta_click',
    'onboarding_submit',
    'apply_click',
    'apply_submit',
    'page_duration'
  ));
