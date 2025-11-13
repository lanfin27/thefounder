# Supabase Email Provider 설정 가이드

## 문제 상황

OTP 이메일 발송 시 다음 에러가 발생합니다:

```
[Send Magic Link API] Error: Database error saving new user
POST /api/auth/send-magic-link 500
```

## 원인

Supabase에서 **Email Provider**가 설정되지 않았거나 비활성화되어 있습니다.

---

## 즉시 테스트 방법 (개발 모드)

**현재 구현된 개발 모드를 사용하면 Supabase 설정 없이 즉시 테스트 가능합니다!**

### 개발 모드 작동 방식

1. 회원가입 페이지에서 이메일 입력 → "인증 코드 받기" 클릭
2. **터미널 콘솔**에 6자리 OTP 코드가 출력됩니다
3. 콘솔에서 OTP 코드를 복사하여 브라우저에 입력
4. 이름과 비밀번호 설정 → 회원가입 완료

### 콘솔 출력 예시

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 [DEV MODE] OTP CODE FOR: test@example.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CODE: 123456
   EXPIRES: 10 minutes
   (Copy and paste this code in the signup form)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 개발 모드 특징

- ✅ 이메일 발송 없음 (콘솔 출력)
- ✅ Supabase 설정 불필요
- ✅ 즉시 테스트 가능
- ✅ 10분 유효기간
- ✅ 프로덕션 배포 시 자동으로 실제 이메일 발송으로 전환

---

## 프로덕션 배포를 위한 Supabase 설정

프로덕션 환경(실제 서비스)에서는 이메일 발송 설정이 필요합니다.

### 옵션 A: Supabase 기본 이메일 사용 (무료)

Supabase에서 제공하는 기본 이메일 서비스를 사용합니다.

1. **Supabase Dashboard 접속**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   ```

2. **Authentication** → **Email Templates** 클릭

3. **Email 설정 확인**
   - "Enable Email" 토글이 활성화되어 있는지 확인
   - 기본적으로 활성화되어 있어야 함

4. **제한 사항 (Free Plan)**
   - 시간당 30개 이메일
   - 발신자: `noreply@mail.app.supabase.io`
   - 개발/테스트 용도로는 충분

5. **테스트**
   - 개발 모드를 끄고 실제 이메일 주소로 테스트
   - 스팸 폴더도 확인

### 옵션 B: 커스텀 SMTP 설정 (추천 - 프로덕션)

Gmail, SendGrid, AWS SES 등 커스텀 이메일 서비스를 사용합니다.

#### Gmail SMTP 사용 예시

1. **Google 계정 준비**
   - Gmail 계정 필요
   - 2단계 인증 활성화 필수

2. **앱 비밀번호 생성**
   ```
   Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호
   앱 선택: 메일
   기기 선택: 기타(사용자 지정 이름) → "Supabase"
   생성된 16자리 비밀번호 복사
   ```

3. **Supabase Dashboard 설정**
   ```
   Authentication → Settings → SMTP Settings

   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
   Password: [16자리 앱 비밀번호]
   Sender email: your-email@gmail.com
   Sender name: The Founder
   ```

4. **저장 및 테스트**
   - "Save" 클릭
   - 테스트 이메일 발송 확인

#### SendGrid 사용 (프로덕션 추천)

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [SendGrid API Key]
```

**장점:**
- 무료 플랜: 하루 100개 이메일
- 높은 전달률
- 전문적인 이메일 관리

#### AWS SES 사용 (대규모 서비스)

```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
Username: [AWS SMTP 사용자명]
Password: [AWS SMTP 비밀번호]
```

**장점:**
- 가장 저렴한 비용 (1000개당 $0.10)
- 높은 안정성
- 대규모 발송 가능

---

## SQL 마이그레이션 실행

OTP 발송 문제 외에 **데이터베이스 마이그레이션**도 완료해야 합니다.

### 마이그레이션 파일 위치
```
supabase/migrations/20251112_fix_user_profiles_trigger.sql
```

