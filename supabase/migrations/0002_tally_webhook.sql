-- 자사 채용 지원은 Tally 폼(RGzKbK)으로 들어오기 때문에, 우리 DB에 자동으로 남지 않는다.
-- Tally 웹훅이 이 컬럼들로 제출 데이터를 적재한다 (app/api/tally-webhook/route.ts 참고).

alter table career_applications
  add column if not exists raw_payload jsonb,
  add column if not exists tally_submission_id text;

-- 웹훅 재시도로 인한 중복 저장 방지
create unique index if not exists career_applications_tally_submission_uniq
  on career_applications (tally_submission_id)
  where tally_submission_id is not null;

-- 웹훅은 service_role 키로 insert하므로 anon insert 정책은 더 이상 필요 없지만,
-- CareersApplyForm(인재풀 등록)이 여전히 anon insert를 쓰므로 정책은 유지한다.
