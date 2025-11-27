# 카카오 로그인 설정 가이드

## 📌 개요

The Founder 프로젝트에서 카카오 로그인을 완전히 작동시키기 위한 단계별 가이드입니다.

**좋은 소식:** 코드는 이미 완벽하게 구현되어 있습니다! 이제 Supabase와 카카오 개발자 콘솔에서 설정만 하면 됩니다.

---

## ✅ 이미 완료된 항목

- ✅ Next.js 14 + @supabase/ssr 설정
- ✅ 환경 변수 설정 (`.env.local`)
- ✅ OAuth 플로우 구현 (로그인, 콜백, 에러 처리)
- ✅ UI 컴포넌트 (카카오/구글 로그인 버튼)
- ✅ 미들웨어 인증 체크
- ✅ 에러 페이지

---

## 🔧 1단계: 카카오 개발자 콘솔 설정

### 1.1 카카오 개발자 콘솔 접속

1. **URL**: https://developers.kakao.com/console
2. **로그인**: 카카오 계정으로 로그인
3. **애플리케이션 선택**: 기존 앱 선택 또는 새로 생성

### 1.2 REST API 키 확인

현재 설정된 키: `a605abee716dd97502f27a3dc6c96ad5`

- **메뉴**: 내 애플리케이션 > 앱 설정 > 요약 정보
- **REST API 키**: 이미 `.env.local`에 `SUPABASE_KAKAO_CLIENT_ID`로 설정됨

### 1.3 Client Secret 생성 및 활성화 ⚠️ **중요!**

**이 단계가 가장 중요합니다!**

1. **메뉴**: 내 애플리케이션 > 제품 설정 > 카카오 로그인 > **보안** 탭
2. **Client Secret 코드 생성**:
   - [코드 생성] 버튼 클릭
   - 생성된 코드 복사
3. **활성화 상태로 변경**:
   ```
   상태: 사용 안 함 → 사용함 ✅
   ```
4. **저장** 클릭

**생성된 Client Secret을 기록하세요:**
```
Client Secret: [여기에 복사한 코드를 기록]
```

### 1.4 Redirect URI 등록 ⚠️ **중요!**

**정확히 다음 URL을 등록해야 합니다:**

1. **메뉴**: 내 애플리케이션 > 제품 설정 > 카카오 로그인
2. **Redirect URI 등록**:
   ```
   https://jspajkepyfkmwsmoveqy.supabase.co/auth/v1/callback
   ```
   - ⚠️ **정확히 일치해야 합니다** (끝에 `/` 없음)
   - ⚠️ **https**여야 합니다

3. **개발 환경용 (선택사항)**:
   ```
   http://localhost:3000/api/auth/callback
   ```

### 1.5 플랫폼 설정

1. **메뉴**: 내 애플리케이션 > 앱 설정 > 플랫폼
2. **Web 플랫폼 추가**:
   - **개발 환경**:
     ```
     http://localhost:3000
     ```
   - **프로덕션 환경** (배포 시):
     ```
     https://yourdomain.com
     ```

### 1.6 동의 항목 설정

1. **메뉴**: 내 애플리케이션 > 제품 설정 > 카카오 로그인 > 동의 항목
2. **필수 동의 항목**:
   - ✅ 닉네임
   - ✅ 프로필 이미지 (선택)
   - ✅ 카카오계정(이메일) (선택)

3. **설정 예시**:
   ```
   닉네임: 필수 동의
   프로필 이미지: 선택 동의
   카카오계정(이메일): 선택 동의
   ```

---

## 🗄️ 2단계: Supabase Dashboard 설정

### 2.1 Supabase Dashboard 접속

1. **URL**: https://supabase.com/dashboard/project/jspajkepyfkmwsmoveqy
2. **로그인**: Supabase 계정으로 로그인

### 2.2 Kakao OAuth Provider 활성화 ⚠️ **중요!**

