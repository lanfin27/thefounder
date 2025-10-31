# 🔗 Google Cloud 하이브리드 동기화 설정 가이드

## 📋 개요

이 프로젝트는 YouTube Data API v3의 quota 사용량을 **로컬 DB**와 **Google Cloud** 두 소스에서 조회하는 하이브리드 방식을 사용합니다.

### 동작 원리

1. **로컬 DB** (`youtube_api_logs` 테이블)
   - 모든 YouTube API 호출을 실시간으로 기록
   - 30초마다 자동 갱신
   - 빠른 조회, 실시간 반영

2. **Google Cloud Service Usage API**
   - Google Cloud Console에 표시되는 실제 사용량
   - 5분 캐싱 적용
   - 정확한 검증용

3. **차이 분석**
   - 100 units 이상 차이 시 경고 표시
   - 누락된 API 호출 감지

---

## ✅ 사전 요구 사항

- Google Cloud 프로젝트 생성됨
- YouTube Data API v3 활성화됨
- 프로젝트에 `@google-cloud/service-usage` 패키지 설치됨 (✅ 이미 설치됨)

---

## 🔧 Step 1: Google Cloud Service Account 생성

### 1-1. Google Cloud Console 접속

https://console.cloud.google.com/

### 1-2. Service Account 생성

1. **IAM & Admin** → **Service Accounts** 메뉴 이동
2. **CREATE SERVICE ACCOUNT** 클릭
3. Service account 정보 입력:
   - **Name**: `youtube-quota-monitor`
   - **Description**: `YouTube API quota usage monitoring`
4. **CREATE AND CONTINUE** 클릭

### 1-3. 권한 부여

다음 Role을 추가:
- **Service Usage Consumer** (필수)
- **Service Usage Admin** (권장, 더 많은 정보 조회 가능)

**CONTINUE** → **DONE** 클릭

### 1-4. JSON 키 생성

1. 생성된 Service Account 클릭
2. **KEYS** 탭 이동
3. **ADD KEY** → **Create new key** 선택
4. **JSON** 형식 선택
5. **CREATE** 클릭
6. 다운로드된 JSON 파일을 프로젝트 루트에 저장:
   ```
   C:/Users/KIMJAEHEON/the-founder/google-service-account.json
   ```

⚠️ **중요**: 이 파일은 절대 Git에 커밋하지 마세요!

---

## 🔧 Step 2: 환경 변수 설정

### 2-1. `.env.local` 파일 열기

```bash
C:/Users/KIMJAEHEON/the-founder/.env.local
```

### 2-2. 다음 환경 변수 추가

