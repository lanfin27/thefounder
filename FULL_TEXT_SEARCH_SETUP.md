# 🔍 Full-Text Search 구현 완료

## ✅ 구현 완료 항목

### 1. Database Migration (Full-Text Search)
**파일:** `supabase/migrations/20251112_add_full_text_search.sql`

**구현 내용:**
- `posts` 테이블에 `search_vector` 컬럼 추가 (tsvector 타입)
- 자동 업데이트 트리거 함수 생성 (`posts_search_vector_update()`)
- 가중치 적용: 제목(A - 최고), 발췌(B - 중간), 본문(C - 최저)
- 'simple' 설정 사용 (한글/영어 지원)
- GIN 인덱스 생성 (성능 최적화)
- 카테고리 및 상태 인덱스 생성

### 2. Search API Endpoint
**파일:** `src/app/api/search/route.ts`

**기능:**
- Full-Text Search (FTS) 우선 사용
- 카테고리 필터링 (all, trends, insights, cases, blog)
- LIKE 검색 폴백 (FTS 실패 시)
- Mock 데이터 최종 폴백
- 자세한 로깅

**API 엔드포인트:**
```
GET /api/search?q=검색어&category=카테고리
```

**응답 형식:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "slug": "post-slug",
      "title": "게시글 제목",
      "excerpt": "발췌문",
      "category": "trends",
      "thumbnail_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z",
      "claps_count": 10,
      "comments_count": 5
    }
  ],
  "count": 1,
  "method": "fts"  // "fts", "like", 또는 "mock"
}
```

### 3. useDebounce Hook
**파일:** `src/hooks/useDebounce.ts`

**기능:**
- 검색 입력 디바운싱 (500ms)
- 불필요한 API 호출 방지
- 제네릭 타입 지원
- 상세한 JSDoc 문서

### 4. SearchModal Component
**파일:** `src/components/search/SearchModal.tsx`

**기능:**
- 실시간 검색 with 디바운싱
- 카테고리 필터 버튼 (전체, 트렌드, 인사이트, 사례, 블로그)
- 검색 결과 표시 (썸네일, 제목, 발췌, 메타 정보)
- 빈 상태 처리
- ESC 키로 닫기
- 로딩 상태 표시

**UI 요소:**
- 카테고리 아이콘 (Tag, TrendingUp, Lightbulb, BarChart3)
- 활성 카테고리 강조 (파란색)
- 메타 정보 (날짜, 👏 박수, 💬 댓글)
- 반응형 디자인

### 5. Header Integration
**파일:** `src/components/layout/Header.tsx`

**기능:**
- 데스크톱: 검색바 버튼 (오른쪽 상단)
- 모바일: 검색 아이콘 버튼
- SearchModal 통합 완료

---

## 🚀 활성화 방법

### STEP 1: Supabase Migration 적용

**Option A: Supabase Dashboard (권장)**

1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. **SQL Editor** 메뉴 클릭
4. **New Query** 버튼 클릭
5. 아래 SQL 복사하여 붙여넣기:

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Full-Text Search Implementation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- STEP 1: Add search_vector column
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- STEP 2: Create function to update search_vector
CREATE OR REPLACE FUNCTION posts_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Create trigger
DROP TRIGGER IF EXISTS posts_search_vector_trigger ON posts;

CREATE TRIGGER posts_search_vector_trigger
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION posts_search_vector_update();

-- STEP 4: Update existing posts
UPDATE posts
SET search_vector =
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(excerpt, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(content, '')), 'C')
WHERE search_vector IS NULL;

-- STEP 5: Create indexes
CREATE INDEX IF NOT EXISTS posts_search_vector_idx
ON posts USING gin(search_vector);

CREATE INDEX IF NOT EXISTS posts_category_idx
ON posts(category);

CREATE INDEX IF NOT EXISTS posts_status_idx
ON posts(status);
```

6. **RUN** 버튼 클릭
7. "Success" 메시지 확인

**Option B: Supabase CLI**

