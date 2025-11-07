# 🎨 Medium 스타일 블로그 시스템 - 완성 가이드

## ✅ 완료된 작업

다음 컴포넌트들이 성공적으로 생성되었습니다:

1. **CommentForm** (`src/components/post/CommentForm.tsx`) ✅
2. **CommentItem** (`src/components/post/CommentItem.tsx`) ✅
3. **CommentSection** (`src/components/post/CommentSection.tsx`) ✅
4. **AuthorInfo** (`src/components/post/AuthorInfo.tsx`) ✅
5. **RelatedPosts** (`src/components/post/RelatedPosts.tsx`) ✅
6. **PostActions** (`src/components/post/PostActions.tsx`) ✅
7. **SQL Migration File** (`supabase/migrations/create_comment_system.sql`) ✅

---

## 🚀 Step 1: Supabase SQL 마이그레이션 실행 (필수!)

### 1-1. Supabase 대시보드 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택

### 1-2. SQL Editor 열기
1. 좌측 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭

### 1-3. 마이그레이션 SQL 실행
1. `supabase/migrations/create_comment_system.sql` 파일 열기
2. 전체 내용 복사
3. SQL Editor에 붙여넣기
4. **"Run"** 버튼 클릭

### 1-4. 결과 확인
실행 후 다음 메시지가 표시되어야 합니다:
```
Success. No rows returned
```

### 1-5. 테이블 생성 확인
1. 좌측 메뉴에서 **"Table Editor"** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - ✅ `comments` (댓글)
   - ✅ `post_likes` (좋아요)
   - ✅ `saved_posts` (저장한 포스트)

### 1-6. RLS 정책 확인
1. 좌측 메뉴에서 **"Authentication" > "Policies"** 클릭
2. 각 테이블에 다음 정책들이 있는지 확인:
   - `comments`: 4개 정책 (읽기, 작성, 수정, 삭제)
   - `post_likes`: 2개 정책 (읽기, 관리)
   - `saved_posts`: 2개 정책 (읽기, 관리)

### ⚠️ 오류 발생 시

**오류 1: `function uuid_generate_v4() does not exist`**
```sql
-- 먼저 다음 SQL을 실행:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 그 다음 마이그레이션 파일 전체 실행
```

**오류 2: `relation "auth.users" does not exist`**
- Supabase Auth가 활성화되어 있는지 확인
- Project Settings > API > Auth 확인

---

## 🚀 Step 2: 포스트 페이지 업데이트 (선택사항)

**주의**: 현재 포스트 페이지가 이미 작동 중이라면, 백업을 먼저 만드세요!

### 백업 생성
```bash
cp src/app/posts/[slug]/page.tsx src/app/posts/[slug]/page.tsx.backup
```

### 최소한의 통합 방법

기존 `src/app/posts/[slug]/page.tsx` 파일에 다음 컴포넌트들만 추가:

```typescript
// 파일 상단에 import 추가
import CommentSection from '@/components/post/CommentSection'
import PostActions from '@/components/post/PostActions'
import AuthorInfo from '@/components/post/AuthorInfo'
import RelatedPosts from '@/components/post/RelatedPosts'
import { getAllPosts } from '@/lib/notion/converter'

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  // 관련 포스트 로드 (같은 카테고리)
  const allCategoryPosts = await getAllPosts(false) // metadata only
  const relatedPosts = allCategoryPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  return (
    <article className="min-h-screen bg-white pt-20 md:pt-24">
      {/* 기존 포스트 컨텐츠 */}
      {/* ... */}

      {/* 🔥 새로운 컴포넌트 추가 위치 */}

      <div className="max-w-[680px] mx-auto px-6 md:px-8">

        {/* 좌측 고정 액션 바 (데스크톱) */}
        <PostActions
          postId={post.id}
          postTitle={post.title}
          variant="vertical"
        />

        {/* 기존 컨텐츠... */}

        {/* 하단 액션 바 (모바일 + 태블릿) */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <PostActions
            postId={post.id}
            postTitle={post.title}
            variant="horizontal"
          />
        </div>

        {/* 작성자 정보 */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <AuthorInfo author={post.author} />
        </div>

        {/* 댓글 섹션 */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <CommentSection postId={post.id} />
        </div>

      </div>

      {/* 관련 글 (전체 너비) */}
      {relatedPosts.length > 0 && (
        <div className="mt-20 pt-12 border-t border-gray-200 bg-gray-50">
          <div className="max-w-[1192px] mx-auto px-6 md:px-8 py-16">
            <RelatedPosts
              posts={relatedPosts}
              currentPostSlug={post.slug}
            />
          </div>
        </div>
      )}
    </article>
  )
}
```

---

## 🧪 Step 3: 기능 테스트

### 3-1. 서버 재시작
```bash
# 개발 서버가 실행 중이면 Ctrl+C로 중지 후
npm run dev
```

### 3-2. 브라우저에서 확인
포스트 페이지 열기: `http://localhost:3004/posts/[any-post-slug]`

