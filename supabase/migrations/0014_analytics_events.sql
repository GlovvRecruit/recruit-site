-- 방문자 구분(고유 방문자 집계)을 위한 익명 visitor_id, 클릭 퍼널 추적을 위한 이벤트 타입 확장.
alter table page_views add column if not exists visitor_id text;
create index if not exists page_views_visitor_id_idx on page_views (visitor_id);
create index if not exists page_views_created_at_idx on page_views (created_at);

alter table page_views drop constraint if exists page_views_event_type_check;
alter table page_views add constraint page_views_event_type_check
  check (event_type in (
    'view',
    'deep_scroll',
    'alert_cta_click',
    'onboarding_submit',
    'apply_click',
    'apply_submit'
  ));