```bash
# 프로젝트 링크 (최초 1회만)
npx supabase link --project-ref <YOUR_PROJECT_REF>

# Migration 적용
npx supabase db push
```

### STEP 2: 검증

**A. SQL Editor에서 확인:**

```sql
-- 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'search_vector';

-- 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'posts' AND indexname LIKE '%search%';
```

**B. 애플리케이션에서 테스트:**

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저에서 http://localhost:3000 접속

3. 오른쪽 상단 **Search** 버튼 클릭 (데스크톱) 또는 돋보기 아이콘 클릭 (모바일)

4. 검색어 입력 (예: "창업", "투자", "마케팅")

5. 카테고리 필터 테스트:
   - **전체**: 모든 카테고리에서 검색
   - **트렌드**: trends 카테고리만
   - **인사이트**: insights 카테고리만
   - **사례**: cases 카테고리만
   - **블로그**: blog 카테고리만

6. 콘솔 로그 확인:
   ```
   🔍 [SearchModal] Searching... { query: "검색어", category: "all" }
   ✅ [SearchModal] Results: 5 Method: fts
   ```

---

## 🧪 테스트 시나리오

### Test 1: Full-Text Search (FTS)

```
1. 검색어 입력: "스타트업"
2. 콘솔 확인: Method: fts
3. 결과 확인: 제목, 발췌, 본문에 "스타트업" 포함된 게시글
```

### Test 2: 카테고리 필터링

```
1. 검색어 입력: "투자"
2. 필터 클릭: "트렌드"
3. 결과 확인: category="trends"인 게시글만 표시
4. 필터 변경: "인사이트"
5. 결과 확인: category="insights"인 게시글만 표시
```

### Test 3: 디바운싱

```
1. 검색어 빠르게 입력: "s" -> "st" -> "sta" -> "start"
2. 콘솔 확인: 500ms 후 1번의 API 호출만 발생
3. 입력 멈춤 후 500ms 대기
4. 콘솔 확인: 검색 실행 로그 출력
```

### Test 4: 빈 결과

```
1. 검색어 입력: "존재하지않는검색어12345"
2. 결과 확인: "존재하지않는검색어12345에 대한 검색 결과가 없습니다."
```

### Test 5: Fallback 메커니즘

```
Migration 적용 전:
1. 검색어 입력
2. 콘솔 확인: Method: like (FTS 실패, LIKE 검색 폴백)
3. 결과 확인: LIKE 검색 결과 표시

Migration 적용 후:
1. 검색어 입력
2. 콘솔 확인: Method: fts
3. 결과 확인: Full-Text Search 결과 표시
```

---

## 📊 예상 콘솔 출력

### 정상 동작 (Migration 적용 후):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Search API] 🔍 Search request
[Search API] 📝 Query: 창업
[Search API] 📂 Category: all
[Search API] 🔍 Searching for: 창업
[Search API] ✅ Results found: 12
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 [SearchModal] Searching... { query: "창업", category: "all" }
✅ [SearchModal] Results: 12 Method: fts
```

### Fallback 동작 (Migration 적용 전):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Search API] 🔍 Search request
[Search API] 📝 Query: 창업
[Search API] ❌ FTS Error: column "search_vector" does not exist
[Search API] 🔄 Falling back to LIKE search...
[Search API] ✅ Fallback results: 8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 [SearchModal] Searching... { query: "창업", category: "all" }
✅ [SearchModal] Results: 8 Method: like
```

---

## 🎯 기술 세부사항

### Full-Text Search 작동 원리

```sql
-- 검색 벡터 생성
search_vector =
  setweight(to_tsvector('simple', title), 'A') ||      -- 제목: 최고 가중치
  setweight(to_tsvector('simple', excerpt), 'B') ||    -- 발췌: 중간 가중치
  setweight(to_tsvector('simple', content), 'C')       -- 본문: 최저 가중치
```

