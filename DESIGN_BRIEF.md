# Glovv 채용 사이트 — 디자인 브리프

> 디자인 소스는 사용자가 Claude Design으로 만든 `*.dc.html` 프로토타입 8종 + `SiteNav.dc.html`
> (about/admin/brand-jobs/careers/careers-detail/job-detail/media/onboarding) 및 그 `README.md`.
> 이 문서는 실제 구현이 그 디자인과 어떻게 대응되는지 + 의도적으로 다르게 만든 부분을 정리한다.

---

## 1. 화면 ↔ 라우트 매핑

| 디자인 파일 | 실제 라우트 | 비고 |
|---|---|---|
| `SiteNav.dc.html` | `components/SiteNav.tsx` | 4개 링크: ABOUT / 자사 채용 / 브랜드 공고 / MEDIA |
| `about.dc.html` | `/about` (루트 `/`도 여기로 리다이렉트) | |
| `brand-jobs.dc.html` | `/brand-jobs` | 회사/브랜드 2단 구조 없이 **브랜드 단일 목록**으로 단순화 |
| `job-detail.dc.html` | `/jobs/[id]` | 브랜드 프로필 섹션 포함(별도 페이지로 분리하지 않음) |
| `onboarding.dc.html` | `/onboarding` | 카카오 로그인 없음 — 3단계 마지막에 **휴대폰 번호 입력** 추가 |
| `careers.dc.html` | `/careers` | |
| `careers-detail.dc.html` | `/careers/[id]` | Tally 폼 ID는 placeholder |
| `media.dc.html` | `/media` | |
| `admin.dc.html` | `/admin` | 탭 구성 다름: 대시보드/채용공고/MEDIA/**인턴**(신규) |

## 2. 톤 & 토큰

`app/globals.css`에 이식됨: 브랜드 그라디언트(오렌지 `#FA7035` → 핑크 `#FF0099`), 카카오
옐로우 `#FEE500`/브라운 `#191600`, 성공 그린 `#12A150`, 정보 블루 `#2B7FFF`, 그레이 스케일
`--gray-50`~`--gray-900`. 폰트 Pretendard Variable, 아이콘 Phosphor(`ph`/`ph-bold`/`ph-fill`).
**데스크톱 우선**(본문 최대폭 1120px, 좁은 페이지는 860px/820px/480px) — 이전 버전의 모바일 앱
셸(바텀내비, 420px 고정폭)은 완전히 제거됨.

## 3. 의도적으로 디자인과 다르게 만든 부분

- **회사→브랜드 2단 구조 생략**: 원본 디자인은 `아모레퍼시픽(라네즈, 설화수, 이니스프리)`처럼
  법인 아래 여러 브랜드가 묶인 구조지만, 실제 스키마(`brands` 테이블)는 평평한(flat) 브랜드
  목록이라 그렇게 단순화함. 온보딩/브랜드공고 필터도 동일하게 평평한 목록.
- **PARTNERS 로고 벽(careers-detail)**: 원본은 실제 유명 브랜드명(AMOREPACIFIC, LANEIGE 등)을
  텍스트 로고로 나열하지만, 실제 파트너십이 확인되지 않은 브랜드명을 나열하는 건 오해를 살 수
  있어 **우리 DB의 실제 등록 브랜드**(`getBrands()`)로 대체함.
- **AFTER 1 YEAR 역할 적합도 매칭 카드**: 원본의 복잡한 fit-score 카드(직무별 요구사항 체크리스트
  + 매칭율 배지)는 정적 마케팅 카피이고 데이터 모델과 연결되지 않아, 단순 "이런 일을 해요/이런
  분을 찾아요/근무 조건" 3섹션으로 대체함. 필요하면 나중에 정교화 가능.
- **Admin 대시보드의 인구통계 차트(연령대/구직상태 막대그래프)**: 원본은 응답자 나이·구직상태
  분포를 보여주지만, 이 사이트는 그런 설문 데이터를 수집하지 않음(로그인이 없어 수집할 방법도
  없음). 가짜 숫자를 채우는 대신 **실제 Supabase 카운트**(브랜드 수/열린 공고 수/리드 수/지원서
  수/MEDIA 링크 수)로 대체하고, 인구통계는 "수집하지 않는다"고 명시.
- **온보딩 3단계**: 원본은 카카오 채널 추가 + 동의 토글만 있고 식별자가 없는데, 리드를 나중에
  찾을 방법(해지 등)이 필요해 **휴대폰 번호 입력 필드를 추가**함.
- **Admin 인턴 탭**: 원본 `admin.dc.html`에는 없는 화면. 사용자 요청으로 신규 추가 — 입사일 기반
  6개월/1년 마일스톤 + GlovvRecruit/exam 프로젝트 점수 실시간 조회.

## 4. 데이터와 맞아야 하는 필드

카드/상세에 쓰는 값은 `supabase/migrations/0001_init.sql`의 `brands`/`jobs`/`careers_jobs`/
`media_links`/`interns` 필드와 정확히 일치해야 함 (`lib/types.ts` 참고). 새 필드가 필요하면
마이그레이션 파일과 타입을 함께 갱신할 것.
