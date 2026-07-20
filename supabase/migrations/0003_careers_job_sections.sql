-- 자사 채용 공고 상세의 "이런 일을 해요 / 이런 분을 찾아요 / 근무 조건·혜택" 섹션을
-- admin에서 직접 입력할 수 있도록 컬럼 추가. 값은 줄바꿈(Enter)으로 구분된 텍스트 —
-- 화면에서는 한 줄씩 체크리스트 항목으로 렌더링한다.

alter table careers_jobs
  add column if not exists responsibilities text,
  add column if not exists requirements text,
  add column if not exists nice_to_haves text,
  add column if not exists benefits text;