**가중치 의미:**
- **A (highest)**: 제목에 검색어가 있으면 최우선 순위
- **B (medium)**: 발췌에 검색어가 있으면 중간 순위
- **C (lowest)**: 본문에만 검색어가 있으면 낮은 순위

**'simple' 설정 사용 이유:**
- 한글, 영어, 기타 언어 모두 지원
- 형태소 분석 없이 단어 단위로 검색
- 다국어 환경에 최적화

### API 검색 로직

```typescript
// 1. Full-Text Search 시도
searchQuery.textSearch('search_vector', searchTerm, {
  type: 'websearch',
  config: 'simple',
})

// 2. 실패 시 LIKE 검색 폴백
fallbackQuery.or(
  `title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
)

// 3. 최종 실패 시 Mock 데이터 반환
getMockSearchResults(query)
```

### 디바운싱 로직

```typescript
const debouncedQuery = useDebounce(query, 500);

useEffect(() => {
  performSearch(debouncedQuery, category);
}, [debouncedQuery, category, performSearch]);
```

**동작 방식:**
1. 사용자가 "startup" 입력
2. 's' 입력 → 500ms 타이머 시작
3. 't' 입력 → 이전 타이머 취소, 새 타이머 시작
4. 'a', 'r', 't', 'u', 'p' 입력 → 계속 타이머 재시작
5. 입력 멈춤 → 500ms 후 API 호출 1회만 실행

---

## 🔧 트러블슈팅

### 문제 1: "column search_vector does not exist"

**원인:** Migration이 적용되지 않음

**해결:**
```sql
-- Supabase Dashboard SQL Editor에서 실행
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS search_vector tsvector;
```

### 문제 2: 검색 결과가 없음

**확인사항:**
1. `posts` 테이블에 데이터가 있는지 확인:
   ```sql
   SELECT COUNT(*) FROM posts WHERE status = 'published';
   ```

2. `search_vector`가 업데이트되었는지 확인:
   ```sql
   SELECT id, title, search_vector IS NOT NULL as has_vector
   FROM posts
   LIMIT 5;
   ```

3. 수동으로 `search_vector` 업데이트:
   ```sql
   UPDATE posts
   SET search_vector =
     setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
     setweight(to_tsvector('simple', COALESCE(excerpt, '')), 'B') ||
     setweight(to_tsvector('simple', COALESCE(content, '')), 'C');
   ```

### 문제 3: 카테고리 필터가 작동하지 않음

**확인사항:**
1. `posts` 테이블의 `category` 값 확인:
   ```sql
   SELECT DISTINCT category FROM posts;
   ```

2. 카테고리 값이 다음 중 하나인지 확인:
   - `trends`
   - `insights`
   - `cases`
   - `blog`

### 문제 4: 검색이 너무 느림

**해결:**
1. 인덱스 확인:
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'posts' AND indexname LIKE '%search%';
   ```

2. 인덱스 재생성:
   ```sql
   DROP INDEX IF EXISTS posts_search_vector_idx;
   CREATE INDEX posts_search_vector_idx
   ON posts USING gin(search_vector);
   ```

---

## ✅ 완료 체크리스트

- [ ] Supabase Migration 적용
- [ ] `search_vector` 컬럼 존재 확인
- [ ] GIN 인덱스 생성 확인
- [ ] 기존 게시글 `search_vector` 업데이트
- [ ] 개발 서버 재시작
- [ ] 검색 기능 테스트 (한글/영어)
- [ ] 카테고리 필터 테스트
- [ ] 콘솔 로그 확인 (Method: fts)
- [ ] 모바일 반응형 확인
- [ ] 디바운싱 동작 확인

---

## 📚 참고 자료

### PostgreSQL Full-Text Search
- https://www.postgresql.org/docs/current/textsearch.html
- https://www.postgresql.org/docs/current/textsearch-controls.html

### Supabase Full-Text Search
- https://supabase.com/docs/guides/database/full-text-search

### Next.js API Routes
- https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

**구현 완료: 2025-11-12**
**작성자: Claude Code**
