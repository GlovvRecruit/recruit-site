-- 일부 브랜드는 상세 설명을 텍스트가 아니라 이미지 배너로만 게시한다(OCR 없이는 텍스트
-- 추출 불가). 이미지 URL이라도 그대로 보여줄 수 있도록 별도 컬럼에 저장한다.

alter table jobs add column if not exists description_images text[];
alter table crawled_jobs_staging add column if not exists description_images text[];
