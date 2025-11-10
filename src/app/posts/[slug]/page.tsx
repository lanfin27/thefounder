import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { createClient } from '@/lib/supabase/server'
import NotionContentRenderer from '@/components/blog/NotionContentRenderer'
import PaywallGate from '@/components/blog/PaywallGate'
import PostAnalytics from '@/components/blog/PostAnalytics'
import ReadingProgress from '@/components/ui/ReadingProgress'
import CommentSection from '@/components/post/CommentSection'
import RecommendedPosts from '@/components/post/RecommendedPosts'
import BookmarkButton from '@/components/library/BookmarkButton'
import ReadingTracker from '@/components/library/ReadingTracker'
import TableOfContents from '@/components/blog/TableOfContents'
import { generateTocFromHTML, injectIdsToHeadings } from '@/utils/toc'

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

// 5분마다 재검증 (ISR)
export const revalidate = 300

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

  const notionPageId = post.notionId || post.id

  // Load recommended posts - prioritize same category
  const allPosts = await getAllPosts(false)
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
            </article>
          </div>
        </div>

        {/* Comments Section (Full width, outside TOC layout) */}
        <div id="comments" className="mt-12">
          <div className="mx-auto max-w-2xl px-6 md:px-8 py-12">
            <CommentSection postId={notionPageId} />
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
