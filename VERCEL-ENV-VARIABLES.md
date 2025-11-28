# Vercel 환경 변수 설정 완전 가이드

**프로젝트**: The Founder
**생성일**: 2025-11-28
**환경 변수 총 개수**: 17개 (필수) + 10개 (선택)

---

## 목차

1. [환경 변수 개요](#환경-변수-개요)
2. [필수 환경 변수 (17개)](#필수-환경-변수-17개)
3. [선택 환경 변수 (10개)](#선택-환경-변수-10개)
4. [Vercel 설정 방법](#vercel-설정-방법)
5. [검증 및 테스트](#검증-및-테스트)
6. [문제 해결](#문제-해결)
7. [보안 주의사항](#보안-주의사항)

---

## 환경 변수 개요

### 전체 환경 변수 요약

| 카테고리 | 개수 | 필수 여부 |
|---------|------|----------|
| **Core Application** | 1 | ✅ 필수 |
| **Main Supabase** | 3 | ✅ 필수 |
| **YouTube Industry Supabase** | 3 | ✅ 필수 |
| **YouTube Data API** | 1 | ✅ 필수 |
| **Notion CMS** | 2 | ✅ 필수 |
| **Admin & Security** | 4 | ✅ 필수 |
| **YouTube Cron Job** | 1 | ✅ 필수 |
| **Google OAuth** | 2 | ⏰ 선택 |
| **Redis (Background Jobs)** | 5 | ⏰ 선택 |
| **Scraping Services** | 2 | ⏰ 선택 |
| **SEO Verification** | 2 | ⏰ 선택 |
| **Proxy & Monitoring** | 5 | ⏰ 선택 |

**총 필수**: 17개
**총 선택**: 10개

### 환경 변수 타입 설명

| 타입 | 접두사 | 설명 | 보안 레벨 |
|------|--------|------|----------|
| **공개** | `NEXT_PUBLIC_*` | 클라이언트에서 접근 가능, 브라우저에 노출됨 | 🟢 안전 |
| **서버 전용** | (없음) | 서버에서만 사용, 클라이언트 노출 불가 | 🟡 주의 |
| **비밀** | (없음) | API 키, 시크릿, 서비스 역할 키 | 🔴 절대 노출 금지 |

---

## 필수 환경 변수 (17개)

### 1. Core Application

#### 1.1 NEXT_PUBLIC_SITE_URL

**설명**:
사이트의 기본 URL입니다. SEO 메타데이터, Open Graph, sitemap, structured data 생성에 사용됩니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전

**현재값 (.env.local)**:
```
http://localhost:3000
```

**Vercel 설정값**:

| Environment | 값 |
|-------------|-----|
| **Production** | `https://thefounder.vercel.app` 또는 커스텀 도메인 |
| **Preview** | `https://thefounder-git-$VERCEL_GIT_COMMIT_REF.vercel.app` |
| **Development** | `http://localhost:3000` |

**사용 위치**:
- `src/app/layout.tsx` - 메타데이터 생성
- `src/app/sitemap.ts` - Sitemap URL 생성
- `src/components/seo/StructuredData.tsx` - Schema.org 데이터

**중요**:
- 반드시 프로토콜(`https://`) 포함
- 끝에 슬래시(`/`) 제외
- 배포 완료 후 실제 도메인으로 업데이트 필수

**검증 방법**:
```javascript
// 브라우저 콘솔에서
console.log(process.env.NEXT_PUBLIC_SITE_URL)
```

---

### 2. Main Supabase (블로그 메인 데이터베이스)

#### 2.1 NEXT_PUBLIC_SUPABASE_URL

**설명**:
The Founder 메인 Supabase 프로젝트 URL입니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전 (RLS로 보호됨)

**현재값 (.env.local)**:
```
[Your Supabase URL]
```

**Vercel 설정값**:
```
Environment: All (Production, Preview, Development)
Name: NEXT_PUBLIC_SUPABASE_URL
Value: [Your Supabase URL]
```

**발급 위치**:
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. `The Founder` 프로젝트 선택
3. Settings → API
4. Project URL 복사

**사용 테이블**:
- `posts` - 블로그 포스트
- `categories` - 카테고리
- `users` - 사용자
- `bookmarks` - 북마크
- 기타 메인 앱 데이터

---

#### 2.2 NEXT_PUBLIC_SUPABASE_ANON_KEY

**설명**:
Supabase 익명 공개 키입니다. 클라이언트에서 Supabase 접근 시 사용됩니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전 (RLS로 보호됨)

**현재값 (.env.local)**:
```
[Your Supabase Anon Key]
```

**Vercel 설정값**:
```
Environment: All
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [위 값 그대로 복사]
```

**발급 위치**:
- Supabase Dashboard → Settings → API → **anon public** (주의: service_role 아님!)

**중요**:
- 매우 긴 JWT 토큰 (약 200+ 글자)
- 전체를 복사해야 함 (중간에 끊기지 않도록)
- `eyJ`로 시작하는 문자열

---

#### 2.3 SUPABASE_SERVICE_ROLE_KEY

**설명**:
Supabase 서비스 역할 키입니다. 서버에서 Row Level Security(RLS)를 우회할 때 사용됩니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
[Copy from your .env.local - Supabase Service Role Key]
```

**Vercel 설정값**:
```
Environment: All
Name: SUPABASE_SERVICE_ROLE_KEY
Value: [위 값 그대로 복사]
```

**발급 위치**:
- Supabase Dashboard → Settings → API → **service_role** (secret)

**⚠️ 보안 경고**:
- 절대 `NEXT_PUBLIC_` 접두사 사용 금지!
- 관리자 권한을 가지므로 모든 데이터 접근 가능
- Git에 커밋 금지
- 클라이언트 코드에서 절대 사용 금지

**사용 위치**:
- API 라우트 (서버 컴포넌트)
- 관리자 기능
- Cron job

---

### 3. YouTube Industry Index Supabase (유튜브 산업 지표 전용)

#### 3.1 NEXT_PUBLIC_YT_SUPABASE_URL

**설명**:
YouTube Industry Index 전용 Supabase 프로젝트 URL입니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전

**현재값 (.env.local)**:
```
[Your YouTube Supabase URL]
```

**Vercel 설정값**:
```
Environment: All
Name: NEXT_PUBLIC_YT_SUPABASE_URL
Value: [Your YouTube Supabase URL]
```

**발급 위치**:
- Supabase Dashboard → `YouTube Industry` 프로젝트 → Settings → API

**사용 테이블**:
- `channels` - YouTube 채널 데이터
- `channel_history` - 채널 통계 히스토리
- `channel_categories` - 채널 카테고리

---

#### 3.2 NEXT_PUBLIC_YT_SUPABASE_ANON_KEY

**설명**:
YouTube Industry Supabase 익명 키입니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전

**현재값 (.env.local)**:
```
[Your YouTube Supabase Anon Key]
```

**Vercel 설정값**:
```
Environment: All
Name: NEXT_PUBLIC_YT_SUPABASE_ANON_KEY
Value: [위 값 그대로 복사]
```

---

#### 3.3 YT_SUPABASE_SERVICE_KEY

**설명**:
YouTube Industry Supabase 서비스 역할 키입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
[Copy from your .env.local - YouTube Supabase Service Key]
```

**Vercel 설정값**:
```
Environment: All
Name: YT_SUPABASE_SERVICE_KEY
Value: [위 값 그대로 복사]
```

**사용 위치**:
- YouTube 채널 데이터 업데이트 cron job
- YouTube API 호출 후 DB 저장

---

### 4. YouTube Data API v3

#### 4.1 YOUTUBE_API_KEY

**설명**:
YouTube Data API v3 호출에 사용되는 API 키입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
[Copy from your .env.local or generate new from Google Cloud Console]
```

**Vercel 설정값**:
```
Environment: All
Name: YOUTUBE_API_KEY
Value: [Copy from your .env.local or generate new]
```

**발급 위치**:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. YouTube Data API v3 활성화
4. API 키 생성

**사용 위치**:
- `src/lib/youtube-api/` - YouTube API 호출
- `src/services/youtube.service.ts` - 채널 정보 조회
- YouTube Industry Index 데이터 수집

**할당량**:
- 일일 할당량: 10,000 units
- 채널 조회: 1 unit
- 검색: 100 units

**중요**:
- API 키 제한 설정 권장 (IP 또는 Referrer)
- 할당량 모니터링 필요

---

### 5. Notion CMS

#### 5.1 NOTION_TOKEN

**설명**:
Notion Integration API 토큰입니다. Notion 데이터베이스에서 블로그 포스트를 가져옵니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
[Copy from your .env.local file]
```

**Vercel 설정값**:
```
Environment: All
Name: NOTION_TOKEN
Value: [Copy from your .env.local file]
```

**발급 위치**:
1. [Notion Integrations](https://www.notion.so/my-integrations) 접속
2. "New integration" 생성
3. Internal Integration Token 복사
4. Notion 데이터베이스에 Integration 연결

**사용 위치**:
- Notion API 호출
- 포스트 자동 동기화
- CMS 데이터 가져오기

**참고**:
- `NOTION_API_KEY`라는 이름으로도 사용됨 (코드에 두 이름 모두 존재)
- 같은 값 사용

---

#### 5.2 NOTION_DATABASE_ID

**설명**:
Notion 데이터베이스 ID입니다. 블로그 포스트가 저장된 데이터베이스를 식별합니다.

**타입**: 서버 전용
**보안**: 🟡 주의

**현재값 (.env.local)**:
```
[Copy from your .env.local - 32-char hex string]
```

**Vercel 설정값**:
```
Environment: All
Name: NOTION_DATABASE_ID
Value: [Copy from your .env.local - 32-char hex string]
```

**발급 위치**:
- Notion 데이터베이스 URL에서 확인
- URL 형식: `https://www.notion.so/{workspace}/{DATABASE_ID}?v=...`
- 32자 16진수 문자열

**사용 테이블 속성** (한글):
- 제목 (Title)
- 요약 (Summary)
- 카테고리 (Category): 뉴스레터, SaaS, 블로그, 창업
- 태그 (Tags)
- 커버이미지 (Cover)
- 프리미엄 (Is Premium)
- 상태 (Status): 초안, 검토중, 발행
- 발행일 (Published Date)
- 작성자 (Author)
- Slug

---

### 6. Admin & Security

#### 6.1 ADMIN_TOKEN

**설명**:
관리자 기능 접근 인증 토큰입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
thefounder_admin_2025_secure
```

**Vercel 설정값**:
```
Environment: All
Name: ADMIN_TOKEN
Value: [강력한 랜덤 문자열로 변경 권장]
```

**생성 방법**:
```bash
# 안전한 랜덤 토큰 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**권장 설정**:
```
thefounder_admin_prod_[랜덤32자]_2025
```

**사용 위치**:
- 관리자 API 라우트
- YouTube 채널 관리
- 시스템 설정

---

#### 6.2 NEXT_PUBLIC_ADMIN_TOKEN

**설명**:
클라이언트에서 관리자 페이지 접근 확인용 토큰입니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟡 주의

**현재값 (.env.local)**:
```
thefounder_admin_2025_secure
```

**Vercel 설정값**:
```
Environment: All
Name: NEXT_PUBLIC_ADMIN_TOKEN
Value: [ADMIN_TOKEN과 동일하게 설정]
```

**참고**:
- `ADMIN_TOKEN`과 같은 값 사용
- 클라이언트 UI 표시용
- 실제 보안은 서버의 `ADMIN_TOKEN`으로 검증

---

#### 6.3 REVALIDATE_SECRET

**설명**:
On-Demand Revalidation API 보안 시크릿입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
your-random-secret-123
```

**Vercel 설정값**:
```
Environment: All
Name: REVALIDATE_SECRET
Value: [랜덤 생성 - 최소 32자 권장]
```

**생성 방법**:
```bash
# Node.js로 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 OpenSSL
openssl rand -hex 32
```

**권장 설정**:
```
revalidate_prod_[64자 16진수]
```

**사용 위치**:
- `/api/revalidate` 엔드포인트 (있는 경우)
- 캐시 무효화 API

**사용 예시**:
```bash
# Revalidate API 호출
curl -X POST https://thefounder.vercel.app/api/revalidate \
  -H "x-revalidate-secret: [REVALIDATE_SECRET]" \
  -d '{"path": "/posts"}'
```

---

#### 6.4 YT_CRON_SECRET

**설명**:
YouTube Industry Index cron job 보안 시크릿입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
yt_industry_cron_2025_secure_key_thefounder
```

**Vercel 설정값**:
```
Environment: All
Name: YT_CRON_SECRET
Value: [강력한 랜덤 문자열로 변경 권장]
```

**생성 방법**:
```bash
# 안전한 랜덤 토큰
node -e "console.log('yt_cron_' + require('crypto').randomBytes(32).toString('hex'))"
```

**사용 위치**:
- YouTube 채널 데이터 자동 업데이트 cron job
- Vercel Cron Job 인증

**Vercel Cron 설정**:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/youtube-industry/cron",
    "schedule": "0 0 * * *"
  }]
}
```

---

## 선택 환경 변수 (10개)

### 7. Google OAuth (선택사항)

#### 7.1 GOOGLE_CLIENT_ID

**설명**:
Google OAuth 로그인 클라이언트 ID입니다.

**타입**: 서버 전용
**보안**: 🟡 주의

**현재값 (.env.local)**:
```
[Copy from your .env.local or generate new from Google Cloud Console]
```

**사용 시기**:
Google 로그인 기능 활성화 시

**Vercel 설정값**:
```
Environment: All
Name: GOOGLE_CLIENT_ID
Value: [Google Cloud Console에서 생성]
```

**발급 위치**:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. OAuth 2.0 Client ID 생성
4. Authorized redirect URIs 추가:
   - `https://thefounder.vercel.app/api/auth/callback/google`

---

#### 7.2 GOOGLE_CLIENT_SECRET

**설명**:
Google OAuth 클라이언트 시크릿입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
[Copy from your .env.local or generate new from Google Cloud Console]
```

**Vercel 설정값**:
```
Environment: All
Name: GOOGLE_CLIENT_SECRET
Value: [Copy from your .env.local or generate new]
```

**주의**:
- 한 번만 표시되므로 즉시 복사
- 분실 시 재생성 필요

---

### 8. Redis (Background Jobs - 선택사항)

#### 8.1 REDIS_URL

**설명**:
Redis 연결 URL입니다. Bull Queue 사용 시 필요합니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!** (비밀번호 포함)

**현재값 (.env.local)**:
```
redis://default:v22umeneYjSI2habYEEWtrENXELTGjgB@redis-10978.c340.ap-northeast-2-1.ec2.redns.redis-cloud.com:10978
```

**사용 시기**:
Background job, 스크래핑 큐 사용 시

**Vercel 설정값**:
```
Environment: All (또는 Production만)
Name: REDIS_URL
Value: [Redis Cloud에서 제공하는 연결 URL]
```

**참고**:
- 빌드 에러의 Redis 경고는 무시 가능
- Background job 미사용 시 설정 불필요

---

#### 8.2 REDIS_HOST

**현재값**: `redis-10978.c340.ap-northeast-2-1.ec2.redns.redis-cloud.com`

#### 8.3 REDIS_PORT

**현재값**: `10978`

#### 8.4 REDIS_PASSWORD

**현재값**: `v22umeneYjSI2habYEEWtrENXELTGjgB`

#### 8.5 REDIS_DB

**현재값**: `0`

**참고**: `REDIS_URL`만 설정하면 위 개별 변수들은 설정하지 않아도 됩니다.

---

### 9. Scraping Services (선택사항)

#### 9.1 SCRAPINGBEE_API_KEY

**설명**:
ScrapingBee API 키입니다. 고급 웹 스크래핑에 사용됩니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
Y5CISNKKZFWX7B06PCM6EJPYCBIBO7OHRJFHZ645N7HK72VYYVS9PNCGW93M7BWY99JKHQBBFKLJPMLX
```

**사용 시기**:
Flippa 등 외부 사이트 스크래핑 기능 사용 시

**Vercel 설정값**:
```
Environment: Production (필요 시)
Name: SCRAPINGBEE_API_KEY
Value: [위 값 그대로 복사]
```

---

#### 9.2 SCRAPFLY_API_KEY

**설명**:
ScrapFly API 키입니다. 웹 스크래핑 대체 서비스입니다.

**타입**: 서버 전용 (비밀)
**보안**: 🔴 **절대 노출 금지!**

**현재값 (.env.local)**:
```
scp-live-e28ac185d94f4dc596986165fb4354e1
```

**Vercel 설정값**:
```
Environment: Production (필요 시)
Name: SCRAPFLY_API_KEY
Value: scp-live-e28ac185d94f4dc596986165fb4354e1
```

---

### 10. SEO Verification (배포 후 설정)

#### 10.1 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

**설명**:
Google Search Console 소유권 확인 코드입니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전

**설정 시기**:
배포 후 Google Search Console 등록 시

**Vercel 설정값**:
```
Environment: Production, Preview
Name: NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
Value: [Google Search Console에서 제공하는 코드]
```

**발급 위치**:
1. [Google Search Console](https://search.google.com/search-console)
2. 속성 추가
3. 소유권 확인 → HTML 태그 방식 선택
4. `content="..."` 값 복사

---

#### 10.2 NEXT_PUBLIC_NAVER_SITE_VERIFICATION

**설명**:
네이버 웹마스터 도구 소유권 확인 코드입니다.

**타입**: 공개 (`NEXT_PUBLIC_*`)
**보안**: 🟢 안전

**설정 시기**:
배포 후 네이버 웹마스터 도구 등록 시

**Vercel 설정값**:
```
Environment: Production, Preview
Name: NEXT_PUBLIC_NAVER_SITE_VERIFICATION
Value: [네이버 웹마스터 도구에서 제공하는 코드]
```

**발급 위치**:
1. [네이버 웹마스터 도구](https://searchadvisor.naver.com/)
2. 사이트 등록
3. 소유 확인 → HTML 태그 방식
4. `content="..."` 값 복사

---

## Vercel 설정 방법

### 방법 1: Vercel Dashboard (권장)

#### Step 1: Dashboard 접속

1. https://vercel.com 로그인
2. **The Founder** 프로젝트 선택
3. **Settings** 탭 클릭
4. 왼쪽 메뉴에서 **Environment Variables** 선택

#### Step 2: 환경 변수 추가

**각 환경 변수마다 반복**:

1. **"Add New"** 버튼 클릭

2. **Name** 입력:
   ```
   예: NEXT_PUBLIC_SITE_URL
   ```

3. **Value** 입력:
   ```
   예: https://thefounder.vercel.app
   ```

4. **Environment** 선택:
   - ✅ **Production**: 프로덕션 배포
   - ✅ **Preview**: PR 및 브랜치 배포
   - ⬜ **Development**: 로컬 개발 (선택사항)

   **권장**: 대부분의 변수는 **All** 선택

5. **"Save"** 버튼 클릭

#### Step 3: 모든 변수 추가 후 재배포

**중요**: 환경 변수는 새 배포부터 적용됩니다!

1. **Deployments** 탭으로 이동
2. 최신 배포 선택
3. 우측 **"..."** 메뉴 클릭
4. **"Redeploy"** 선택
5. **"Redeploy"** 버튼 클릭

---

### 방법 2: Vercel CLI (선택사항)

#### 설치

```bash
npm i -g vercel
vercel login
```

#### 환경 변수 추가

```bash
# Production 환경에 추가
vercel env add NEXT_PUBLIC_SITE_URL production

# 입력 프롬프트에 값 입력
# Value: https://thefounder.vercel.app

# Preview 환경에 추가
vercel env add NEXT_PUBLIC_SITE_URL preview

# Development 환경에 추가
vercel env add NEXT_PUBLIC_SITE_URL development
```

#### 환경 변수 목록 확인

```bash
vercel env ls
```

#### 환경 변수 삭제 (필요 시)

```bash
vercel env rm VARIABLE_NAME production
```

---

## 검증 및 테스트

### 1. 배포 전 체크리스트

```
□ 모든 필수 환경 변수 (17개) Vercel에 추가 완료
□ 각 변수의 값이 정확한지 확인
□ Environment 설정 (Production/Preview/Development) 확인
□ 보안 변수에 NEXT_PUBLIC_ 접두사가 없는지 확인
```

### 2. 배포 후 검증

#### 2.1 브라우저 콘솔 확인

```javascript
// F12 → Console
console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL)
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('YT Supabase:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL)
```

**예상 결과**:
```
Site URL: https://thefounder.vercel.app
Supabase URL: [Your Supabase URL]
YT Supabase: [Your YouTube Supabase URL]
```

#### 2.2 테스트 API 라우트 (임시)

**파일 생성**: `src/app/api/test-env/route.ts`

```typescript
export async function GET() {
  return Response.json({
    // 공개 변수
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ytSupabaseUrl: process.env.NEXT_PUBLIC_YT_SUPABASE_URL,

    // 비밀 변수 존재 여부만 확인
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasYtServiceKey: !!process.env.YT_SUPABASE_SERVICE_KEY,
    hasYouTubeKey: !!process.env.YOUTUBE_API_KEY,
    hasNotionToken: !!process.env.NOTION_TOKEN,
    hasAdminToken: !!process.env.ADMIN_TOKEN,
    hasRevalidateSecret: !!process.env.REVALIDATE_SECRET,
    hasCronSecret: !!process.env.YT_CRON_SECRET,
  })
}
```

**테스트**:
```bash
curl https://thefounder.vercel.app/api/test-env
```

**예상 결과**:
```json
{
  "siteUrl": "https://thefounder.vercel.app",
  "supabaseUrl": "[Your Supabase URL]",
  "ytSupabaseUrl": "[Your YouTube Supabase URL]",
  "hasServiceKey": true,
  "hasYtServiceKey": true,
  "hasYouTubeKey": true,
  "hasNotionToken": true,
  "hasAdminToken": true,
  "hasRevalidateSecret": true,
  "hasCronSecret": true
}
```

**중요**: 테스트 완료 후 이 파일 삭제!

#### 2.3 Vercel Dashboard 확인

1. Settings → Environment Variables
2. 모든 변수가 **"Hidden"**으로 표시되면 정상
3. 개수 확인: 최소 17개 (필수)

### 3. 기능별 테스트

#### 3.1 Main Supabase 연결

```bash
# 홈페이지 접속
https://thefounder.vercel.app

# 포스트 목록 확인
https://thefounder.vercel.app/posts
```

**확인**:
- 포스트가 정상 표시되면 Supabase 연결 성공
- 에러 발생 시 F12 → Console 확인

#### 3.2 YouTube Industry Index

```bash
# YouTube Industry 페이지 접속
https://thefounder.vercel.app/youtube-industry
```

**확인**:
- 채널 데이터가 표시되면 성공
- YouTube API 할당량 확인

#### 3.3 Notion CMS

```bash
# Notion에서 새 포스트 작성 후
# Revalidate API 호출 (또는 자동 동기화 확인)
```

---

## 문제 해결

### 문제 1: 환경 변수가 `undefined`로 나옴

**증상**:
```javascript
console.log(process.env.NEXT_PUBLIC_SITE_URL) // undefined
```

**원인**:
- 환경 변수가 Vercel에 설정되지 않음
- 재배포를 안 함
- 변수명 오타

**해결**:
```
1. Vercel Dashboard → Environment Variables 확인
2. 변수명 정확히 일치하는지 확인 (대소문자 구분!)
3. Deployments → Redeploy 실행
4. 캐시 클리어 (Hard Refresh: Ctrl+Shift+R)
```

---

### 문제 2: Supabase 연결 실패

**증상**:
```
Error: Failed to fetch posts
PostgrestError: ...
```

**확인 사항**:

1. **URL 확인**:
   ```
   ✅ [Your Supabase URL]
   ❌ jspajkepyfkmwsmoveqy.supabase.co (프로토콜 누락)
   ❌ [Your Supabase URL]/ (끝 슬래시)
   ```

2. **ANON KEY 확인**:
   ```
   ✅ eyJ로 시작하는 긴 문자열 (200+ 글자)
   ❌ 중간에 잘린 문자열
   ```

3. **Service Role Key 확인**:
   ```
   ✅ "service_role" 키 사용
   ❌ "anon" 키를 service_role에 설정
   ```

4. **Supabase Row Level Security**:
   - Supabase Dashboard → Authentication → Policies 확인
   - `posts` 테이블에 SELECT 정책이 있는지 확인

---

### 문제 3: YouTube API 호출 실패

**증상**:
```
Error: The API key is invalid
Error: Quota exceeded
```

**확인 사항**:

1. **API 키 확인**:
   - Google Cloud Console → Credentials
   - API 키가 활성화되어 있는지
   - YouTube Data API v3가 활성화되어 있는지

2. **할당량 확인**:
   - Google Cloud Console → APIs & Services → Quotas
   - 일일 10,000 units 제한 확인
   - 초과 시 다음 날 자정(PST) 리셋

3. **API 키 제한**:
   - IP 주소 제한 설정 시 Vercel IP 추가
   - 또는 제한 없음으로 설정 (비권장)

---

### 문제 4: Notion 데이터 가져오기 실패

**증상**:
```
Error: Could not find database
Error: Unauthorized
```

**확인 사항**:

1. **Integration 연결**:
   - Notion 데이터베이스 → ... → Connections
   - Integration이 연결되어 있는지 확인

2. **Token 확인**:
   - Notion Integrations 페이지에서 토큰 재확인
   - `ntn_`으로 시작하는지 확인

3. **Database ID 확인**:
   - URL에서 ID 재확인
   - 32자 16진수인지 확인

---

### 문제 5: Redis 연결 경고

**증상**:
```
Queue error getaddrinfo ENOTFOUND redis-...
```

**설명**:
- 빌드 시 Redis 연결을 시도하는 정상 동작
- Background job 미사용 시 무시 가능
- 빌드 성공에 영향 없음

**해결** (Background job 사용 시):
```
1. REDIS_URL 환경 변수 추가
2. Redis Cloud 또는 Upstash 사용
3. 연결 문자열 정확히 확인
```

---

### 문제 6: 캐시 문제

**증상**:
- 환경 변수 업데이트했는데 반영 안 됨
- 이전 값이 계속 사용됨

**해결**:
```
1. Vercel Dashboard → Deployments → Redeploy
2. 브라우저 Hard Refresh (Ctrl+Shift+R)
3. 브라우저 캐시 완전 삭제
4. 시크릿 모드로 테스트
```

---

## 보안 주의사항

### 🔴 절대 노출 금지 (Critical)

다음 변수들은 **절대로** 공개 저장소, 클라이언트 코드, 로그에 노출되어서는 안 됩니다:

```
❌ SUPABASE_SERVICE_ROLE_KEY
❌ YT_SUPABASE_SERVICE_KEY
❌ YOUTUBE_API_KEY
❌ NOTION_TOKEN
❌ ADMIN_TOKEN
❌ REVALIDATE_SECRET
❌ YT_CRON_SECRET
❌ REDIS_PASSWORD (또는 REDIS_URL)
❌ SCRAPINGBEE_API_KEY
❌ SCRAPFLY_API_KEY
❌ GOOGLE_CLIENT_SECRET
```

**이러한 키가 노출되면**:
- 데이터베이스 전체 접근 가능
- API 할당량 악용
- 서비스 중단
- 금전적 손실

---

### 🟡 주의 필요 (Warning)

다음 변수들은 공개되어도 되지만, 무단 사용 방지를 위해 주의가 필요합니다:

```
⚠️ NEXT_PUBLIC_SUPABASE_URL
⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS로 보호됨)
⚠️ NEXT_PUBLIC_YT_SUPABASE_URL
⚠️ NEXT_PUBLIC_YT_SUPABASE_ANON_KEY
⚠️ NOTION_DATABASE_ID
```

**보호 방법**:
- Supabase Row Level Security(RLS) 활성화
- API Rate Limiting 설정
- Notion Integration 권한 최소화

---

### 🟢 공개 가능 (Safe)

다음 변수들은 공개되어도 안전합니다:

```
✅ NEXT_PUBLIC_SITE_URL
✅ NEXT_PUBLIC_ADMIN_TOKEN (UI용)
✅ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
✅ NEXT_PUBLIC_NAVER_SITE_VERIFICATION
```

---

### 보안 체크리스트

```
□ .env.local이 .gitignore에 포함되어 있는지
□ 비밀 키에 NEXT_PUBLIC_ 접두사가 없는지
□ Supabase RLS가 활성화되어 있는지
□ API 키에 IP 또는 Referrer 제한이 설정되어 있는지
□ 프로덕션 환경 변수를 강력한 값으로 변경했는지
□ 테스트 API 라우트(/api/test-env)를 삭제했는지
```

---

## 빠른 설정 가이드

### 필수 환경 변수만 빠르게 설정

**Vercel Dashboard에서 다음 17개 변수 추가**:

1. ✅ `NEXT_PUBLIC_SITE_URL` = `https://thefounder.vercel.app`
2. ✅ `NEXT_PUBLIC_SUPABASE_URL` = `.env.local에서 복사`
3. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `.env.local에서 복사`
4. ✅ `SUPABASE_SERVICE_ROLE_KEY` = `.env.local에서 복사`
5. ✅ `NEXT_PUBLIC_YT_SUPABASE_URL` = `.env.local에서 복사`
6. ✅ `NEXT_PUBLIC_YT_SUPABASE_ANON_KEY` = `.env.local에서 복사`
7. ✅ `YT_SUPABASE_SERVICE_KEY` = `.env.local에서 복사`
8. ✅ `YOUTUBE_API_KEY` = `.env.local에서 복사`
9. ✅ `NOTION_TOKEN` = `.env.local에서 복사`
10. ✅ `NOTION_DATABASE_ID` = `.env.local에서 복사`
11. ✅ `ADMIN_TOKEN` = `[새로 생성 - 랜덤 32자]`
12. ✅ `NEXT_PUBLIC_ADMIN_TOKEN` = `[ADMIN_TOKEN과 동일]`
13. ✅ `REVALIDATE_SECRET` = `[새로 생성 - 랜덤 64자]`
14. ✅ `YT_CRON_SECRET` = `[새로 생성 - 랜덤 32자]`

**모든 변수에 대해 Environment 선택**: ✅ Production, ✅ Preview, ⬜ Development

**완료 후**: Deployments → Redeploy

---

## 환경별 설정 요약

### Production 환경

```env
# Core
NEXT_PUBLIC_SITE_URL=https://thefounder.vercel.app

# Main Supabase
NEXT_PUBLIC_SUPABASE_URL=[Your Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...M3o
SUPABASE_SERVICE_ROLE_KEY=eyJ...HXA

# YouTube Industry Supabase
NEXT_PUBLIC_YT_SUPABASE_URL=[Your YouTube Supabase URL]
NEXT_PUBLIC_YT_SUPABASE_ANON_KEY=eyJ...QD4
YT_SUPABASE_SERVICE_KEY=eyJ...w4M

# YouTube API
YOUTUBE_API_KEY=AIza...VsU

# Notion
NOTION_TOKEN=ntn_...f75
NOTION_DATABASE_ID=23df...5ca

# Security
ADMIN_TOKEN=[새로 생성]
NEXT_PUBLIC_ADMIN_TOKEN=[ADMIN_TOKEN과 동일]
REVALIDATE_SECRET=[새로 생성]
YT_CRON_SECRET=[새로 생성]
```

### Preview 환경

```env
# NEXT_PUBLIC_SITE_URL만 다름
NEXT_PUBLIC_SITE_URL=https://thefounder-git-$VERCEL_GIT_COMMIT_REF.vercel.app

# 나머지는 Production과 동일
...
```

### Development 환경 (선택사항)

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 나머지는 Production과 동일
...
```

---

## 최종 체크리스트

### 배포 전

```
□ 17개 필수 환경 변수 모두 Vercel에 추가
□ 각 변수의 값이 정확한지 확인
□ NEXT_PUBLIC_SITE_URL을 실제 Vercel URL로 설정
□ 보안 변수(ADMIN_TOKEN, REVALIDATE_SECRET 등)를 강력한 값으로 생성
□ Environment 설정 (Production/Preview) 확인
```

### 배포 후

```
□ Redeploy 실행
□ 브라우저에서 사이트 접속 확인
□ F12 → Console에서 환경 변수 확인
□ 포스트 목록 정상 표시 확인
□ YouTube Industry 페이지 정상 작동 확인
□ /api/test-env 테스트 API 삭제
□ Google Search Console 등록 (선택)
□ 네이버 웹마스터 도구 등록 (선택)
```

---

## 추가 리소스

- [Vercel 환경 변수 공식 문서](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase 환경 변수 가이드](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Next.js 환경 변수 문서](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [YouTube Data API 할당량](https://developers.google.com/youtube/v3/getting-started#quota)
- [Notion API 문서](https://developers.notion.com/)

---

**완료!** 모든 환경 변수가 설정되면 프로젝트가 정상 작동합니다.