### 3-3. 댓글 시스템 테스트

**로그인 필요!** 먼저 로그인하세요.

- [ ] 댓글 작성 폼이 보이는가?
- [ ] 댓글 작성 후 즉시 표시되는가?
- [ ] "답글" 버튼 클릭 시 대댓글 폼이 나타나는가?
- [ ] 대댓글 작성이 정상 작동하는가?
- [ ] 자신의 댓글만 "삭제" 버튼이 보이는가?
- [ ] 댓글 삭제가 작동하는가?
- [ ] 로그아웃 후 "로그인이 필요합니다" 메시지가 보이는가?

### 3-4. PostActions 테스트

- [ ] 좋아요 버튼 클릭 시 빨간색으로 변하는가?
- [ ] 좋아요 수가 증가하는가?
- [ ] 다시 클릭 시 좋아요 취소되는가?
- [ ] 북마크 버튼이 작동하는가?
- [ ] 댓글 아이콘 클릭 시 댓글 섹션으로 스크롤되는가?
- [ ] 공유 버튼 클릭 시 공유 다이얼로그 또는 "복사됨" 알림이 뜨는가?
- [ ] 데스크톱에서 왼쪽에 고정 액션 바가 보이는가?
- [ ] 모바일/태블릿에서 하단 액션 바가 보이는가?

### 3-5. 관련 글 테스트

- [ ] 같은 카테고리의 포스트 3개가 표시되는가?
- [ ] 현재 포스트는 제외되는가?
- [ ] 이미지에 호버 시 확대 효과가 있는가?
- [ ] 제목 호버 시 파란색으로 변하는가?
- [ ] 클릭 시 해당 포스트로 이동하는가?

---

## 🐛 문제 해결 가이드

### 문제 1: "Module not found: Can't resolve '@heroicons/react/24/outline'"
```bash
npm install @heroicons/react
```

### 문제 2: "useUser is not defined"
`src/contexts/UserContext.tsx` 파일 확인:
```typescript
// UserContext가 올바르게 export되어 있는지 확인
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
```

### 문제 3: 댓글이 표시되지 않음

**체크리스트:**
1. Supabase SQL 마이그레이션이 실행되었는가?
2. `comments` 테이블이 생성되었는가?
3. 브라우저 콘솔에 에러가 있는가? (F12 > Console)
4. 로그인 상태인가?

**Supabase 확인:**
1. Supabase 대시보드 > Table Editor
2. `comments` 테이블 선택
3. 데이터가 있는지 확인

**RLS 정책 확인:**
```sql
-- SQL Editor에서 실행
SELECT * FROM comments LIMIT 10;
```
오류가 발생하면 RLS 정책이 잘못 설정되었습니다.

### 문제 4: 좋아요/저장 버튼이 작동하지 않음

**체크리스트:**
1. `post_likes`, `saved_posts` 테이블이 생성되었는가?
2. 로그인 상태인가?
3. 브라우저 콘솔에 Supabase 관련 에러가 있는가?

**환경 변수 확인:**
`.env.local` 파일:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 문제 5: "relation 'post_likes' does not exist"
SQL 마이그레이션이 제대로 실행되지 않았습니다:
1. Supabase 대시보드 > SQL Editor
2. `supabase/migrations/create_comment_system.sql` 파일 내용 다시 실행
3. 에러 메시지 확인 후 해결

### 문제 6: 실시간 업데이트가 작동하지 않음

**Realtime 활성화 확인:**
1. Supabase 대시보드 > Database > Replication
2. `comments` 테이블의 Realtime이 활성화되어 있는지 확인
3. 비활성화되어 있다면 활성화

---

## 📊 성능 확인

### 예상 성능 지표

✅ **로딩 시간:**
- 포스트 첫 로딩: ~1-2초
- 캐시된 로딩: ~100-200ms
- 댓글 로딩: ~300-500ms

✅ **Lighthouse 점수 목표:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 95+

### 성능 테스트
```bash
# Chrome DevTools > Lighthouse 실행
# 또는
npx lighthouse http://localhost:3004/posts/[slug] --view
```

---

## 🎨 Medium 스타일 완전 적용 (고급)

현재 작동하는 시스템을 완전한 Medium 스타일로 변경하려면:

### 전체 레이아웃 변경

**파일: `src/app/posts/[slug]/page.tsx` 전체 교체**

