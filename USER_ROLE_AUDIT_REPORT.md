# 'user' 역할 사용 현황 감사 보고서

**조사 일시**: 2025-11-12
**프로젝트**: The Founder
**목적**: 'user' → 'member' 마이그레이션 전 전수조사

---

## 📊 요약

### 조사 결과
- **발견된 파일 수**: 7개
- **발견된 참조 위치**: 10곳
- **🔴 CRITICAL 항목**: 6개
- **🟡 HIGH 항목**: 1개
- **🟢 MEDIUM 항목**: 0개
- **⚪ LOW 항목**: 3개 (SQL migrations - 이미 변경 예정)

### ⚠️ 중요 결론

**'user' 역할이 프로젝트 전체에서 활발히 사용되고 있습니다!**

SQL만 변경하면 다음 기능들이 **즉시 망가집니다**:
- ✅ 타입 체크 (TypeScript 컴파일 에러)
- ✅ 역할 검증 (권한 체크 실패)
- ✅ UI 렌더링 (역할 표시 오류)
- ✅ 신규 사용자 생성 (middleware)
- ✅ Admin 페이지 역할 변경 기능

**권장 조치**: 코드 먼저 수정, SQL은 마지막에 실행

---

## 🔍 상세 발견 내역

### 🔴 CRITICAL #1: Type Definition (Global Impact)

#### 파일: `src/types/user.ts`
- **위치**: Line 1
- **코드**:
  ```typescript
  export type UserRole = 'user' | 'admin'
  ```
- **영향도**: 🔴 **CRITICAL** - 전체 프로젝트 타입 시스템
- **이유**:
  - 이 타입은 프로젝트 전체에서 import되어 사용됨
  - TypeScript 컴파일 에러 발생 가능
  - 모든 role 관련 코드에 영향
- **수정 필요**: ✅ **YES** - 최우선 수정
- **수정 방법**:
  ```typescript
  // Before
  export type UserRole = 'user' | 'admin'

  // After
  export type UserRole = 'member' | 'admin'
  ```

---

### 🔴 CRITICAL #2: useUser Hook Type Definition

#### 파일: `src/hooks/useUser.ts`
- **위치**: Line 12
- **코드**:
  ```typescript
  interface Profile {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    role?: 'admin' | 'user';  // ← 여기!
    created_at: string;
    updated_at?: string;
  }
  ```
- **영향도**: 🔴 **CRITICAL** - 모든 컴포넌트에서 사용
- **이유**:
  - useUser hook은 모든 페이지/컴포넌트에서 사용됨
  - role 타입 불일치 시 TypeScript 에러
- **수정 필요**: ✅ **YES**
- **수정 방법**:
  ```typescript
  // After
  role?: 'admin' | 'member';
  ```

---

### 🔴 CRITICAL #3: useUser Hook Role Check

#### 파일: `src/hooks/useUser.ts`
- **위치**: Line 175
- **코드**:
  ```typescript
  const isUser = profile?.role === 'user';
  ```
- **영향도**: 🔴 **CRITICAL** - 런타임 로직 오류
- **이유**:
  - 'user' 역할이 'member'로 변경되면 이 체크는 항상 false
  - isUser를 사용하는 모든 로직이 망가짐
- **수정 필요**: ✅ **YES**
- **수정 방법**:
  ```typescript
  // After
  const isUser = profile?.role === 'member';
  ```

---

### 🔴 CRITICAL #4: Middleware Profile Creation

#### 파일: `src/middleware.ts`
- **위치**: Line 147
- **코드**:
  ```typescript
  const { data: newProfile, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email || 'User',
      role: 'user'  // ← 여기!
    })
  ```
- **영향도**: 🔴 **CRITICAL** - 신규 사용자 생성 실패
- **이유**:
  - SQL constraint가 'member'만 허용하면 이 코드는 실패
  - 신규 로그인 시 profile 생성 불가
  - **모든 신규 사용자가 로그인 실패**
