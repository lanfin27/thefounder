# 환경 변수 빠른 참조 가이드

**프로젝트**: The Founder
**총 환경 변수**: 17개 (필수) + 10개 (선택)

---

## 필수 환경 변수 요약 테이블 (17개)

| # | 변수명 | 타입 | 현재값 (.env.local) | Vercel 설정값 (Production) | 보안 |
|---|--------|------|---------------------|---------------------------|------|
| 1 | `NEXT_PUBLIC_SITE_URL` | 공개 | `http://localhost:3000` | `https://thefounder.vercel.app` | 🟢 |
| 2 | `NEXT_PUBLIC_SUPABASE_URL` | 공개 | `https://jspajke...supabase.co` | 동일 | 🟢 |
| 3 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 | `eyJ...M3o` (200+ 글자) | 동일 | 🟢 |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` | 비밀 | `eyJ...HXA` (200+ 글자) | 동일 | 🔴 |
| 5 | `NEXT_PUBLIC_YT_SUPABASE_URL` | 공개 | `https://frytw...supabase.co` | 동일 | 🟢 |
| 6 | `NEXT_PUBLIC_YT_SUPABASE_ANON_KEY` | 공개 | `eyJ...QD4` (200+ 글자) | 동일 | 🟢 |
| 7 | `YT_SUPABASE_SERVICE_KEY` | 비밀 | `eyJ...w4M` (200+ 글자) | 동일 | 🔴 |
| 8 | `YOUTUBE_API_KEY` | 비밀 | `AIza...VsU` | 동일 | 🔴 |
| 9 | `NOTION_TOKEN` | 비밀 | `ntn_...f75` | 동일 | 🔴 |
| 10 | `NOTION_DATABASE_ID` | 서버 | `23df...5ca` (32자) | 동일 | 🟡 |
| 11 | `ADMIN_TOKEN` | 비밀 | `thefounder_admin_2025_secure` | **새로 생성 (랜덤 32자)** | 🔴 |
| 12 | `NEXT_PUBLIC_ADMIN_TOKEN` | 공개 | `thefounder_admin_2025_secure` | **ADMIN_TOKEN과 동일** | 🟡 |
| 13 | `REVALIDATE_SECRET` | 비밀 | `your-random-secret-123` | **새로 생성 (랜덤 64자)** | 🔴 |
| 14 | `YT_CRON_SECRET` | 비밀 | `yt_industry_cron_2025_secure_key_thefounder` | **새로 생성 (랜덤 32자)** | 🔴 |

**보안 레벨**:
- 🟢 = 공개 가능 (안전)
- 🟡 = 주의 필요
- 🔴 = 절대 노출 금지

---

## 선택 환경 변수 요약 테이블 (10개)

| # | 변수명 | 타입 | 사용 시기 | 보안 |
|---|--------|------|----------|------|
| 1 | `GOOGLE_CLIENT_ID` | 서버 | Google OAuth 사용 시 | 🟡 |
| 2 | `GOOGLE_CLIENT_SECRET` | 비밀 | Google OAuth 사용 시 | 🔴 |
| 3 | `REDIS_URL` | 비밀 | Background Jobs 사용 시 | 🔴 |
| 4 | `REDIS_HOST` | 서버 | REDIS_URL 대신 개별 설정 시 | 🟡 |
| 5 | `REDIS_PORT` | 서버 | REDIS_URL 대신 개별 설정 시 | 🟡 |
| 6 | `REDIS_PASSWORD` | 비밀 | REDIS_URL 대신 개별 설정 시 | 🔴 |
| 7 | `SCRAPINGBEE_API_KEY` | 비밀 | 웹 스크래핑 사용 시 | 🔴 |
| 8 | `SCRAPFLY_API_KEY` | 비밀 | 웹 스크래핑 사용 시 | 🔴 |
| 9 | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 공개 | 배포 후 Search Console 등록 시 | 🟢 |
| 10 | `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | 공개 | 배포 후 웹마스터 도구 등록 시 | 🟢 |

---

## Vercel 복사-붙여넣기 가이드

### Production 환경

**Environment 선택**: ✅ Production, ✅ Preview

```env
# 1. Core Application
NEXT_PUBLIC_SITE_URL=https://thefounder.vercel.app

