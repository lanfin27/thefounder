// 🔥 Next.js 캐시 비활성화 - 항상 최신 데이터 표시
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { createClient } from '@/lib/supabase/server'
import NotionContentRenderer from '@/components/blog/NotionContentRenderer'
import PaywallGate from '@/components/blog/PaywallGate'
import PostAnalytics from '@/components/blog/PostAnalytics'
import ReadingProgress from '@/components/ui/ReadingProgress'
import CommentSectionWrapper from '@/components/post/CommentSectionWrapper'
import RecommendedPosts from '@/components/post/RecommendedPosts'
import BookmarkButton from '@/components/library/BookmarkButton'
import ReadingTracker from '@/components/library/ReadingTracker'
import TableOfContents from '@/components/blog/TableOfContents'
import { generateTocFromHTML, injectIdsToHeadings } from '@/utils/toc'
import ForceOpenCallouts from '@/components/blog/ForceOpenCallouts'
import PostStats from '@/components/blog/PostStats'

// Helper function to format category labels
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'startup': '스타트업',
    'tech': '기술',
    'business': '비즈니스',
    'insight': '인사이트',
    'case-study': '성공사례',
    'interview': '인터뷰'
  }
  return labels[category] || category
}

export async function generateStaticParams() {
  console.log('[generateStaticParams] 🔍 Fetching all posts from Supabase')
  const posts = await getAllPosts()
  console.log(`[generateStaticParams] ✅ Generated params for ${posts.length} posts`)
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
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: post.cover ? [post.cover] : [],
    },
  }
}

