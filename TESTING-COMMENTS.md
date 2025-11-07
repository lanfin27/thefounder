# 댓글 시스템 테스트 가이드

## ✅ 완료된 개선사항

### 1. **추가 필터링 로직**
- `CommentSection.tsx`에 NULL post_id 필터링 추가
- 이중 검증으로 안전성 강화

### 2. **데이터베이스 정리 스크립트**
- `scripts/cleanup-comments.sql` 생성
- Supabase에서 실행 가능한 SQL 스크립트

### 3. **카테고리 표시 확인**
- 코드 검증 완료: 카테고리는 제목 위에만 표시됨
- 댓글 섹션 근처에 카테고리 표시 없음

---

## 🧪 테스트 절차

### STEP 1: 데이터베이스 정리

1. **Supabase Dashboard 열기**
   - https://supabase.com 로그인
   - 프로젝트 선택

2. **SQL Editor로 이동**
   - 왼쪽 메뉴: SQL Editor

3. **현재 상태 확인**
   ```sql
   -- 모든 댓글 확인
   SELECT
     id,
     post_id,
     content,
     created_at,
     CASE
       WHEN post_id IS NULL THEN '❌ NULL'
       ELSE '✅ Valid'
     END as status
   FROM comments
   ORDER BY created_at DESC;
   ```

4. **옵션 A: 모든 댓글 삭제 (권장)**
   ```sql
   DELETE FROM comments;

   SELECT COUNT(*) FROM comments;
   -- 결과: 0
   ```

5. **옵션 B: NULL만 삭제**
   ```sql
   DELETE FROM comments
   WHERE post_id IS NULL;
   ```

---

### STEP 2: 브라우저 캐시 완전 삭제

1. **Chrome/Edge**
   - `Ctrl + Shift + Delete`
   - "전체 기간" 선택
   - "캐시된 이미지 및 파일" 체크
   - "데이터 삭제" 클릭

2. **Hard Reload**
   - `Ctrl + Shift + R` (여러 번)

3. **시크릿 모드 테스트**
   - `Ctrl + Shift + N`
   - 새 창에서 사이트 열기

---

### STEP 3: 서버 재시작

```bash
# 터미널에서
Ctrl + C

npm run dev
```

---

### STEP 4: UI 테스트

#### 4-1. 카테고리 표시 확인

**포스트 A 열기**

✅ **올바른 레이아웃:**
```
┌─────────────────────────┐
│ [카테고리 배지]          │ ← 제목 위에만
│ [제목]                   │
│ [요약]                   │
│ [날짜]                   │
├─────────────────────────┤
│ [본문 내용...]          │
│                         │
│ [태그들...]             │
└─────────────────────────┘

                           ← 여백 (mt-12)

┌─────────────────────────┐
│ Responses (0)           │ ← 바로 시작, 카테고리 없음!
│ [댓글 입력창]           │
└─────────────────────────┘
```

❌ **잘못된 경우:**
```
┌─────────────────────────┐
│ 성공사례                │ ← 이게 나오면 안 됨!
│ Responses (0)           │
└─────────────────────────┘
```

만약 카테고리가 보인다면:
- `Ctrl + Shift + R` (Hard Reload)
- 시크릿 모드로 다시 확인
- 여전히 보이면 스크린샷 찍어서 확인 요청

---

#### 4-2. 댓글 분리 테스트

**포스트 A에서:**

1. F12 → Console 열기
2. 댓글 작성: "This is comment A"
3. 콘솔 로그 확인:
   ```
   🔍 [CommentSection] Fetching comments for postId: [UUID-A]
   💬 [CommentSection] Submitting comment for postId: [UUID-A]
   ✅ [CommentSection] Comment created successfully
   ✅ [CommentSection] Fetched 1 comments for this post
   📊 [CommentSection] Valid comments after filtering: 1
   ```

**포스트 B로 이동:**

1. 콘솔에서 다른 UUID 확인
   ```
   🔍 [CommentSection] Fetching comments for postId: [UUID-B]
   ✅ [CommentSection] Fetched 0 comments for this post
   📊 [CommentSection] Valid comments after filtering: 0
   ```

2. ✅ Responses (0) 표시
3. ✅ "This is comment A" 안 보임
4. 댓글 작성: "This is comment B"

**포스트 A로 돌아가기:**

1. ✅ Responses (1) 표시
2. ✅ "This is comment A"만 보임
3. ✅ "This is comment B" 안 보임

---

### STEP 5: 데이터베이스 확인

