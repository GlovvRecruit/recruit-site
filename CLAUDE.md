@AGENTS.md

# CLAUDE.md — Glovv 채용 사이트 (Claude Code 작업 지침)

이 저장소에서 코딩할 때 **항상 이 파일을 먼저 읽는다**. 디자인 레퍼런스는 사용자가 Claude Design으로
만든 `*.dc.html` 파일들(about/admin/brand-jobs/careers/careers-detail/job-detail/media/onboarding/SiteNav)이며,
그 파일들은 룩앤필 참고용 프로토타입일 뿐 실제 코드가 아니다(README.md 참고). 실제 구현은 이 Next.js 앱.

## 1. 프로젝트 정체

**스마트린 주식회사**가 운영하는 두 서비스 **Glovv**(뷰티 릴스 플랫폼)와 **Flixx**(AI 뷰티 애니메이션)의
채용 사이트. 두 갈래로 구성:
1. **브랜드 공고 피드** (`/brand-jobs`) — 뷰티 브랜드 채용 공고를 큐레이션, 관심 브랜드·직무를 등록하면
   카카오톡 알림(추후 발송 파이프라인 연동 예정). **로그인 없음** — 휴대폰 번호로 리드를 식별.
2. **자사 채용** (`/careers`) — Glovv/Flixx 자체 채용(인턴·정규직), 인재풀 등록, FAQ.

부가: `/about`(회사 소개), `/media`(보도자료), `/admin`(운영자 전용, Supabase Auth 로그인).

## 2. 이전 버전과의 핵심 차이 (중요)

이 저장소는 원래 "카카오 OAuth 로그인 + 모바일 앱 셸(바텀내비)" 컨셉으로 시작했었다.
**Glovv 디자인 시스템 반영 후 전면 재설계**하며 다음이 바뀌었다:
- 모바일 앱 셸(바텀내비/mypage/kakao-preview 화면) 제거 → **데스크톱 우선 마케팅 사이트**(`SiteNav` 상단 고정 내비, 최대폭 1120px/860px 등)로 전환.
- 사용자 로그인(카카오 OAuth) 폐기 → **휴대폰 번호 기반 리드 캡처**(`leads` 테이블)로 단순화. 계정·세션 없음.
- 신규 공고 감지(diff/dedup) 로직은 스펙에서 보류 — 지금은 "현재 열린 공고"만 보여주는 단순 모델.
- 자사 채용(`/careers`, `/careers/[id]`)과 MEDIA(`/media`), 그리고 **admin 전체**가 새로 생김.

## 3. 외부 연동 저장소

- **GlovvRecruit/exam** (로컬: `C:\Users\park7\exam`, 배포: `glovvrecruit.github.io/exam/`) — 인턴 시험
  웹앱. 순수 HTML/JS. **이 사이트와 동일한 Supabase 프로젝트("Glovv's Project", ref
  `onwvrsjvdsrsxpzxjvml`)를 공유**한다(Supabase 무료 플랜 조직당 2프로젝트 제한 때문에 새로 만들지
  않고 재사용하기로 결정함, 2026-07-20). admin 인턴 탭이 그 프로젝트의 `exam_attempts` 테이블을
  같은 Supabase 클라이언트로 그냥 조회한다 — 별도 env 불필요. 점수 매칭은 **이름 문자열 일치**이므로
  admin에서 인턴을 등록할 때 exam 응시자명과 정확히 같은 이름을 입력해야 한다. exam의 관리자 계정
  (`youjin@glovv.co.kr`)이 이 사이트 `/admin` 로그인에도 그대로 쓰인다(Supabase Auth 사용자가 같은
  프로젝트에 있으므로).
- **GlovvRecruit/Flixx-CS-chat** ("brand-helper", 로컬: `C:\Users\park7\brand-helper`, 배포:
  `brand-helper.vercel.app`) — 인턴용 사내 Q&A RAG 챗봇. **별도 Supabase 프로젝트**("Flixx-CS",
  ref `mizlhwccwsrvrlltfpfn`) + 별도 Vercel 프로젝트. 이 저장소의 admin에는 **링크만** 걸려 있다
  (깊은 데이터 연동 없음 — 성격이 다른 도구이고 프로젝트도 다르기 때문).

## 4. 기술 스택

- Next.js 16(App Router) + TypeScript + Tailwind v4. **Vercel 배포**.
- Supabase: exam과 공유하는 프로젝트 하나. 이 사이트 전용 테이블은 `brands`/`jobs`/`leads`/
  `careers_jobs`/`career_applications`/`media_links`/`interns` (`supabase/migrations/0001_init.sql`,
  `exam_attempts`는 건드리지 않음).
- 관리자 인증: **Supabase Auth 이메일/비밀번호** (exam과 계정 공유). 관리자 계정은
  Supabase Dashboard → Authentication → Users에서 관리. GitHub OAuth 아님.
