# Glovv 채용 사이트 — 빌드 스펙

> 전체 맥락은 `CLAUDE.md`를 먼저 읽을 것. 이 문서는 데이터 모델과 기능별 완료 기준만 다룬다.
> **⚠️ 법적 사항(개인정보/전자상거래법/발송 규정)은 전문가 검토 필요. 본 문서는 자문이 아님.**

---

## 0. 범위

**앤마들린(주) 글로브(Glovv)/플릭스(Flixx)**의 채용 사이트. 두 축:
1. 타 뷰티 브랜드 채용 공고 큐레이션 (`/brand-jobs`, `/jobs/[id]`) — 열람은 완전 공개, 알림 신청은
   휴대폰 번호 기반(로그인 없음). **이 데이터는 admin 수동 입력이 아니라 브랜드 자사 채용 페이지
   크롤링으로 채울 예정**(크롤러 자체는 아직 미구축).
2. 자사(글로브/플릭스) 채용 (`/careers`, `/careers/[id]`) — 인턴/정규직 공고, 인재풀 등록.
   **admin의 "채용 공고" 탭은 이 자사 공고만 관리한다.**

부가 화면: `/about`, `/media`, `/admin`(관리자 전용).

---

## 1. 데이터 모델

`supabase/migrations/0001_init.sql`이 소스 오브 트루스. 핵심 테이블:

| 테이블 | 용도 |
|---|---|
| `brands` | 브랜드(법인). `profile_ai`(AI 매력도)는 `profile_reviewed=true` 전까지 비공개. **admin에서 수동 생성하지 않음** — 크롤링 파이프라인 구축 전까지는 비어 있거나 샘플 폴백으로 표시됨 |
| `jobs` | 브랜드 채용 공고. `status`(open/closed)만 있고 "신규 감지" 개념은 없음(이번 스코프 밖). `brands`와 마찬가지로 admin 수동 입력 대상 아님 |
| `leads` | 알림 신청자. `phone`으로 식별, 로그인 없음. `unsubscribed`로 해지 표시 |
| `careers_jobs` | 자사(글로브/플릭스) 채용 공고. **admin "채용 공고" 탭이 관리하는 유일한 공고 테이블** |
| `career_applications` | 자사 채용 지원(Tally 웹훅으로 자동 적재, `raw_payload`/`tally_submission_id` 컬럼) + 인재풀 등록(`CareersApplyForm`에서 직접 insert) |
| `media_links` | 보도자료·행사 링크 |
| `interns` | 화면상 "매니저" 관리(admin 전용). `start_date` 기준 6개월/1년 마일스톤 계산, exam 점수는 `name`으로 매칭해 조회(exam과 Supabase 프로젝트를 공유하므로 같은 클라이언트로 `exam_attempts` 조회). 직무(role) 필드는 UI에서 더 이상 쓰지 않음 |

RLS는 CLAUDE.md §6 참조 (exam 프로젝트와 동일한 "anon 제한 + authenticated 전권" 모델).

---

## 2. 기능별 완료 기준

### 2.1 브랜드 공고 열람 (`/brand-jobs`, `/jobs/[id]`)
- 완료 기준: 직무 필터가 정확히 동작, `status='closed'` 공고는 기본 목록에서 제외, 원문은 항상
  `source_url`로 링크아웃(전체 복제 없음).

### 2.2 알림 신청 (`/onboarding`)
- 3단계: 관심 브랜드(다중) → 관심 직무(다중, 5개 중) → 휴대폰 번호 + 카카오 채널 동의(필수) +
  마케팅 동의(선택).
- 완료 기준: `leads`에 phone/brand_ids/categories/marketing_opt_in 저장. 채널 동의 없이는 제출 불가.

### 2.3 알림 해지 (`/brand-jobs`의 "신규 공고 알림 그만받기" 모달)
- 완료 기준: 등록된 phone과 일치하는 `leads` row의 `unsubscribed`를 true로 갱신. 없는 번호는 에러 표시.

