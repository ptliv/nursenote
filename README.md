# NurseNote

간호학과 학생을 위한 실습 기록·AI 초안 생성 서비스.
의료적 진단·처방을 제공하지 않으며, 모든 생성 결과는 학습 참고용 초안입니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Auth / DB**: Supabase (PostgreSQL + RLS)
- **AI**: OpenAI gpt-4o-mini
- **Styling**: Tailwind CSS
- **Deploy**: Vercel

## 로컬 개발

```bash
cp .env.local.example .env.local   # 환경변수 설정
npm install
npm run dev                         # http://localhost:3000
```

또는 `run.bat` 더블클릭 (Windows)

## 환경변수

`.env.local.example` 파일을 복사 후 값을 채워주세요.

### 필수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public 키 (Settings → API) |
| `OPENAI_API_KEY` | OpenAI API 키 (platform.openai.com) |

### 선택 (미설정 시 기본값 사용)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `OPENAI_MODEL` | `gpt-4o-mini` | SOAP·실습일지 생성 모델 |
| `OPENAI_CASE_STUDY_MODEL` | `OPENAI_MODEL` 값 | 케이스스터디 전용 모델 |
| `OPENAI_TIMEOUT_MS` | `20000` | OpenAI 응답 타임아웃 (ms) |
| `CASE_STUDY_PRO_ONLY` | `false` | `true` 시 free 사용자 케이스스터디 차단 |
| `CASE_STUDY_FREE_MONTHLY_LIMIT` | `5` | `0` 이면 무제한 |
| `PRACTICE_LOG_PRO_ONLY` | `false` | `true` 시 free 사용자 실습일지 차단 |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 현재 코드에서 사용하지 않습니다. 설정하지 않아도 됩니다.

## Vercel 배포

### 1단계 — Supabase 설정

- [ ] Supabase 프로젝트 생성
- [ ] `supabase/schema.sql` 실행 (SQL Editor에서 전체 붙여넣기)
- [ ] 마이그레이션 순서대로 실행:
  1. `supabase/migrations/20260313_soap_input_hash.sql`
  2. `supabase/migrations/20260313_journal_drafts.sql`
  3. `supabase/migrations/20260313_case_study_drafts.sql`
  4. `supabase/migrations/20260313_draft_styles.sql`
- [ ] Auth → URL Configuration 설정:
  - Site URL: `https://your-domain.vercel.app`
  - Redirect URLs: `https://your-domain.vercel.app/**`
- [ ] Auth → Email Templates 확인 (필요 시 한국어로 수정)

### 2단계 — Vercel 설정

- [ ] GitHub 연결 후 Import
- [ ] Framework Preset: **Next.js** (자동 감지)
- [ ] 환경변수 등록 (Settings → Environment Variables):

  **필수**
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  OPENAI_API_KEY
  ```

  **선택**
  ```
  OPENAI_MODEL
  OPENAI_CASE_STUDY_MODEL
  OPENAI_TIMEOUT_MS
  CASE_STUDY_PRO_ONLY
  CASE_STUDY_FREE_MONTHLY_LIMIT
  PRACTICE_LOG_PRO_ONLY
  ```

- [ ] Deploy

### 3단계 — 배포 후 확인

- [ ] `/login` 접속 → 회원가입 정상 작동
- [ ] 회원가입 후 `/dashboard` 리다이렉트 확인
- [ ] SOAP 초안 생성 테스트
- [ ] 실습일지 초안 생성 테스트
- [ ] 케이스스터디 초안 생성 테스트
- [ ] 무료 한도 (월 5회) 초과 시 upgrade CTA 표시 확인

### 커스텀 도메인 연결 (선택)

1. Vercel → Settings → Domains → 도메인 추가
2. DNS 레코드 설정 (CNAME 또는 A record)
3. Supabase → Auth → URL Configuration → Site URL 업데이트
4. Supabase → Redirect URLs에 새 도메인 추가

## 빌드 검증

```bash
npm run build   # 빌드 오류 확인
npm run lint    # lint 오류 확인
npx tsc --noEmit  # 타입 오류 확인
```

## 프로젝트 구조

```
app/
  (auth)/          # 로그인·회원가입 페이지
  (app)/           # 인증 필요 페이지
    dashboard/
    memos/         # practice_notes CRUD
    soap/          # SOAP 초안 생성
    practice-log/  # 실습일지 초안 생성
    case-study/    # 케이스스터디 초안 생성
    drugs/         # 약물 학습 카드
  api/
    soap/          # POST /api/soap
    practice-log/  # POST /api/practice-log
    case-study/    # POST /api/case-study
    journal/       # POST /api/journal
actions/           # Server Actions (CRUD, 사용량 조회)
lib/
  supabase/        # Supabase 클라이언트 (client/server/queries)
  soap/            # SOAP 생성 서비스
  journal/         # 실습일지 생성 서비스
  practice-log/    # practice-log 서비스 (journal 래퍼)
  case-study/      # 케이스스터디 생성 서비스
  drafts/          # 스타일 preset (문장형/혼합형/기록형)
supabase/
  schema.sql       # 전체 스키마
  migrations/      # 증분 마이그레이션
```