```typescript
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPostBySlug, getAllPosts } from '@/lib/notion/converter'
import { createClient } from '@/lib/supabase/server'
import PostActions from '@/components/post/PostActions'
import CommentSection from '@/components/post/CommentSection'
import AuthorInfo from '@/components/post/AuthorInfo'
import RelatedPosts from '@/components/post/RelatedPosts'

// 5분마다 재검증 (ISR)
export const revalidate = 300

export async function generateStaticParams() {
  const posts = await getAllPosts(false)
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: `${post.title} | The Founder`,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      publishedTime: post.publishedDate,
      authors: [post.author],
      images: post.cover ? [post.cover] : [],
    },
  }
}

export default async function PostPage({
  params,
}: {
  params: { slug: string }
}) {
  const startTime = Date.now()
  console.log(`📄 [PostPage] Loading post: ${params.slug}`)

  const decodedSlug = decodeURIComponent(params.slug)
  const post = await getPostBySlug(decodedSlug)

  if (!post) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 관련 포스트 로드
  const allPosts = await getAllPosts(false)
  const relatedPosts = allPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  const loadTime = Date.now() - startTime
  console.log(`📄 [PostPage] Loaded in ${loadTime}ms`)

  return (
    <article className="min-h-screen bg-white">
      {/* 🔥 Medium 스타일: 최대 너비 1192px */}
      <div className="max-w-[1192px] mx-auto">

        {/* Hero Section - Cover Image */}
        {post.cover && (
          <div className="relative w-full h-[400px] mb-12">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Main Content Container - Medium 스타일 680px */}
        <div className="max-w-[680px] mx-auto px-6 md:px-8">

          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            목록으로 돌아가기
          </Link>

          {/* Category Badge */}
          {post.categoryLabel && (
            <div className="mb-4">
              <Link
                href={`/category/${post.category}`}
                className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                {post.categoryLabel}
              </Link>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Summary */}
          {post.summary && (
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {post.summary}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {post.author[0]}
              </div>
              <div>
                <div className="font-medium text-gray-900">{post.author}</div>
                <div className="text-sm text-gray-600">
                  {new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} · {post.readingTime}분 읽기
                </div>
              </div>
            </div>

            {post.isPremium && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                ⭐ 프리미엄
              </span>
            )}
          </div>

          {/* Post Actions - Vertical (Desktop) */}
          <PostActions
            postId={post.id}
            postTitle={post.title}
            variant="vertical"
          />

          {/* Main Content - Medium 스타일 Typography */}
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h1:text-4xl prose-h1:mb-4 prose-h1:mt-12
              prose-h2:text-3xl prose-h2:mb-3 prose-h2:mt-10
              prose-h3:text-2xl prose-h3:mb-2 prose-h3:mt-8
              prose-p:text-gray-800 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 prose-strong:font-bold
              prose-em:text-gray-700
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-700
              prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-gray-800 prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4
              prose-ul:my-6 prose-ul:list-disc prose-ul:pl-8
              prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-8
              prose-li:mb-2 prose-li:text-gray-800
              prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8
              prose-hr:my-12 prose-hr:border-gray-300
            "
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Post Actions Bottom */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <PostActions
              postId={post.id}
              postTitle={post.title}
              variant="horizontal"
            />
          </div>

          {/* Author Bio */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <AuthorInfo author={post.author} />
          </div>

          {/* 🔥 댓글 섹션 */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <CommentSection postId={post.id} />
          </div>

        </div>

        {/* Related Posts - 전체 너비 활용 */}
        {relatedPosts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-gray-200 bg-gray-50">
            <div className="max-w-[1192px] mx-auto px-6 md:px-8 py-16">
              <RelatedPosts
                posts={relatedPosts}
                currentPostSlug={post.slug}
              />
            </div>
          </div>
        )}

      </div>
    </article>
  )
}
```

---

## ✅ 완성 체크리스트

- [ ] Supabase SQL 마이그레이션 실행 완료
- [ ] 테이블 3개 생성 확인 (comments, post_likes, saved_posts)
- [ ] RLS 정책 설정 확인
- [ ] 댓글 작성/삭제 테스트 완료
- [ ] 대댓글 기능 테스트 완료
- [ ] 좋아요 기능 테스트 완료
- [ ] 북마크 기능 테스트 완료
- [ ] 공유 기능 테스트 완료
- [ ] 관련 글 표시 확인
- [ ] 반응형 디자인 확인 (모바일, 태블릿, 데스크톱)
- [ ] 실시간 업데이트 테스트 완료
- [ ] 성능 테스트 완료 (1-2초 이내 로딩)

---

## 🎉 완성!

모든 체크리스트를 완료했다면 축하합니다!

이제 다음 기능들을 갖춘 프로페셔널한 블로그 시스템을 보유하게 되었습니다:

- ✅ Medium 스타일의 아름다운 레이아웃
- ✅ 완전한 댓글 시스템 (대댓글 포함)
- ✅ 실시간 업데이트
- ✅ 소셜 인터랙션 (좋아요, 저장, 공유)
- ✅ 보안 (Supabase RLS)
- ✅ 반응형 디자인
- ✅ 고성능 (1-2초 로딩)

**배포 준비 완료!** 🚀

---

## 📞 추가 지원

문제가 발생하거나 추가 도움이 필요하면:

1. 브라우저 콘솔 (F12) 확인
2. 서버 로그 확인
3. Supabase 대시보드에서 에러 로그 확인
4. 이 가이드의 "문제 해결" 섹션 참조