### 2.4 자사 채용 (`/careers`, `/careers/[id]`)
- 완료 기준: 진행 중(`status='open'`) 공고만 목록 노출, 인재풀 등록 폼은 `career_applications`에 저장,
  지원 버튼은 실제 Tally 폼(`RGzKbK`)을 임베드.

### 2.5 관리자 (`/admin`)
- Supabase Auth 이메일/비밀번호 로그인 필수. 로그인 후 4개 탭:
  - **대시보드**: brands/열린 jobs/leads(미해지)/career_applications/media_links 실카운트 +
    각 카운트가 어디서 채워지는지 안내(브랜드/공고는 크롤링 예정, 지원은 Tally 웹훅 포함).
  - **채용 공고**: **자사(`careers_jobs`) 공고만** CRUD. 타 브랜드 공고는 여기서 만들지 않음.
  - **MEDIA**: media_links CRUD.
  - **매니저**: interns 테이블 CRUD(이름·입사일·메모만, 직무 없음) + 입사일 기준 6개월/1년
    D-day 계산 + exam 프로젝트 점수 실시간 조회 + brand-helper/exam 어드민/Tally 응답 외부 링크.
- 완료 기준: env 미설정 시 크래시 없이 안내 화면만 표시(공개 페이지는 항상 정상 동작).

### 2.6 매니저 마일스톤 + exam 연동
- admin에서 매니저 이름 + 입사일 입력 → 6개월 시점/1년 시점 날짜와 D-day를 자동 계산해 표시.
- 같은 화면에서 (exam과 공유하는) Supabase 프로젝트의 `exam_attempts`를 이름으로 조회해 응시
  시험별 최종 점수(`total_score`)를 함께 보여준다. **이름이 정확히 일치해야 매칭됨** — 오탈자 주의.
- 완료 기준: Supabase env가 없으면 "연동 미설정" 안내만 표시(크래시 없음). env가 있으면 이 사이트의
  자체 데이터와 exam 점수가 같은 클라이언트로 함께 조회된다(별도 설정 불필요).

### 2.7 Tally 지원서 웹훅
- `/careers/[id]`의 "지원하기"는 Tally 폼(임베드)을 연다. Tally 제출은 Tally 자체 DB에만 남고
  우리 DB에는 자동으로 안 들어오므로, `app/api/tally-webhook/route.ts`가 Tally의 웹훅 POST를
  받아 `career_applications`에 service role 키로 insert한다(이름/연락처/직무/포트폴리오는 필드
  라벨 키워드 매칭으로 best-effort 추출, 원본은 `raw_payload`에 그대로 저장).
- 완료 기준: Tally 폼 Settings → Integrations → Webhooks에 이 사이트의 웹훅 URL이 등록되어 있어야
  실제로 동작(코드는 준비됐지만 Tally 쪽 등록은 사용자가 직접 해야 함 — CLAUDE.md §8 참고).
  동일 제출의 웹훅 재시도는 `tally_submission_id` 유니크 인덱스로 중복 저장 방지.

---

## 3. MVP 범위 밖 (다음 단계)

- 카카오 친구톡 실제 발송 파이프라인(pg_cron + SOLAPI 등 발송대행사 연동). 지금은 리드 캡처까지만.
- 타 뷰티 브랜드 채용 공고 크롤링 파이프라인 — `brands`/`jobs`를 채울 크롤러 자체가 아직 없음.
- 공고 "신규 감지"(diff/dedup, `first_seen_at` 기준 발송 트리거) — 크롤러가 없으니 이것도 스코프 밖.
- brand-helper(인턴 Q&A RAG)와의 데이터 레벨 통합 — 현재는 admin 내 링크만.

---

## 4. 준수사항

1. 오직 브랜드가 직접 제공했거나 확인된 공고만 등록. 종합 포털 크롤링 없음(크롤러 자체가 없음).
2. 공고 원문 전체 복제·재게시 금지 → 링크아웃.
3. AI 매력도는 사람 검수(`profile_reviewed`) 전 비공개.
4. 개인정보(휴대폰 번호): 수집 목적(알림) 외 사용 금지, 마케팅 동의는 별도 체크박스로 분리.
5. 비밀키는 `.env.local`에만, 커밋 금지.