- **수정 필요**: ✅ **YES** - 매우 중요!
- **수정 방법**:
  ```typescript
  // After
  role: 'member'
  ```

---

### 🔴 CRITICAL #5: Admin API Role Validation

#### 파일: `src/app/api/admin/users/[id]/role/route.ts`
- **위치**: Lines 34-36
- **코드**:
  ```typescript
  if (!role || !['user', 'admin'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be "user" or "admin"' },
      { status: 400 }
    )
  }
  ```
- **영향도**: 🔴 **CRITICAL** - Admin 기능 망가짐
- **이유**:
  - Admin 페이지에서 역할 변경 시 'member'가 invalid로 판단됨
  - 역할 변경 불가능
- **수정 필요**: ✅ **YES**
- **수정 방법**:
  ```typescript
  // After
  if (!role || !['member', 'admin'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be "member" or "admin"' },
      { status: 400 }
    )
  }
  ```

---

### 🔴 CRITICAL #6: Admin UI Role Selection

#### 파일: `src/components/admin/EditUserModal.tsx`
- **위치**: Line 131
- **코드**:
  ```typescript
  checked={role === 'user'}
  ```
- **영향도**: 🔴 **CRITICAL** - UI 동작 오류
- **이유**:
  - Admin 페이지에서 'user' 역할 체크박스가 항상 unchecked
  - 역할 선택 UI가 망가짐
- **수정 필요**: ✅ **YES**
- **수정 방법**:
  ```typescript
  // After
  checked={role === 'member'}
  ```

---

### ⚪ LOW #7-9: SQL Migration Files (Already Planned to Change)

#### 파일들:
1. `supabase/migrations/20251110_create_user_profiles.sql:6`
2. `supabase/migrations/20251111_add_profiles_role.sql:14`
3. `supabase/migrations/20251111_add_profiles_role.sql:26`

- **영향도**: ⚪ **LOW** - 이미 변경 예정
- **이유**: 새 마이그레이션(202511

12)에서 변경 예정
- **조치**: 새 마이그레이션 적용 후 이 파일들은 실행 안 됨

---

## 📋 영향도별 분류

### 🔴 CRITICAL (즉시 수정 필요) - 6개

1. **src/types/user.ts:1** - 전역 타입 정의
2. **src/hooks/useUser.ts:12** - useUser hook 타입
3. **src/hooks/useUser.ts:175** - role 체크 로직
4. **src/middleware.ts:147** - 신규 사용자 profile 생성
5. **src/app/api/admin/users/[id]/role/route.ts:34** - Role validation
6. **src/components/admin/EditUserModal.tsx:131** - UI role check

### ⚪ LOW (참고용) - 3개

1. **supabase/migrations/20251110_create_user_profiles.sql:6** - 이전 migration
2. **supabase/migrations/20251111_add_profiles_role.sql:14** - 이전 migration
3. **supabase/migrations/20251111_add_profiles_role.sql:26** - 이전 migration

---

## 🎯 안전한 마이그레이션 전략

### ⚠️ 중요: 순서가 매우 중요합니다!

**잘못된 순서 (위험)**:
```
1. SQL 마이그레이션 실행 ❌
2. 코드 수정 ❌
→ 결과: SQL 실행 후 ~ 코드 수정 전까지 **모든 기능 망가짐**
```

**올바른 순서 (안전)**:
```
1. 코드 수정 (TypeScript, JavaScript 파일) ✅
2. 로컬 테스트 ✅
3. Git commit & push ✅
4. SQL 마이그레이션 실행 ✅
→ 결과: 순간적인 중단 없이 안전한 마이그레이션
```

---

## 📝 단계별 실행 계획

### STEP 1: 코드 파일 수정 (TypeScript/JavaScript)

