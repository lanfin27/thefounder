# Notion Sync Debugging Scripts

Notion 싱크 문제를 진단하고 해결하기 위한 유틸리티 스크립트 모음입니다.

## 🛠️ 스크립트 목록

### 1. check-env.ts
환경변수가 올바르게 설정되어 있는지 확인합니다.

```bash
npx tsx scripts/check-env.ts
```

**확인 항목:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role 키 (admin 권한)
- `NOTION_TOKEN` - Notion Integration 토큰
- `NOTION_DATABASE_ID` - Notion 데이터베이스 ID

**예상 결과:**
```
🔍 Checking environment variables...

✅ NEXT_PUBLIC_SUPABASE_URL:
   https://xxxxx.supabase.co...
   Length: 52 characters

✅ SUPABASE_SERVICE_ROLE_KEY:
   eyJhbGciOiJIUzI1NiIsI...
   Length: 284 characters

✅ NOTION_TOKEN:
   secret_xxxxxxxxxxxx...
   Length: 50 characters

✅ NOTION_DATABASE_ID:
   23dfe518311280c780d0...
   Length: 32 characters

============================================================
✅ All required environment variables are set
```

### 2. check-db-schema.ts
Supabase `posts` 테이블의 스키마를 확인합니다.

```bash
npx tsx scripts/check-db-schema.ts
```

**확인 항목:**
- 테이블 존재 여부
- 컬럼 목록 및 타입
- 필수 컬럼 존재 여부
- 샘플 데이터 통계

**예상 결과:**
```
🔍 Checking Supabase posts table schema...

📡 Fetching sample data from posts table...

✅ Posts table exists and has data
📊 Total columns: 15

============================================================
📋 Column names and types:

   1. id                  (string  ) = "2adfe518-3112-80dc..."
   2. title               (string  ) = "성공하고 싶으면 거절해..."
   3. slug                (string  ) = "success-entrepreneur-2adfe518"
   4. content             (string  ) = "<h2>성공하면 할수록:</h2>..."
   5. category            (string  ) = "성공사례"
   ...

============================================================

🔍 Checking required columns:

  ✅ id
  ✅ title
  ✅ slug
  ✅ content
  ✅ category
  ✅ status
  ✅ published_date
  ✅ updated_at

============================================================
✅ All required columns are present
```

### 3. test-single-post.ts
Supabase 연결을 테스트하기 위해 단일 테스트 포스트를 생성/저장/삭제합니다.

```bash
npx tsx scripts/test-single-post.ts
```

**수행 작업:**
1. 테스트 포스트 생성
2. Supabase에 upsert
3. 저장된 데이터 검증
4. 테스트 포스트 자동 삭제

**예상 결과:**
```
🧪 Testing single post update...

📝 Test post data:
   ID: test-1700123456789
   Title: 🧪 TEST POST - 2024-11-16T...
   Slug: test-post-1700123456789
   Category: Test
   Tags: test, debug
   Content length: 256 characters

🚀 Upserting test post to Supabase...

✅ Test post saved successfully!

📊 Returned data:
   ID: test-1700123456789
   Title: 🧪 TEST POST - 2024-11-16T...
   Slug: test-post-1700123456789
   Updated at: 2024-11-16T12:34:56.789Z

============================================================

🔍 Verifying saved post...

✅ Post verified in database!
   Title: 🧪 TEST POST - 2024-11-16T...
   Content preview: <h2>Test Post</h2>...

============================================================

🗑️  Cleaning up test post...

✅ Test post deleted successfully

============================================================

🎉 Database connectivity test PASSED!
   Your Supabase connection is working correctly.
   You can now proceed with Notion sync.
```

## 🚀 사용 시나리오

### 시나리오 1: Notion 싱크가 작동하지 않을 때

```bash
# 1단계: 환경변수 확인
npx tsx scripts/check-env.ts

# 2단계: DB 스키마 확인
npx tsx scripts/check-db-schema.ts

# 3단계: DB 연결 테스트
npx tsx scripts/test-single-post.ts

# 4단계: 실제 싱크 실행
# Admin 페이지에서 Sync 버튼 클릭
```

### 시나리오 2: 콘텐츠 업데이트가 반영되지 않을 때

```bash
# 1단계: DB에 데이터가 있는지 확인
npx tsx scripts/check-db-schema.ts

# 2단계: 최근 업데이트 시간 확인
# Supabase Dashboard > Table Editor > posts
# updated_at 컬럼 확인

# 3단계: 캐시 클리어 후 재확인
# 브라우저: Ctrl + Shift + R
# Next.js: rm -rf .next && npm run dev
```

### 시나리오 3: 특정 포스트만 저장 실패할 때

```bash
# 1단계: DB 스키마 확인 (누락된 컬럼이 있는지)
npx tsx scripts/check-db-schema.ts

# 2단계: 테스트 포스트로 연결 확인
npx tsx scripts/test-single-post.ts

# 3단계: 로그에서 실패한 포스트 찾기
# dev server 로그에서 에러 메시지 확인
```

## 🔧 문제 해결

### Error: "NEXT_PUBLIC_SUPABASE_URL is not set"

**원인:** 환경변수가 설정되지 않음

**해결:**
1. `.env.local` 파일 확인
2. 변수 이름이 정확한지 확인
3. Dev server 재시작: `npm run dev`

### Error: "Error querying posts table"

**원인:**
- 테이블이 존재하지 않음
- Service Role Key가 잘못됨
- RLS 정책 문제

**해결:**
1. Supabase Dashboard에서 `posts` 테이블 확인
2. Service Role Key 재확인
3. RLS 정책이 Service Role을 차단하는지 확인

### Error: "Failed to fetch saved post"

**원인:**
- 저장은 되었으나 조회 권한 문제
- 네트워크 문제

**해결:**
1. Supabase Dashboard에서 직접 확인
2. Service Role Key 권한 확인

## 📝 추가 팁

### TSX 실행이 안 될 때

```bash
# tsx 글로벌 설치
npm install -g tsx

# 또는 프로젝트 의존성으로 추가
npm install -D tsx
```

### 환경변수 파일 위치

```
project-root/
├── .env.local          # 로컬 개발용 (gitignore됨)
├── .env.development    # 개발 환경
├── .env.production     # 프로덕션 환경
└── .env.example        # 예시 파일 (커밋됨)
```

### Supabase Service Role Key 찾기

1. Supabase Dashboard 접속
2. Settings > API
3. Project API keys > `service_role` 키 복사

### Notion Integration 토큰 찾기

1. https://www.notion.so/my-integrations
2. 해당 Integration 선택
3. "Internal Integration Token" 복사

## 🎯 다음 단계

스크립트 실행 후:

1. ✅ 모든 스크립트가 성공 → Admin에서 Notion 싱크 실행
2. ❌ 스크립트 실패 → 에러 메시지 확인 후 수정
3. ⚠️  부분 성공 → 실패한 부분만 수정 후 재실행

## 📚 관련 문서

- [Supabase 문서](https://supabase.com/docs)
- [Notion API 문서](https://developers.notion.com)
- [Next.js 환경변수](https://nextjs.org/docs/basic-features/environment-variables)