- 폰트: Pretendard Variable(CDN). 아이콘: Phosphor Icons(`@phosphor-icons/web` CDN, regular/bold/fill).
- GitHub: `github.com/GlovvRecruit/recruit-site` (public). Supabase CLI(`supabase link` +
  `supabase db query --linked`)로 마이그레이션을 관리형 API 경유로 적용함 — DB 비밀번호 불필요.

## 5. 데이터 흐름 / 폴백 동작 (중요)

`lib/data.ts`의 서버용 조회 함수(`getBrands`/`getJobs`/`getCareersJobs`/`getMediaLinks`)는
**`NEXT_PUBLIC_SUPABASE_URL`이 비어 있으면 자동으로 `data/sample-jobs.ts`, `data/sample-content.ts`의
샘플 데이터로 대체**한다. 즉 `.env.local`을 채우기 전에도 화면은 항상 정상적으로 보인다.
Supabase를 연결하면 자동으로 실데이터로 전환됨 — 코드 수정 불필요.

admin(`/admin`)은 클라이언트 전용(Supabase Auth 세션을 브라우저에서 확인)이라 서버 폴백이 없다.
env가 비어 있으면 "Supabase가 아직 연결되지 않았어요" 안내 화면만 보여주고 크래시하지 않는다
(`app/admin/page.tsx`의 `hasSupabaseEnv` 가드).

## 6. RLS 정책 원칙 (exam 프로젝트와 동일한 신뢰 모델)

- `brands`/`jobs`/`careers_jobs`/`media_links`: **공개 읽기**.
- `leads`: anon이 insert/select/update 가능(로그인 없는 휴대폰 기반 구독·해지 흐름이라 불가피 — MVP
  수준의 신뢰 모델, 프로덕션에서 리드 규모가 커지면 재검토 필요).
- `career_applications`: anon insert만(지원서 제출), 조회는 관리자만.
- `interns`: **authenticated(관리자)만** 전체 권한 — 공개 접근 없음.
- 위 모든 테이블에서 authenticated(관리자 1인)는 전체 CRUD 가능.

## 7. 반드시 지켜야 할 일

1. 공고 원문 전체 복제·재게시 금지 → `source_url`로 링크아웃. 카드/상세의 사실(브랜드·직무·경력·지역)만.
2. 브랜드 AI 매력도(`profile_ai`)는 `profile_reviewed=true`(사람 검수 완료) 이전에는 UI에서 이미
   숨겨지는 구조(`app/jobs/[id]/page.tsx`, `app/careers/[id]/page.tsx` 참고) — 이 가드를 건드리지 말 것.
3. 표준 직무는 5개만: `마케팅 / MD / BD·PM / 운영 / 세일즈` (`lib/types.ts`의 `JOB_CATEGORIES`).
4. Tailwind v4 임의값 클래스 작성 시 기본 spacing 스케일(0~4는 0.5 단위, 이후 정수만)에 없는 소수
   (예: `p-4.5`, `mb-13`)는 렌더링만 되고 스타일이 적용되지 않는다 — 반드시 `p-[18px]` 같은 대괄호
   임의값을 쓸 것. (이 세션에서 실제로 여러 번 발생한 실수이니 새로 스타일 작성 시 주의.)
5. 비밀키는 `.env.local`에만. 커밋 금지(`.gitignore`에 이미 포함).

## 8. 남은 작업 (Definition of Done 미완료 항목)

- [x] GitHub 푸시 (`GlovvRecruit/recruit-site`) — 2026-07-20
- [x] Supabase 마이그레이션 적용 (exam과 공유 프로젝트) — 2026-07-20
- [x] Vercel 배포 (`beauty-recruit.vercel.app`) + 환경변수 설정 — 2026-07-20. **단, Vercel
  계정에 GitHub 로그인 연결이 안 되어 있어 저장소 auto-deploy는 미연결** — 지금은 `vercel --prod`로
  수동 배포함. push할 때마다 자동 배포하려면 vercel.com → 계정 설정 → Login Connections에서
  GitHub 연결 필요(사용자가 직접, 인터랙티브 OAuth라 CLI로 대신할 수 없음).
- [ ] TOP 브랜드 실제 데이터 입력 (admin 채용 공고 탭에서, 지금은 샘플 데이터가 화면에 보임 —
  실 DB에는 아직 브랜드/공고 row가 없음)
- [ ] 카카오 친구톡 발송 파이프라인(pg_cron + 발송대행사 API) — 현재는 리드 캡처까지만 구현, 실제
  발송은 미구현. 원래 PROJECT_SPEC의 "신규 감지 → 다이제스트 발송" 로직은 이번 리디자인에서 범위 밖.
- [x] Tally 지원서 폼 연결 (`RGzKbK`) — 2026-07-20