**우선순위 1: 타입 정의**
```typescript
// 1. src/types/user.ts
export type UserRole = 'member' | 'admin'

// 2. src/hooks/useUser.ts (Line 12)
role?: 'admin' | 'member';
```

**우선순위 2: 런타임 코드**
```typescript
// 3. src/hooks/useUser.ts (Line 175)
const isUser = profile?.role === 'member';

// 4. src/middleware.ts (Line 147)
role: 'member'

// 5. src/app/api/admin/users/[id]/role/route.ts (Line 34)
if (!role || !['member', 'admin'].includes(role)) {
  return NextResponse.json(
    { error: 'Invalid role. Must be "member" or "admin"' },
    { status: 400 }
  )
}

// 6. src/components/admin/EditUserModal.tsx (Line 131)
checked={role === 'member'}
```

### STEP 2: 로컬 테스트

```bash
# TypeScript 컴파일 체크
npm run type-check

# 빌드 테스트
npm run build

# 개발 서버 실행
npm run dev
```

**테스트 항목**:
- [ ] TypeScript 컴파일 에러 없음
- [ ] 빌드 성공
- [ ] Admin 페이지 역할 변경 기능 동작 (아직 DB에 'user' 있을 때)
- [ ] 신규 사용자 로그인 테스트 (middleware)

### STEP 3: Git Commit & Push

```bash
git add .
git commit -m "refactor: Change user role from 'user' to 'member' for Medium-style auth

- Update UserRole type definition ('user' -> 'member')
- Update useUser hook type and role checks
- Update middleware to create profiles with 'member' role
- Update admin API role validation
- Update admin UI role selection

BREAKING CHANGE: Requires database migration to update role constraint
"
git push origin main
```

### STEP 4: 데이터베이스 마이그레이션

**이제 안전하게 SQL 실행 가능!**

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/20251112_fix_user_profiles_trigger.sql` 내용 복사
3. Paste & Run
4. 검증 쿼리 결과 확인

### STEP 5: 최종 검증

**데이터베이스 체크**:
```sql
-- 모든 'user' 역할이 'member'로 변경되었는지 확인
SELECT role, COUNT(*) FROM user_profiles GROUP BY role;
-- 예상 결과: member, admin만 존재