1. **메뉴**: Authentication → Providers
2. **Kakao 찾기**: 목록에서 "Kakao" 찾기
3. **활성화**:
   ```
   Kakao enabled: OFF → ON ✅
   ```

4. **설정 입력**:

   | 필드 | 값 |
   |------|------|
   | **Kakao Client ID** | `a605abee716dd97502f27a3dc6c96ad5` |
   | **Kakao Client Secret** | `[1.3단계에서 생성한 Secret]` |

5. **Save** 클릭

### 2.3 Redirect URLs 확인

Supabase가 자동으로 제공하는 Callback URL:
```
https://jspajkepyfkmwsmoveqy.supabase.co/auth/v1/callback
```

이 URL이 카카오 개발자 콘솔의 Redirect URI와 일치하는지 확인하세요.

---

## 🧪 3단계: 테스트

### 3.1 로컬 개발 서버 시작

```bash
cd C:\Users\KIMJAEHEON\the-founder
npm run dev
```

### 3.2 브라우저에서 테스트

1. **로그인 페이지 접속**:
   ```
   http://localhost:3000/auth/login
   ```

2. **개발자 도구 열기** (F12)
   - Console 탭 열기
   - Network 탭 열기

3. **"카카오로 계속하기" 버튼 클릭**

### 3.3 예상 동작

✅ **성공 시나리오:**

1. **Console 로그**:
   ```
   [OAuth] Initiating kakao sign in...
   [OAuth] Callback URL: http://localhost:3000/api/auth/callback?next=%2F
   [OAuth] ✅ kakao OAuth redirect initiated
   ```

2. **카카오 로그인 페이지로 리다이렉트**
   - URL: `https://kauth.kakao.com/oauth/authorize?...`

3. **카카오에서 로그인 완료**

4. **콜백 처리**:
   ```
   [Auth Callback] Received callback request
   [Auth Callback] Exchanging code for session...
   [Auth Callback] ✅ Session created successfully
   [Auth Callback] Redirecting to: http://localhost:3000/
   ```

5. **홈페이지로 리다이렉트**

❌ **실패 시나리오 및 해결 방법:**

| 오류 | 원인 | 해결 방법 |
|------|------|----------|
| `invalid_client` | Supabase에서 Kakao Provider 미활성화 | [2.2단계] 다시 확인 |
| `redirect_uri_mismatch` | Redirect URI 불일치 | [1.4단계] URL 정확히 확인 |
| `invalid_grant` | Client Secret 미설정 또는 비활성화 | [1.3단계] 다시 확인 |
| `access_denied` | 사용자가 로그인 취소 | 정상 동작 (다시 시도) |

### 3.4 디버깅 방법

#### Browser Console에서 확인:

```javascript
// 현재 세션 확인
const { data: { session } } = await supabase.auth.getSession()
console.log('Current session:', session)

// 사용자 정보 확인
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user)
```

#### Network 탭에서 확인:

1. **OAuth 초기화 요청**: `signInWithOAuth`
2. **카카오 인증 페이지**: `kauth.kakao.com`
3. **Supabase 콜백**: `supabase.co/auth/v1/callback`
4. **앱 콜백**: `/api/auth/callback`

---

## 🔍 4단계: 문제 해결 (Troubleshooting)

### 4.1 카카오 로그인 버튼을 눌러도 반응이 없음

**원인:**
- JavaScript 에러
- Supabase 클라이언트 초기화 실패

**해결:**
```bash
# 1. 환경 변수 확인
cat .env.local | grep SUPABASE

# 2. 개발 서버 재시작
npm run dev

# 3. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
```

### 4.2 `redirect_uri_mismatch` 에러

**원인:**
- 카카오 개발자 콘솔의 Redirect URI와 실제 콜백 URL이 다름

**해결:**
1. 카카오 개발자 콘솔에서 Redirect URI 확인
2. 정확히 다음과 일치하는지 확인:
   ```
   https://jspajkepyfkmwsmoveqy.supabase.co/auth/v1/callback
   ```
