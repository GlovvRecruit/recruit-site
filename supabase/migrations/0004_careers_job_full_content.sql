-- 자사 채용 공고 상세 페이지를 admin에서 전부 편집할 수 있도록 컬럼 추가.
-- hashtags: "#태그1 #태그2 #태그3" 형태 원문 그대로 저장, 화면에서 '#' 기준으로 분리해 렌더링.
-- benefit_items: 한 줄에 "제목 - 설명" 형식으로 최대 3개, 화면에서 파싱해 카드로 렌더링.

alter table careers_jobs
  add column if not exists employment_type text not null default 'fulltime', -- 'intern' | 'fulltime'
  add column if not exists hashtags text,
  add column if not exists benefit_title text,
  add column if not exists benefit_items text,
  add column if not exists show_related boolean not null default true;

-- 기존 시드 데이터(tag='인턴')는 employment_type도 맞춰준다.
update careers_jobs set employment_type = 'intern' where tag = '인턴';