# 2-4. Main Supabase (The Founder 메인 DB)
NEXT_PUBLIC_SUPABASE_URL=[Your Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your Supabase Anon Key]
SUPABASE_SERVICE_ROLE_KEY=[Your Supabase Service Role Key]

# 5-7. YouTube Industry Supabase (유튜브 산업 지표 전용 DB)
NEXT_PUBLIC_YT_SUPABASE_URL=[Your YouTube Supabase URL]
NEXT_PUBLIC_YT_SUPABASE_ANON_KEY=[Your YouTube Supabase Anon Key]
YT_SUPABASE_SERVICE_KEY=[Your YouTube Supabase Service Key]

# 8. YouTube Data API v3
YOUTUBE_API_KEY=[Copy from your .env.local]

# 9-10. Notion CMS
NOTION_TOKEN=[Copy from your .env.local]
NOTION_DATABASE_ID=[Copy from your .env.local]

# 11-14. Admin & Security (아래 값들은 반드시 새로 생성하세요!)
ADMIN_TOKEN=thefounder_admin_prod_[랜덤32자]_2025
NEXT_PUBLIC_ADMIN_TOKEN=thefounder_admin_prod_[위와동일]_2025
REVALIDATE_SECRET=[랜덤64자16진수]
YT_CRON_SECRET=yt_cron_[랜덤32자]
```

---

### Preview 환경

**Environment 선택**: ✅ Preview

```env
# NEXT_PUBLIC_SITE_URL만 다름
NEXT_PUBLIC_SITE_URL=https://thefounder-git-$VERCEL_GIT_COMMIT_REF.vercel.app

# 나머지는 Production과 동일
...
```

---

### Development 환경 (선택사항)

**Environment 선택**: ✅ Development

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 나머지는 Production과 동일
...
```

---

## 새로운 시크릿 생성 가이드

### 1. ADMIN_TOKEN & NEXT_PUBLIC_ADMIN_TOKEN

**생성 방법**:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 출력 예시
a7f3c8e9d4b1a2f5e6c7d8b9a0f1e2d3c4b5a6f7e8d9a0b1c2d3e4f5a6b7c8d9
```

**권장 형식**:
```
thefounder_admin_prod_a7f3c8e9d4b1a2f5e6c7d8b9_2025
```

**주의**:
- `ADMIN_TOKEN`과 `NEXT_PUBLIC_ADMIN_TOKEN`에 **같은 값** 사용

---

### 2. REVALIDATE_SECRET

**생성 방법**:
```bash
# 64자 16진수 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 출력 예시 (64글자)
f1e2d3c4b5a6f7e8d9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2
```

**그대로 사용**:
```
f1e2d3c4b5a6f7e8d9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2
```

---

### 3. YT_CRON_SECRET

**생성 방법**:
```bash
# Node.js
node -e "console.log('yt_cron_' + require('crypto').randomBytes(32).toString('hex'))"

# 출력 예시
yt_cron_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

---

## 설정 체크리스트

### 배포 전

```
□ .env.local 파일 확인 완료
□ 모든 필수 환경 변수 (17개) 준비 완료
□ 새로운 시크릿 키 3개 생성 완료:
  □ ADMIN_TOKEN
  □ REVALIDATE_SECRET
  □ YT_CRON_SECRET
```

### Vercel Dashboard에서

```
□ Settings → Environment Variables 접속
□ 17개 필수 변수 모두 추가
□ 각 변수의 Environment 설정:
  □ Production ✅
  □ Preview ✅
  □ Development ⬜ (선택)
□ 모든 변수 Save 완료
□ Deployments → Redeploy 실행
```

### 배포 후

```
□ 사이트 접속: https://thefounder.vercel.app
□ 포스트 목록 확인
□ YouTube Industry 페이지 확인
□ 브라우저 콘솔 (F12) 에러 없음 확인
□ Vercel Dashboard → Environment Variables에서 개수 확인
```

---

## 환경 변수 개수 검증

### Vercel Dashboard 확인

**Settings → Environment Variables**

**예상 개수**:
```
최소: 17개 (필수)
권장: 17개 (필수) + 선택 (필요 시)
```