### 실행 방법

1. **Supabase Dashboard** 접속
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   ```

2. **SQL Editor** 클릭

3. **파일 내용 복사**
   - `supabase/migrations/20251112_fix_user_profiles_trigger.sql` 파일 열기
   - 전체 내용 복사 (Ctrl+A → Ctrl+C)

4. **SQL 붙여넣기 및 실행**
   - SQL Editor에 붙여넣기
   - **RUN** 버튼 클릭

5. **결과 확인**
   - 3개의 결과 테이블이 나타나야 함:
     1. Migration status
     2. Trigger installation
     3. Column verification

### 마이그레이션 내용

- `user_profiles` 테이블에 `full_name` 컬럼 추가
- Role constraint 업데이트: `('user', 'admin', 'guest')`
- 트리거 수정: `handle_new_user()` 함수 업데이트
- 신규 사용자 자동 프로필 생성

---

## 테스트 체크리스트

### 개발 모드 테스트 (즉시 가능)

- [ ] `npm run dev` 실행
- [ ] `http://localhost:3000/auth/signup` 접속
- [ ] 이메일 입력 → "인증 코드 받기" 클릭
- [ ] 터미널 콘솔에서 OTP 코드 확인
- [ ] 코드 입력 → 인증 성공
- [ ] 이름/비밀번호 입력 → 회원가입 완료
- [ ] 홈페이지로 리다이렉트 확인

### 프로덕션 모드 테스트 (Supabase 설정 후)

- [ ] Supabase Email Provider 설정 완료
- [ ] SQL 마이그레이션 실행 완료
- [ ] 실제 이메일 주소로 회원가입 시도
- [ ] 이메일 수신 확인 (스팸 폴더 포함)
- [ ] OTP 코드로 인증 완료
- [ ] 프로필 설정 완료

---

## 트러블슈팅

### 문제 1: 터미널에 OTP 코드가 나타나지 않음

**원인:** 개발 서버가 제대로 실행되지 않았거나, API 요청이 실패

**해결:**
```bash
# 서버 재시작
Ctrl+C
npm run dev

# 브라우저 콘솔 확인
F12 → Console 탭 → 에러 확인
```

### 문제 2: "Database error saving new user"

**원인:** Supabase Email Provider 미설정 (프로덕션 모드)

**해결:**
- 개발 모드 사용 (현재 구현됨)
- 또는 위의 "옵션 A" 설정 완료

### 문제 3: SQL 마이그레이션 에러

**원인:** 테이블이 이미 존재하거나 권한 문제

**해결:**
```sql
-- 기존 테이블 확인
SELECT * FROM user_profiles LIMIT 1;

-- full_name 컬럼 존재 확인
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'full_name';
```

### 문제 4: 이메일이 스팸으로 분류됨

**원인:** Supabase 기본 이메일 주소가 스팸으로 인식

**해결:**
- 커스텀 SMTP 설정 (옵션 B)
- SPF, DKIM 레코드 설정
- 도메인 이메일 사용

---

## 요약

### 개발 중 (지금 바로 테스트)

```bash
# 1. 서버 실행
npm run dev

# 2. 회원가입 페이지 접속
# http://localhost:3000/auth/signup

# 3. 터미널에서 OTP 코드 확인
# 콘솔에 출력된 6자리 코드 복사

# 4. 브라우저에 코드 입력 → 완료!
```

### 프로덕션 배포 시 (나중에)

1. Supabase Email Provider 설정 (옵션 A 또는 B)
2. SQL 마이그레이션 실행
3. 환경 변수 `NODE_ENV=production` 설정
4. 실제 이메일 발송 테스트

---

## 참고 링크

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Email Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Setup](https://sendgrid.com/)
- [AWS SES Setup](https://aws.amazon.com/ses/)

---

**문서 업데이트:** 2025-11-12
**작성자:** Claude Code
**상태:** ✅ 개발 모드 구현 완료
