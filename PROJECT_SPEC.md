# Glovv 채용 사이트 — 빌드 스펙

> 전체 맥락은 `CLAUDE.md`를 먼저 읽을 것. 이 문서는 데이터 모델과 기능별 완료 기준만 다룬다.
> **⚠️ 법적 사항(개인정보/전자상거래법/발송 규정)은 전문가 검토 필요. 본 문서는 자문이 아님.**

---

## 0. 범위

**스마트린(주) Glovv/Flixx**의 채용 사이트. 두 축:
1. 뷰티 브랜드 채용 공고 큐레이션 (`/brand-jobs`, `/jobs/[id]`) — 열람은 완전 공개, 알림 신청은
   휴대폰 번호 기반(로그인 없음).
2. 자사(Glovv/Flixx) 채용 (`/careers`, `/careers/[id]`) — 인턴/정규직 공고, 인재풀 등록.

부가 화면: `/about`, `/media`, `/admin`(관리자 전용).

---

## 1. 데이터 모델

`supabase/migrations/0001_init.sql`이 소스 오브 트루스. 핵심 테이블:

| 테이블 | 용도 |
|---|---|
| `brands` | 브랜드(법인). `profile_ai`(AI 매력도)는 `profile_reviewed=true` 전까지 비공개 |
| `jobs` | 브랜드 채용 공고. `status`(open/closed)만 있고 "신규 감지" 개념은 없음(이번 스코프 밖) |
| `leads` | 알림 신청자. `phone`으로 식별, 로그인 없음. `unsubscribed`로 해지 표시 |
| `careers_jobs` | 자사 채용 공고 |
| `career_applications` | 자사 채용/인재풀 지원서 |
| `media_links` | 보도자료·행사 링크 |
| `interns` | 인턴 관리(admin 전용). `start_date` 기준 6개월/1년 마일스톤 계산, exam 점수는 `name`으로 매칭해 조회(exam과 Supabase 프로젝트를 공유하므로 같은 클라이언트로 `exam_attempts` 조회) |

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
  지원 모달(Tally iframe)은 실제 폼 ID 연결 전까지는 placeholder.

### 2.5 관리자 (`/admin`)
- Supabase Auth 이메일/비밀번호 로그인 필수. 로그인 후 4개 탭:
  - **대시보드**: brands/열린 jobs/leads(미해지)/career_applications/media_links 실카운트.
  - **채용 공고**: 브�드 CRUD + 공고 CRUD (jobs.status 토글 포함).
  - **MEDIA**: media_links CRUD.
  - **인턴**: interns CRUD + 입사일 기준 6개월/1년 D-day 계산 + exam 프로젝트 점수 실시간 조회 +
    brand-helper/exam 어드민 외부 링크.
- 완료 기준: env 미설정 시 크래시 없이 안내 화면만 표시(공개 페이지는 항상 정상 동작).

### 2.6 인턴 마일스톤 + exam 연동 (신규 요구사항)
- admin에서 인턴 이름 + 입사일 입력 → 6개월 시점/1년 시점 날짜와 D-day를 자동 계산해 표시.
- 같은 화면에서 (exam과 공유하는) Supabase 프로젝트의 `exam_attempts`를 인턴 이름으로 조회해 응시
  시험별 최종 점수(`total_score`)를 함께 보여준다. **이름이 정확히 일치해야 매칭됨** — 오탈자 주의.
- 완료 기준: Supabase env가 없으면 "연동 미설정" 안내만 표시(크래시 없음). env가 있으면 이 사이트의
  자체 데이터와 exam 점수가 같은 클라이언트로 함께 조회된다(별도 설정 불필요).

---

## 3. MVP 범위 밖 (다음 단계)

- 카카오 친구톡 실제 발송 파이프라인(pg_cron + SOLAPI 등 발송대행사 연동). 지금은 리드 캡처까지만.
- 공고 "신규 감지"(diff/dedup, `first_seen_at` 기준 발송 트리거) — 크롤러 자체도 이번 스코프 밖.
- brand-helper(인턴 Q&A RAG)와의 데이터 레벨 통합 — 현재는 admin 내 링크만.
- 실제 Tally 지원서 폼 연결.
- TOP 브랜드 실 데이터 조사·입력(현재는 admin에서 직접 입력하는 구조만 존재).

---

## 4. 준수사항

1. 오직 브랜드가 직접 제공했거나 확인된 공고만 등록. 종합 포털 크롤링 없음(크롤러 자체가 없음).
2. 공고 원문 전체 복제·재게시 금지 → 링크아웃.
3. AI 매력도는 사람 검수(`profile_reviewed`) 전 비공개.
4. 개인정보(휴대폰 번호): 수집 목적(알림) 외 사용 금지, 마케팅 동의는 별도 체크박스로 분리.
5. 비밀키는 `.env.local`에만, 커밋 금지.