**각 환경별**:
- Production: 17개 (최소)
- Preview: 17개 (최소)
- Development: 1개 (NEXT_PUBLIC_SITE_URL만, 선택)

---

## 빠른 검증 명령어

### 1. 브라우저 콘솔 (F12)

```javascript
// 공개 변수 확인
console.log('Site:', process.env.NEXT_PUBLIC_SITE_URL)
console.log('Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('YT Supabase:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL)
console.log('Admin Token:', process.env.NEXT_PUBLIC_ADMIN_TOKEN)
```

**예상 출력**:
```
Site: https://thefounder.vercel.app
Supabase: [Your Supabase URL]
YT Supabase: [Your YouTube Supabase URL]
Admin Token: thefounder_admin_prod_...
```

---

### 2. 테스트 API (임시)

**파일 생성**: `src/app/api/env-check/route.ts`

```typescript
export async function GET() {
  return Response.json({
    // 공개 변수 - 전체 값 표시
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ytSupabaseUrl: process.env.NEXT_PUBLIC_YT_SUPABASE_URL,

    // 비밀 변수 - 존재 여부만 확인
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasYtServiceKey: !!process.env.YT_SUPABASE_SERVICE_KEY,
    hasYouTubeKey: !!process.env.YOUTUBE_API_KEY,
    hasNotionToken: !!process.env.NOTION_TOKEN,
    hasNotionDbId: !!process.env.NOTION_DATABASE_ID,
    hasAdminToken: !!process.env.ADMIN_TOKEN,
    hasRevalidateSecret: !!process.env.REVALIDATE_SECRET,
    hasCronSecret: !!process.env.YT_CRON_SECRET,

    // 개수 확인
    totalRequired: 17,
    totalSet: [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.NEXT_PUBLIC_YT_SUPABASE_URL,
      process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY,
      process.env.YT_SUPABASE_SERVICE_KEY,
      process.env.YOUTUBE_API_KEY,
      process.env.NOTION_TOKEN,
      process.env.NOTION_DATABASE_ID,
      process.env.ADMIN_TOKEN,
      process.env.NEXT_PUBLIC_ADMIN_TOKEN,
      process.env.REVALIDATE_SECRET,
      process.env.YT_CRON_SECRET,
    ].filter(Boolean).length
  })
}
```

**테스트**:
```bash
curl https://thefounder.vercel.app/api/env-check
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
  "hasNotionDbId": true,
  "hasAdminToken": true,
  "hasRevalidateSecret": true,
  "hasCronSecret": true,
  "totalRequired": 17,
  "totalSet": 17
}
```

**⚠️ 중요**: 테스트 완료 후 `src/app/api/env-check/route.ts` 삭제!

---

## 문제 해결 Quick Fix

### 환경 변수가 undefined

```
1. Vercel Dashboard 확인
2. 변수명 정확히 일치하는지 확인 (대소문자!)
3. Redeploy 실행
4. 브라우저 Hard Refresh (Ctrl+Shift+R)
```

### Supabase 연결 실패

```
1. URL에 https:// 포함 확인
2. ANON KEY 전체 복사 확인 (200+ 글자)
3. SERVICE_ROLE_KEY 정확히 확인
4. Supabase Dashboard에서 RLS 정책 확인
```

### YouTube API 에러

```
1. API 키 활성화 확인
2. YouTube Data API v3 활성화 확인
3. Google Cloud Console → Quotas 확인
4. 일일 10,000 units 제한 확인
```

---

## 최종 확인

### 모든 단계 완료 시

```
✅ Vercel Dashboard에 17개 필수 변수 추가
✅ Environment: Production, Preview 선택
✅ 새로운 시크릿 키 생성 및 적용
✅ Redeploy 실행
✅ 사이트 정상 작동 확인
✅ 포스트 목록 표시 확인
✅ YouTube Industry 페이지 작동 확인
✅ 테스트 API 삭제
```

**완료!** 환경 변수 설정이 모두 완료되었습니다.

---

## 참고 문서

- [VERCEL-ENV-VARIABLES.md](./VERCEL-ENV-VARIABLES.md) - 상세 가이드
- [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) - 배포 체크리스트
- [VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md) - 전체 배포 가이드