```env
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Google Cloud 동기화 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Google Cloud 동기화 활성화
ENABLE_GOOGLE_CLOUD_SYNC=true

# Google Cloud Project ID (예: gen-lang-client-0960785951)
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here

# Service Account JSON 파일 경로 (프로젝트 루트 기준)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

### 2-3. Project ID 확인 방법

Google Cloud Console에서:
1. 상단 프로젝트 선택 드롭다운 클릭
2. 프로젝트 이름 옆에 표시되는 ID 복사
   - 예: `gen-lang-client-0960785951`

---

## 🔧 Step 3: `.gitignore` 업데이트

**파일**: `.gitignore`

다음 라인이 있는지 확인 (없으면 추가):

```gitignore
# Google Cloud Service Account
google-service-account.json
*-service-account.json
```

---

## 🧪 Step 4: 테스트

### 4-1. 서버 재시작

```bash
npm run dev
```

### 4-2. 콘솔 로그 확인

성공 시 다음과 같은 로그가 표시됩니다:

```
[GoogleCloudService] ✅ Initialized with project: gen-lang-client-0960785951
```

실패 시:

```
[GoogleCloudService] ❌ Service Account JSON not found: ./google-service-account.json
[GoogleCloudService] ⚠️ Google Cloud sync is disabled
```

### 4-3. Admin 대시보드 확인

1. 브라우저에서 Admin 페이지 접속
2. **YouTube API 사용량** 위젯 확인
3. **Google Cloud 실제 사용량** 섹션이 표시되는지 확인

성공 시:
- ✅ "Google Cloud 실제 사용량" 섹션 표시
- ✅ 실제 사용량, 캐시 상태, 리셋 시간 표시

실패 시:
- ⚠️ "Google Cloud 연동이 비활성화되었습니다" 메시지 표시

### 4-4. API 직접 테스트

브라우저 콘솔 또는 curl로 테스트:

```bash
curl http://localhost:3002/api/admin/youtube/quota-usage
```

응답 예시:

```json
{
  "date": "2025-10-31",
  "localUsage": {
    "totalUsed": 506,
    "remaining": 9494,
    "limit": 10000,
    "percentage": 5
  },
  "googleCloudUsage": {
    "totalUsed": 10028,
    "remaining": 0,
    "limit": 10000,
    "percentage": 100,
    "resetTime": "2025-11-01T08:00:00.000Z",
    "lastFetched": "2025-10-31T05:30:00.000Z",
    "isCached": true
  },
  "discrepancy": {
    "difference": 9522,
    "percentage": 94.9,
    "isSignificant": true,
    "warning": "로컬 로그와 Google Cloud 사용량이 9522 units 차이납니다. 일부 API 호출이 기록되지 않았을 수 있습니다."
  },
  ...
}
```

---

## ❌ 문제 해결 (Troubleshooting)

### 문제 1: "Service Account JSON not found"

**원인**: JSON 파일 경로가 올바르지 않음

**해결**:
1. JSON 파일이 프로젝트 루트에 있는지 확인
2. 파일 이름이 `google-service-account.json`인지 확인
3. `.env.local`의 `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` 확인

### 문제 2: "GOOGLE_CLOUD_PROJECT_ID is not set"

**원인**: 환경 변수가 설정되지 않음

**해결**:
1. `.env.local`에 `GOOGLE_CLOUD_PROJECT_ID` 추가
2. 서버 재시작

### 문제 3: "Permission denied" or "Insufficient permissions"

**원인**: Service Account에 필요한 권한이 없음

**해결**:
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Service Account 선택
3. **Permissions** 탭에서 다음 권한 추가:
   - `Service Usage Consumer`
   - `Service Usage Admin` (권장)

### 문제 4: "Daily quota metric not found"

**원인**: YouTube Data API v3가 프로젝트에서 활성화되지 않음

**해결**:
1. Google Cloud Console → APIs & Services → Library
2. "YouTube Data API v3" 검색
3. **ENABLE** 클릭

### 문제 5: Google Cloud 사용량이 항상 0으로 표시

**원인**: Service Usage API가 실시간 사용량을 제공하지 않을 수 있음

**해결 (대안 방법)**:
- Google Cloud Console에서 직접 확인하는 것이 가장 정확합니다
- Admin 대시보드의 "Google Cloud Console에서 확인" 버튼 클릭

---

## 📊 동기화 동작 원리

### 로컬 DB 조회 (30초마다)

```
사용자 → Admin Dashboard → /api/admin/youtube/quota-usage
                              ↓
                        youtube_api_logs 테이블 조회
                              ↓
                        집계 (SUM, COUNT, GROUP BY)
                              ↓
                        응답 반환 (localUsage)
```

### Google Cloud 조회 (5분 캐싱)

```
사용자 → Admin Dashboard → /api/admin/youtube/quota-usage?forceRefresh=true
                              ↓
                        GoogleCloudService 초기화
                              ↓
                        Service Usage API 호출
                              ↓
                        quota metrics 조회
                              ↓
                        캐시 저장 (5분 TTL)
                              ↓
                        응답 반환 (googleCloudUsage)
```

### 차이 분석

```
localUsage.totalUsed  vs  googleCloudUsage.totalUsed
         ↓                          ↓
       506 units              10,028 units
         ↓                          ↓
           차이: 9,522 units (94.9%)
                    ↓
            isSignificant: true
                    ↓
              경고 메시지 표시
```

---

## 🎯 모범 사례 (Best Practices)

### 1. 보안

- ✅ Service Account JSON을 Git에 커밋하지 마세요
- ✅ `.gitignore`에 `*-service-account.json` 추가
- ✅ Production 환경에서는 환경 변수를 Vercel Secrets나 AWS Secrets Manager에 저장

### 2. 권한 최소화

- Service Account에는 **Service Usage Consumer** 권한만 부여
- 불필요한 Admin 권한 부여 금지

### 3. 모니터링

- 로컬 DB와 Google Cloud 차이가 100 units 이상이면 조사
- API 호출 누락 여부 확인

### 4. 캐싱 전략

- Google Cloud 조회는 비용이 들 수 있으므로 5분 캐싱 유지
- 긴급 확인이 필요하면 "지금 확인" 버튼으로 강제 갱신

---

## 📚 참고 문서

- [Google Cloud Service Usage API](https://cloud.google.com/service-usage/docs)
- [YouTube Data API v3 Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Service Account 생성 가이드](https://cloud.google.com/iam/docs/creating-managing-service-accounts)

---

## ✅ 설정 완료 체크리스트

- [ ] Service Account 생성됨
- [ ] JSON 키 다운로드 및 프로젝트 루트에 저장됨
- [ ] `.env.local`에 환경 변수 추가됨
- [ ] `.gitignore`에 JSON 파일 패턴 추가됨
- [ ] 서버 재시작 완료
- [ ] Admin 대시보드에서 Google Cloud 섹션 확인됨
- [ ] API 응답에서 `googleCloudUsage` 데이터 확인됨

모든 체크리스트를 완료하면 **하이브리드 동기화**가 정상 작동합니다! 🎉
