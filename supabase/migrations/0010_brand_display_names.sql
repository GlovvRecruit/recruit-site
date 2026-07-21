-- 관심 기업 선택 화면에서 법인명 아래 대표 브랜드명(최대 3개)을 보여주기 위한 컬럼.
alter table brands add column if not exists brand_names text[];
