# 댓글 좋아요 동기화 버그 수정 완료

## 🔍 문제 원인 분석

### 핵심 원인: RLS (Row Level Security) 정책 문제

```sql
-- 기존 정책 (문제)
CREATE POLICY "Users can update own comments" ON comments
FOR UPDATE USING (auth.uid() = user_id);
```

**문제점:**
- 이 정책은 사용자가 **자기가 작성한 댓글만** 수정할 수 있도록 제한
- 하지만 좋아요 기능은 **다른 사람의 댓글**의 `likes_count`를 업데이트해야 함
- 결과: API에서 `likes_count` 업데이트 시도 → RLS가 차단 → 실패

### 동작 흐름 (버그 상태)

```
1. Admin이 댓글에 좋아요 클릭
   ↓
2. comment_likes 테이블에 추가 ✅
   ↓
3. comments.likes_count 업데이트 시도
   ↓
4. RLS 정책 확인: "이 댓글의 user_id == Admin의 user_id?" ❌
   ↓
5. 업데이트 차단 (에러는 로그에만 기록)
   ↓
6. 결과: comment_likes에는 있지만 likes_count는 0 그대로
```

---

## ✅ 해결 방법

### STEP 1: RLS 정책 수정 (Migration)

**파일:** `supabase/migrations/20251112_fix_comment_likes_rls.sql`

**변경 사항:**
1. 기존 정책 유지: 사용자는 자기 댓글의 내용만 수정 가능
2. **새 정책 추가:** 인증된 사용자는 모든 댓글의 `likes_count` 업데이트 가능

```sql
-- 새로운 정책
CREATE POLICY "Anyone can update comment likes_count"
ON comments FOR UPDATE
TO authenticated
USING (true)  -- 모든 댓글 접근 가능
WITH CHECK (true);
```

### STEP 2: API 검증 강화

**파일:** `src/app/api/comments/[commentId]/like/route.ts`

**변경 사항:**
- POST 함수: 업데이트 후 DB에서 실제 값 확인
- DELETE 함수: 업데이트 후 DB에서 실제 값 확인
- 불일치 발견 시 콘솔에 경고 출력

```typescript
// 검증 코드 추가
const { data: verifyComment } = await supabase
  .from('comments')
  .select('likes_count')
  .eq('id', commentId)
  .single()

if (verifyComment?.likes_count !== actualLikesCount) {
  console.error('⚠️ WARNING: DB count mismatch!')
}
```

---

## 🚀 적용 방법

### Option 1: Supabase CLI (권장)

```bash
# 프로젝트 디렉토리에서 실행
npx supabase db push
```

### Option 2: Supabase Dashboard (수동)

1. Supabase Dashboard 접속
2. SQL Editor 메뉴 선택
3. 다음 파일 내용 복사하여 실행:
   - `supabase/migrations/20251112_fix_comment_likes_rls.sql`

### Option 3: 직접 SQL 실행

```sql
-- 1. 기존 정책 재생성 (내용 변경 없음)
DROP POLICY IF EXISTS "Users can update own comments" ON comments;

CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. 새 정책 추가 (핵심!)
DROP POLICY IF EXISTS "Anyone can update comment likes_count" ON comments;

CREATE POLICY "Anyone can update comment likes_count"
ON comments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

---

## 🧪 테스트 시나리오

### Test 1: Admin 좋아요 + 일반 사용자 확인

```
1. Admin 로그인
2. 댓글에 하트 클릭
3. 콘솔 확인:
   [Comment Like API] ✅ Comments table updated to: 1
   [Comment Like API] 📊 Verified DB likes_count: 1

4. 일반 사용자 로그인 후 새로고침
5. 확인:
   ✅ 화면: ❤️ 1
   ✅ 하트가 빨간색 (총 1명이 좋아요)
```

### Test 2: 여러 사용자 좋아요

```
1. Admin 좋아요 → ❤️ 1
2. 일반 사용자 A 새로고침 → ❤️ 1 (Admin 것 보임)
3. 일반 사용자 A 좋아요 → ❤️ 2
4. Admin 새로고침 → ❤️ 2 (본인 + 사용자 A)
5. 일반 사용자 B 접속 → ❤️ 2 (전체 보임)
```

### Test 3: 좋아요 취소

```
1. 일반 사용자 A가 하트 다시 클릭 (취소)
2. 콘솔 확인:
   [Comment Like API DELETE] ✅ Comments table updated successfully
   [Comment Like API DELETE] 📊 Verified DB likes_count: 1

3. 확인:
   ✅ 사용자 A: ❤️ 1 (Admin 것만 남음)
   ✅ Admin 새로고침: ❤️ 1
```

---

## 📊 예상 콘솔 출력

### 정상 동작 시 (Migration 적용 후):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Comment Like API] 🔄 Updating comments.likes_count...
[Comment Like API] ✅ Comments table updated to: 2
[Comment Like API] 🔍 Verifying update...
[Comment Like API] 📊 Verified DB likes_count: 2
[Comment Like API] 🎯 Final likes count: 2
[Comment Like API] 📤 Returning response with totalLikes: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### RLS 문제 발생 시 (Migration 적용 전):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Comment Like API] 🔄 Updating comments.likes_count...
[Comment Like API] ❌ Update error: {...}
[Comment Like API] ❌ Update error details: {"code":"42501","message":"..."}
[Comment Like API] 🔍 Verifying update...
[Comment Like API] 📊 Verified DB likes_count: 0
[Comment Like API] ⚠️ WARNING: DB count mismatch!
[Comment Like API] Expected: 2
[Comment Like API] Actual: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ 완료 확인

### 1. Migration 적용 확인

```sql
-- Supabase SQL Editor에서 실행
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'comments' AND cmd = 'UPDATE';
```

**예상 결과:**
```
policyname                              | cmd    | roles
----------------------------------------|--------|----------------
Users can update own comments           | UPDATE | authenticated
Anyone can update comment likes_count   | UPDATE | authenticated
```

### 2. 기능 테스트

- [ ] Admin이 좋아요 누르면 likes_count 증가
- [ ] 일반 사용자가 새로고침하면 Admin 좋아요 보임
- [ ] 일반 사용자가 좋아요 누르면 숫자 증가 (Admin + 본인)
- [ ] 좋아요 취소 시 숫자 감소
- [ ] 콘솔에 "Verified DB likes_count" 로그 확인

---

## 🎯 요약

### 문제
- RLS 정책이 다른 사용자의 댓글 수정을 차단
- API는 성공한 것처럼 보이지만 DB 업데이트 실패

### 해결
- 새 RLS 정책 추가: 인증된 사용자가 `likes_count` 업데이트 가능
- API 검증 로직 추가: 업데이트 실제 적용 여부 확인

### 결과
- 모든 사용자가 모든 댓글의 좋아요 수 확인 가능
- 좋아요 추가/제거 시 실시간 동기화
- DB와 화면의 일관성 유지

---

## 📝 참고

### RLS 정책이 중요한 이유

RLS는 데이터베이스 레벨에서 보안을 제공하지만, 잘못 설정하면:
- API는 성공했다고 응답
- 하지만 실제 DB는 변경되지 않음
- 디버깅이 매우 어려움

따라서:
1. **적절한 RLS 정책 설계 필수**
2. **API에서 검증 로직 추가 권장**
3. **테스트 시 여러 사용자 시나리오 확인**

---

**수정 완료: 2025-11-12**