export default async function PostPage({
  params,
}: {
  params: { slug: string }
}) {
  const decodedSlug = decodeURIComponent(params.slug)
  console.log(`[PostPage] 🔍 Fetching post with slug: "${decodedSlug}" from Supabase`)

  const post = await getPostBySlug(decodedSlug)

  if (!post) {
    console.log(`[PostPage] ❌ Post not found: "${decodedSlug}"`)
    notFound()
  }

  console.log(`[PostPage] ✅ Found post: "${post.title}"`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 🔥 Always fetch fresh counts directly from DB to bypass Supabase query cache
  console.log(`[PostPage] 📊 Fetching fresh counts from database for post.id: ${post.id}`)
  const { data: freshCounts, error: countsError } = await supabase
    .from('posts')
    .select('claps_count, comments_count')
    .eq('id', post.id)
    .single()

  if (freshCounts && !countsError) {
    console.log(`[PostPage] 🔄 Updating counts from DB:`)
    console.log(`   - Old: claps=${post.clapsCount || 0}, comments=${post.commentsCount || 0}`)
    console.log(`   - New: claps=${freshCounts.claps_count || 0}, comments=${freshCounts.comments_count || 0}`)

    post.clapsCount = freshCounts.claps_count || 0
    post.commentsCount = freshCounts.comments_count || 0
  } else if (countsError) {
    console.error(`[PostPage] ❌ Error fetching fresh counts:`, countsError)
  }

  console.log(`[PostPage] 📊 Final counts: claps=${post.clapsCount || 0}, comments=${post.commentsCount || 0}`)

  const notionPageId = post.notionId || post.id

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[PostPage] 📝 Preparing notionPageId for comments')
  console.log(`[PostPage] 📝 post.notionId:`, post.notionId)
  console.log(`[PostPage] 📝 post.id:`, post.id)
  console.log(`[PostPage] 📝 notionPageId (final):`, notionPageId)
  console.log(`[PostPage] 📝 notionPageId type:`, typeof notionPageId)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Load recommended posts - prioritize same category
  const allPosts = await getAllPosts()
  const sameCategoryPosts = allPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)
  const otherPosts = allPosts
    .filter(p => p.category !== post.category && p.slug !== post.slug)
    .slice(0, 3)
  const recommendedPosts = [...sameCategoryPosts, ...otherPosts].slice(0, 6)

  // Debug: Verify slug exists and format
  console.log('🔍 [PostPage] Post data:', {
    id: post.id,
    slug: post.slug,
    hasSlug: !!post.slug,
    title: post.title?.substring(0, 30)
  })

  // Generate TOC from post content
  const tocItems = generateTocFromHTML(post.content)
  const contentWithIds = injectIdsToHeadings(post.content, tocItems)

  return (
    <>
      <ReadingProgress />
      <ReadingTracker postId={post.slug} />
      <ForceOpenCallouts />
      <div className="min-h-screen bg-white">
        {/* Layout with TOC Sidebar */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex gap-12 relative">
            {/* Left Sidebar: Table of Contents (Desktop only) */}
            {tocItems.length > 0 && (
              <aside className="hidden xl:block w-64 flex-shrink-0">
                <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                  <TableOfContents items={tocItems} />
                </div>
              </aside>
            )}

            {/* Main Content (centered, 680px max-width) */}
            <article className="flex-1 max-w-2xl mx-auto px-0 md:px-0">
          {/* Title Section */}
          <header className="pt-12 pb-8 border-b border-gray-200">
            {/* Category Badge - Like Medium's "ILLUMINATION" */}
            {post.category && (
              <Link
                href={`/category/${post.category}`}
                className="inline-block mb-4"
              >
                <span className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  {getCategoryLabel(post.category)}
                </span>
              </Link>
            )}

            {/* Title */}
            <h1 className="text-[42px] leading-[1.1] font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            {/* Summary */}
            {post.summary && (
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                {post.summary}
              </p>
            )}

            {/* Meta Info (without author) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <time dateTime={post.publishedDate}>
                  {new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                {post.readingTime && (
                  <>
                    <span>·</span>
                    <span>{post.readingTime}분 읽기</span>
                  </>
                )}
              </div>

              {/* Bookmark Button */}
              <BookmarkButton postId={post.slug} postTitle={post.title} />
            </div>

            {/* Post Stats (Claps & Comments) - First Location */}
            <div className="mt-6 pb-6 border-b border-gray-200">
              <PostStats
                postSlug={post.slug}
                initialClaps={post.clapsCount || 0}
                initialComments={post.commentsCount || 0}
                size="md"
              />
            </div>
          </header>

          {/* Header Image (inside article, after title) */}
          {post.cover && (
            <div className="w-full my-8">
              <img
                src={post.cover}
                alt={post.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}

          {/* Content */}
          <PaywallGate
            isUserLoggedIn={!!user}
            postTitle={post.title}
            postId={post.id}
          >
            <div className="prose prose-lg max-w-none py-12 medium-content">
              <NotionContentRenderer content={contentWithIds} isRichContent={true} />
            </div>
          </PaywallGate>

          {/* Analytics */}
          <PostAnalytics
            postId={post.id}
            userId={user?.id}
            enabled={true}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 py-8 border-t border-gray-200">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Post Stats (Claps & Comments) - Second Location */}
          <div className="py-8 border-t border-gray-200">
            <PostStats
              postSlug={post.slug}
              initialClaps={post.clapsCount || 0}
              initialComments={post.commentsCount || 0}
              size="md"
              showLabels={true}
            />
          </div>
            </article>
          </div>
        </div>

        {/* Comments Section (Full width, outside TOC layout) */}
        <div id="comments" className="mt-12">
          <div className="mx-auto max-w-2xl px-6 md:px-8 py-12">
            {/* Debug logging for postId propagation */}
            {console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
            {console.log('[PostPage] 🎬 Rendering CommentSectionWrapper')}
            {console.log('[PostPage] 📝 Passing notionPageId:', notionPageId)}
            {console.log('[PostPage] 📝 notionPageId type:', typeof notionPageId)}
            {console.log('[PostPage] 📝 notionPageId truthy:', !!notionPageId)}
            {console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

            <CommentSectionWrapper postId={notionPageId} />
          </div>
        </div>

        {/* Recommended from Founder */}
        {recommendedPosts.length > 0 && (
          <div className="border-t border-gray-200">
            <div className="mx-auto max-w-2xl px-6 md:px-8 py-12">
              <h2 className="text-base font-semibold text-gray-900 mb-6">
                Recommended from Founder
              </h2>
              <RecommendedPosts
                posts={recommendedPosts}
                currentPostSlug={post.slug}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