3. 끝에 `/` 없어야 함
4. `https`여야 함

### 4.3 `invalid_client` 에러

**원인:**
- Supabase에서 Kakao Provider가 비활성화됨
- Client ID 또는 Secret이 잘못됨

**해결:**
1. Supabase Dashboard → Authentication → Providers
2. Kakao 활성화 확인
3. Client ID: `a605abee716dd97502f27a3dc6c96ad5`
4. Client Secret 다시 확인

### 4.4 `invalid_grant` 에러

**원인:**
- Client Secret이 설정되지 않음
- Client Secret이 비활성화 상태

**해결:**
1. 카카오 개발자 콘솔 → 보안 탭
2. Client Secret 상태: **사용함** 확인
3. 필요시 재생성 후 Supabase에 업데이트

### 4.5 로그인 후 세션이 유지되지 않음

**원인:**
- 쿠키 설정 문제
- 브라우저 쿠키 차단

**해결:**
```bash
# 1. 브라우저 쿠키 설정 확인
# - 쿠키 허용되어 있는지 확인
# - 시크릿 모드가 아닌지 확인

# 2. localStorage 확인 (F12 → Application 탭)
# - sb-* 로 시작하는 항목 확인

# 3. 다른 브라우저에서 테스트
```

---

## 📋 5단계: 체크리스트

설정이 완료되었는지 최종 확인하세요:

### 카카오 개발자 콘솔

- [ ] REST API 키 확인: `a605abee716dd97502f27a3dc6c96ad5`
- [ ] Client Secret 생성됨
- [ ] Client Secret 활성화 상태: **사용함**
- [ ] Redirect URI 등록: `https://jspajkepyfkmwsmoveqy.supabase.co/auth/v1/callback`
- [ ] 플랫폼 설정: `http://localhost:3000`
- [ ] 동의 항목 설정 완료

### Supabase Dashboard

- [ ] Kakao Provider 활성화: **ON**
- [ ] Kakao Client ID 입력: `a605abee716dd97502f27a3dc6c96ad5`
- [ ] Kakao Client Secret 입력: `[생성한 Secret]`
- [ ] 설정 저장됨

### 로컬 환경

- [ ] `.env.local` 파일 존재
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] `SUPABASE_KAKAO_CLIENT_ID` 설정
- [ ] 개발 서버 실행 중 (`npm run dev`)

### 테스트

- [ ] 로그인 페이지 접속 가능
- [ ] 카카오 로그인 버튼 표시됨
- [ ] 버튼 클릭 시 카카오 로그인 페이지로 이동
- [ ] 로그인 후 앱으로 돌아옴
- [ ] 세션이 유지됨 (새로고침 후에도)

---

## 🎯 다음 단계

카카오 로그인이 작동하면:

1. **구글 로그인도 같은 방식으로 설정 가능**
   - 이미 코드는 구현되어 있음
   - Google Cloud Console에서 OAuth 설정 필요

2. **프로덕션 배포 준비**
   - 카카오 개발자 콘솔에 프로덕션 도메인 추가
   - Supabase의 Site URL 업데이트
   - `NEXT_PUBLIC_SITE_URL` 환경 변수 변경

3. **사용자 프로필 기능 추가**
   - 로그인 후 사용자 정보 표시
   - 프로필 편집 기능
   - 계정 연동 관리

---

## 📚 참고 문서

- [Supabase Auth with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Kakao Login REST API](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [Next.js with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## ❓ 도움이 필요하신가요?

문제가 해결되지 않으면:

1. **Browser Console 로그** 확인 (F12)
2. **Network 탭** 에서 실패한 요청 확인
3. **서버 로그** 확인 (`npm run dev` 터미널)
4. **이 가이드의 각 단계를 다시 확인**

설정 시 생성한 Client Secret을 안전하게 보관하세요!

---

**🎉 설정을 완료하면 카카오 로그인이 완벽하게 작동할 것입니다!**
