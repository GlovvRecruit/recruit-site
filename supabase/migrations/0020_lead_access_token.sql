-- 카톡 알림의 "더 많은 공고 보기" 링크에서 관심 공고 탭을 바로 열려면, 링크를 받은 사람이
-- 자기 구독 정보(관심 브랜드·직무)를 복원할 수 있어야 한다. 구독은 로그인 없이 localStorage로만
-- 유지되는데, 카카오톡 인앱 브라우저는 저장소가 분리돼 있어 링크로 들어오면 구독 정보가 비어
-- 있고 탭 자체가 나타나지 않는다. 그래서 리드마다 불투명 토큰을 두고 링크에 실어 보낸다.
-- (토큰은 그 사람의 카톡으로만 전달되며, 노출 범위는 기존 알림 해지 링크와 같은 수준이다.)
alter table leads add column access_token uuid not null default gen_random_uuid();

create unique index leads_access_token_idx on leads (access_token);