-- Constraint 확인
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'user_profiles_role_check';
-- 예상 결과: ('member', 'admin', 'guest') 허용
```

**기능 테스트**:
- [ ] 신규 사용자 회원가입 (Medium-style OTP)
- [ ] 기존 사용자 로그인
- [ ] Admin 페이지 역할 변경
- [ ] Google OAuth 로그인
- [ ] 모든 권한 체크 정상 작동

---

## ⏱️ 예상 작업 시간

| 단계 | 작업 | 예상 시간 |
|------|------|-----------|
| STEP 1 | 코드 파일 6개 수정 | 10-15분 |
| STEP 2 | 로컬 테스트 | 5-10분 |
| STEP 3 | Git commit & push | 2-3분 |
| STEP 4 | SQL 마이그레이션 | 2-3분 |
| STEP 5 | 최종 검증 | 10-15분 |
| **합계** | | **30-45분** |

---

## 🚨 주의사항

### DO (해야 할 것)

1. ✅ **반드시 코드 먼저, SQL은 나중에**
2. ✅ TypeScript 컴파일 에러 확인
3. ✅ 로컬에서 충분히 테스트
4. ✅ Git commit으로 변경사항 기록
5. ✅ 마이그레이션 후 즉시 검증

### DON'T (하면 안 되는 것)

1. ❌ SQL 먼저 실행하지 말 것 (기능 망가짐)
2. ❌ 일부만 수정하고 배포하지 말 것 (일관성 깨짐)
3. ❌ 테스트 없이 production 적용하지 말 것
4. ❌ 백업 없이 마이그레이션하지 말 것

---

## 📊 마이그레이션 체크리스트

### 코드 수정 체크리스트

- [ ] `src/types/user.ts` - 타입 정의 수정
- [ ] `src/hooks/useUser.ts` (Line 12) - 타입 수정
- [ ] `src/hooks/useUser.ts` (Line 175) - role 체크 수정
- [ ] `src/middleware.ts` (Line 147) - role 기본값 수정
- [ ] `src/app/api/admin/users/[id]/role/route.ts` - validation 수정
- [ ] `src/components/admin/EditUserModal.tsx` - UI 체크 수정

### 테스트 체크리스트

- [ ] TypeScript 컴파일 성공
- [ ] Build 성공
- [ ] Dev server 정상 실행
- [ ] Admin 페이지 접근 가능
- [ ] 역할 변경 UI 정상 표시

### 마이그레이션 체크리스트

- [ ] 코드 변경사항 commit & push 완료
- [ ] SQL 마이그레이션 파일 검증
- [ ] Supabase Dashboard에서 실행
- [ ] 검증 쿼리 결과 확인
- [ ] 기존 데이터 'user' → 'member' 변환 확인

### 최종 검증 체크리스트

- [ ] 신규 회원가입 테스트
- [ ] 기존 사용자 로그인 테스트
- [ ] Google OAuth 테스트
- [ ] Admin 역할 변경 기능 테스트
- [ ] 모든 권한 체크 정상 작동 확인

---

## 💡 대안 전략 (선택사항)

만약 즉시 변경이 부담스럽다면:

### 옵션 A: 점진적 마이그레이션

1. **STEP 1**: SQL에서 'user'와 'member' 둘 다 허용
   ```sql
   CHECK (role IN ('user', 'member', 'admin', 'guest'))
   ```

2. **STEP 2**: 신규 가입자는 'member', 기존 사용자는 'user' 유지

3. **STEP 3**: 코드에서 둘 다 처리
   ```typescript
   const isRegularUser = profile?.role === 'user' || profile?.role === 'member';
   ```

4. **STEP 4**: 나중에 일괄 변환
   ```sql
   UPDATE user_profiles SET role = 'member' WHERE role = 'user';
   ```

### 옵션 B: 'user' 유지 (현상 유지)

- SQL constraint에서 'user' 허용
- Medium 스타일 인증과 용어 불일치 감수
- 최소한의 변경으로 안정성 확보

---

## 🎯 권장 사항

**추천**: 코드 먼저 수정 → SQL 마이그레이션 (30-45분 소요)

**이유**:
1. 깔끔한 일관성 ('user' 완전 제거)
2. Medium 스타일 인증과 용어 일치
3. 향후 혼란 방지
4. 한 번에 마이그레이션 완료

**리스크**: 낮음 (코드 먼저 수정하면 안전)

---

## 📞 문제 발생 시 대응

### 시나리오 1: SQL 먼저 실행해버렸을 때

**증상**:
- TypeScript 컴파일은 성공하지만 런타임 에러
- 신규 로그인 실패
- Admin 페이지 역할 변경 실패

**복구 방법**:
```sql
-- 긴급 롤백: 'user' 다시 허용
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('user', 'member', 'admin', 'guest'));

-- 데이터 복원
UPDATE user_profiles SET role = 'user' WHERE role = 'member';
```

그 다음 코드 수정 후 다시 마이그레이션.

### 시나리오 2: 코드 일부만 수정했을 때

**증상**:
- 일부 페이지는 정상, 일부는 오류
- TypeScript 에러

**해결**:
- 위 체크리스트의 모든 파일 다시 확인
- 누락된 파일 수정

### 시나리오 3: 테스트 없이 배포했을 때

**증상**:
- Production에서 오류 발생

**해결**:
1. 즉시 이전 commit으로 롤백
2. 로컬에서 충분히 테스트
3. 다시 배포

---

**보고서 작성 완료**: 2025-11-12
**다음 단계**: 코드 파일 6개 수정 → 테스트 → SQL 마이그레이션
**예상 완료 시간**: 30-45분
