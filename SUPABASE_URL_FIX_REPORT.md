# 🔧 Supabase URL 하드코딩 문제 해결 보고서

**생성일**: 2025-11-05
**수정자**: Claude Code
**상태**: ✅ 완료

---

## 📋 목차

1. [문제 요약](#문제-요약)
2. [근본 원인 분석](#근본-원인-분석)
3. [해결 방법](#해결-방법)
4. [수정된 파일](#수정된-파일)
5. [검증 절차](#검증-절차)
6. [테스트 방법](#테스트-방법)
7. [향후 예방 조치](#향후-예방-조치)

---

## 문제 요약

### 증상
- 로그인 시도 시 잘못된 Supabase URL (`frytwgfbxmbigrskarpt.supabase.co`) 사용
- 환경 변수에는 올바른 URL (`jspajkepyfkmwsmoveqy.supabase.co`)이 설정되어 있음
- 사용자 인증이 YouTube Industry 프로젝트의 Supabase로 잘못 연결됨

### 영향 범위
- **영향 받는 기능**: 모든 클라이언트 사이드 인증 (로그인, 회원가입, OAuth)
- **영향 받지 않는 기능**: 서버 사이드 인증, YouTube Industry 기능
- **심각도**: 🔴 Critical (인증 불가)

---

## 근본 원인 분석

### 1️⃣ 문제가 발생한 파일

**파일**: `src/lib/supabase/client.ts`

**문제 코드** (수정 전):
```typescript
export function createClient() {
  // 🔥 Priority: YouTube Industry Supabase if available, otherwise main Supabase
  const supabaseUrl =
    process.env.NEXT_PUBLIC_YT_SUPABASE_URL ||  // ❌ 잘못된 우선순위!
    process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabaseKey =
    process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY ||  // ❌ 잘못된 우선순위!
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

### 2️⃣ 근본 원인

1. **잘못된 우선순위 로직**
   - 클라이언트 생성 시 YouTube Industry Supabase URL을 먼저 확인
   - `.env.local`에 두 URL이 모두 설정되어 있어 YouTube Industry URL이 항상 선택됨

2. **환경 변수 설정**
   ```bash
   # Main Supabase (The Founder app)
   NEXT_PUBLIC_SUPABASE_URL=https://jspajkepyfkmwsmoveqy.supabase.co  ✅

   # YouTube Industry Supabase (별도 프로젝트)
   NEXT_PUBLIC_YT_SUPABASE_URL=https://frytwgfbxmbigrskarpt.supabase.co  ✅
   ```

3. **의도하지 않은 동작**
   - The Founder 앱의 인증이 YouTube Industry Supabase로 연결됨
   - 결과: 로그인/회원가입 실패 (다른 프로젝트의 auth 테이블 사용)

### 3️⃣ 아키텍처 분석

프로젝트는 **2개의 독립적인 Supabase 인스턴스**를 사용:

| Supabase 인스턴스 | 용도 | URL | 클라이언트 파일 |
|------------------|------|-----|----------------|
| **Main Supabase** | The Founder 앱 인증, 북마크 등 | `jspajkepyfkmwsmoveqy` | `src/lib/supabase/client.ts` ✅ |
| **YouTube Industry** | YouTube 통계 데이터 전용 | `frytwgfbxmbigrskarpt` | `src/lib/youtube-supabase/client.ts` ✅ |

**문제**: `src/lib/supabase/client.ts`가 YouTube Industry URL을 우선 사용하도록 잘못 구현됨

---

## 해결 방법

### ✅ 수정 내용

**파일**: `src/lib/supabase/client.ts`

**수정 후 코드**:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Use main Supabase for The Founder app authentication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }

  // Validation: Ensure we're using the correct Supabase instance
  console.log('[Supabase Client] Creating browser client with URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('[Supabase Client] Expected URL prefix: https://jspajkepyfkmwsmoveqy')

  if (!supabaseUrl.includes('jspajkepyfkmwsmoveqy')) {
    console.error('❌ [Supabase Client] WARNING: Using incorrect Supabase URL!')
    console.error('Expected: jspajkepyfkmwsmoveqy.supabase.co')
    console.error('Got:', supabaseUrl)
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
```

### 🔑 주요 변경 사항

1. **YouTube Industry URL 우선순위 제거**
   - `NEXT_PUBLIC_YT_SUPABASE_URL` 체크 완전 삭제
   - Main Supabase URL만 사용하도록 단순화

2. **검증 로직 추가**
   - 올바른 Supabase URL 사용 확인
   - 브라우저 콘솔에 경고 메시지 출력 (잘못된 URL 사용 시)

3. **명확한 주석 추가**
   - 이 클라이언트는 The Founder 앱 인증 전용임을 명시
   - YouTube Industry는 별도 클라이언트 사용

---

## 수정된 파일

### 1️⃣ 수정된 파일

| 파일 경로 | 변경 유형 | 설명 |
|----------|----------|------|
| `src/lib/supabase/client.ts` | 수정 | YouTube Industry URL 우선순위 제거, 검증 로직 추가 |

### 2️⃣ 확인된 올바른 파일

다음 파일들은 **수정 불필요** (이미 올바르게 설정됨):

| 파일 경로 | 사용 URL | 상태 |
|----------|---------|------|
| `src/lib/supabase/server.ts` | Main Supabase | ✅ 정상 |
| `src/lib/supabase/admin.ts` | Main Supabase | ✅ 정상 |
| `src/app/api/auth/callback/route.ts` | Main Supabase (server client 사용) | ✅ 정상 |
| `src/lib/youtube-supabase/client.ts` | YouTube Industry Supabase | ✅ 정상 (별도 클라이언트) |

### 3️⃣ YouTube Industry 관련 파일

다음 40개 파일은 YouTube Industry Supabase를 **의도적으로** 사용 (정상):
- `src/app/api/admin/youtube/**/*.ts`
- `src/lib/youtube-api/**/*.ts`
- `scripts/update-youtube-data.ts`
- 기타 YouTube Industry 관련 API 및 스크립트

---

## 검증 절차

### ✅ Phase 1: 프로젝트 전체 검색 (완료)

**명령어**:
```bash
grep -r "frytwgfbxmbigrskarpt" .
```

**결과**:
- ✅ 하드코딩된 URL 없음
- ✅ 문서 및 마이그레이션 파일에만 참조 (정상)

### ✅ Phase 2: 특정 파일 확인 (완료)

**확인한 파일**:
- ✅ `src/lib/supabase/client.ts` - 수정 완료
- ✅ `src/lib/supabase/server.ts` - 정상
- ✅ `src/lib/supabase/admin.ts` - 정상
- ✅ `src/app/api/auth/callback/route.ts` - 정상
- ✅ `src/lib/auth/oauth.ts` - 정상

### ✅ Phase 3: TypeScript 컴파일 확인 (완료)

**명령어**:
```bash
npx tsc --noEmit
```

**결과**:
- ✅ 수정한 코드는 타입 오류 없음
- ℹ️ 기존 프로젝트의 다른 TypeScript 오류는 본 수정과 무관

### ✅ Phase 4: 개발 서버 재시작 (완료)

**명령어**:
```bash
npm run dev
```

**결과**:
- ✅ 서버 정상 시작 (포트 3001)
- ✅ 환경 변수 정상 로드 (`.env.local`)

---

## 테스트 방법

### 1️⃣ 브라우저 콘솔 확인

1. **브라우저 열기**
   ```
   http://localhost:3001
   ```

2. **개발자 도구 열기** (F12)

3. **콘솔에서 다음 메시지 확인**:
   ```
   [Supabase Client] Creating browser client with URL: https://jspajkepyfkmwsmoveq...
   [Supabase Client] Expected URL prefix: https://jspajkepyfkmwsmoveqy
   ```

   **예상 결과**:
   - ✅ URL이 `jspajkepyfkmwsmoveqy`로 시작
   - ✅ 경고 메시지 없음

   **잘못된 경우**:
   - ❌ URL이 `frytwgfbxmbigrskarpt`로 시작
   - ❌ 콘솔에 경고 메시지 출력

### 2️⃣ 로그인 테스트

1. **회원가입 페이지 이동**:
   ```
   http://localhost:3001/auth/signup
   ```

2. **Google 로그인 버튼 클릭**:
   - "Google로 계속하기" 버튼 클릭

3. **네트워크 탭 확인** (개발자 도구):
   - 필터: `supabase`
   - 확인할 URL: `https://jspajkepyfkmwsmoveqy.supabase.co/auth/v1/...`

   **예상 결과**:
   - ✅ 모든 요청이 `jspajkepyfkmwsmoveqy.supabase.co`로 전송됨
   - ❌ `frytwgfbxmbigrskarpt.supabase.co`로 요청 없음

### 3️⃣ 북마크 기능 테스트

1. **로그인 후 포스트 페이지 이동**

2. **북마크 버튼 클릭**

3. **네트워크 탭 확인**:
   - 북마크 API 요청이 올바른 Supabase URL 사용하는지 확인

   **예상 결과**:
   - ✅ `https://jspajkepyfkmwsmoveqy.supabase.co/rest/v1/bookmarks`

### 4️⃣ YouTube Industry 기능 확인 (선택)

YouTube Industry 기능은 **별도 Supabase**를 사용해야 함:

1. **YouTube Industry 페이지 이동**:
   ```
   http://localhost:3001/youtube-industry
   ```

2. **브라우저 콘솔 확인**:
   - YouTube Industry 관련 요청은 `frytwgfbxmbigrskarpt.supabase.co` 사용 (정상)

---

## 향후 예방 조치

### 1️⃣ 환경 변수 명명 규칙

**권장 사항**:
- Main Supabase: `NEXT_PUBLIC_SUPABASE_URL` (변경 없음)
- Feature별 Supabase: `NEXT_PUBLIC_[FEATURE]_SUPABASE_URL` (예: `NEXT_PUBLIC_YT_SUPABASE_URL`)

**규칙**:
- Main 앱 인증은 **항상** `NEXT_PUBLIC_SUPABASE_URL` 사용
- Feature별 기능은 **전용 클라이언트 파일** 생성 (예: `src/lib/youtube-supabase/client.ts`)

### 2️⃣ 클라이언트 파일 분리

**Good Practice**:
```
src/lib/
├── supabase/
│   ├── client.ts       # Main app auth (NEXT_PUBLIC_SUPABASE_URL만 사용)
│   ├── server.ts       # Main app server-side
│   └── admin.ts        # Main app admin
└── youtube-supabase/
    └── client.ts       # YouTube Industry only (NEXT_PUBLIC_YT_SUPABASE_URL 사용)
```

### 3️⃣ 타입 안전성 강화

**향후 개선 아이디어**:

```typescript
// src/lib/supabase/client.ts
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // 런타임 검증 강화
  if (!supabaseUrl.includes('jspajkepyfkmwsmoveqy')) {
    throw new Error(
      `Invalid Supabase URL for main app. ` +
      `Expected: jspajkepyfkmwsmoveqy.supabase.co, Got: ${supabaseUrl}`
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
```

### 4️⃣ 문서화

**필수 문서**:
- ✅ `SUPABASE_URL_FIX_REPORT.md` (이 문서)
- ✅ `GOOGLE_OAUTH_SETUP.md` (이미 존재)
- 📝 `ARCHITECTURE.md` (추가 권장) - Supabase 인스턴스 아키텍처 설명

---

## 요약

### ✅ 해결 완료

1. **근본 원인 파악**: `src/lib/supabase/client.ts`의 잘못된 우선순위 로직
2. **수정 완료**: YouTube Industry URL 우선순위 제거, Main Supabase만 사용
3. **검증 로직 추가**: 브라우저 콘솔에서 URL 확인 가능
4. **테스트**: TypeScript 컴파일, 서버 재시작 완료

### 📋 사용자 액션 필요

1. **브라우저 테스트**:
   - `http://localhost:3001` 접속
   - 개발자 도구 콘솔에서 Supabase URL 확인
   - 로그인/회원가입 테스트

2. **Google OAuth 설정** (별도):
   - `GOOGLE_OAUTH_SETUP.md` 참고
   - Supabase Dashboard에서 Google Provider 활성화
   - Google Cloud Console 설정

3. **북마크 마이그레이션** (선택):
   - `supabase/migrations/20251105000000_create_bookmarks.sql` 실행
   - Supabase Dashboard 또는 CLI 사용

---

**수정 완료**: 2025-11-05
**다음 단계**: 브라우저에서 로그인 테스트 후 결과 확인