**Supabase → Table Editor → comments**

```sql
SELECT
  id,
  post_id,
  content,
  created_at
FROM comments
ORDER BY created_at DESC;
```

✅ **정상 상태:**
```
id      | post_id  | content               | created_at
--------|----------|----------------------|------------
uuid-1  | UUID-A   | This is comment A    | 2025-11-06
uuid-2  | UUID-B   | This is comment B    | 2025-11-06
```

❌ **비정상 상태:**
```
id      | post_id  | content               | created_at
--------|----------|----------------------|------------
uuid-1  | NULL     | Old comment          | 2025-11-05  ← NULL!
uuid-2  | UUID-A   | This is comment A    | 2025-11-06
```

NULL이 있다면:
```sql
DELETE FROM comments WHERE post_id IS NULL;
```

---

### STEP 6: 추가 안전성 테스트

#### 6-1. 새로고침 테스트
- 포스트 페이지에서 `F5` 여러 번
- ✅ 댓글 수 동일하게 유지
- ✅ 같은 댓글만 표시

#### 6-2. 여러 포스트 순회
- 포스트 A → B → C → A → B
- ✅ 각 포스트마다 자신의 댓글만
- ✅ 댓글 수 일관성

#### 6-3. 답글 테스트
- 댓글에 답글 작성
- ✅ 같은 포스트에 표시
- ✅ 다른 포스트에 안 보임

---

## 🎯 성공 기준 체크리스트

### UI
- [ ] Responses 위에 카테고리 배지 없음
- [ ] 카테고리는 제목 위에만 표시
- [ ] 깔끔한 여백 (mt-12)

### 댓글 분리
- [ ] 포스트 A의 댓글이 포스트 B에 안 보임
- [ ] 각 포스트마다 정확한 댓글 수
- [ ] 새 댓글이 현재 포스트에만 표시

### 콘솔 로그
- [ ] 포스트마다 다른 UUID 표시
- [ ] "Valid comments after filtering" 로그 보임
- [ ] 에러 없음

### 데이터베이스
- [ ] 모든 댓글에 유효한 post_id
- [ ] NULL 값 없음
- [ ] 댓글이 올바른 포스트와 연결

---

## 🔧 문제 해결

### 문제 1: 여전히 카테고리가 보임

**원인:**
- 브라우저 캐시
- 이전 빌드 파일

**해결:**
1. Hard Reload: `Ctrl + Shift + R`
2. 캐시 완전 삭제
3. 시크릿 모드 확인
4. 서버 재시작
5. `.next` 폴더 삭제 후 재빌드

```bash
# 완전 재빌드
rm -rf .next
npm run dev
```

---

### 문제 2: 댓글이 모든 포스트에 표시됨

**원인:**
- 기존 댓글에 NULL post_id
- 필터링 로직 미작동

**해결:**
1. 데이터베이스에서 NULL 확인:
   ```sql
   SELECT * FROM comments WHERE post_id IS NULL;
   ```

2. NULL 댓글 삭제:
   ```sql
   DELETE FROM comments WHERE post_id IS NULL;
   ```

3. 브라우저 캐시 삭제
4. 새 댓글 작성으로 테스트

---

### 문제 3: 콘솔에 에러

**TypeError: Cannot read property 'post_id'**
- RLS 정책 확인
- Supabase 연결 확인

**해결:**
```sql
-- Supabase에서 RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'comments';
```

---

## 📊 정상 작동 로그 예시

```
🔍 [CommentSection] Fetching comments for postId: 244fe518-3112-809b-a9bf-db1930911014
✅ [CommentSection] Fetched 3 comments for this post
📊 [CommentSection] Valid comments after filtering: 3
📊 [CommentSection] Root comments: 2

💬 [CommentSection] Submitting comment for postId: 244fe518-3112-809b-a9bf-db1930911014
✅ [CommentSection] Comment created successfully: [{...}]

🔍 [CommentSection] Fetching comments for postId: 244fe518-3112-809b-a9bf-db1930911014
✅ [CommentSection] Fetched 4 comments for this post
📊 [CommentSection] Valid comments after filtering: 4
📊 [CommentSection] Root comments: 3
```

---

## 🎉 완료!

모든 테스트를 통과하면:

1. ✅ 깔끔한 UI (카테고리 없음)
2. ✅ 완벽한 댓글 분리
3. ✅ 안정적인 데이터 저장
4. ✅ Medium 스타일 완성

**다음 단계:**
- 좋아요 기능 구현
- 댓글 수정 기능
- 알림 시스템
