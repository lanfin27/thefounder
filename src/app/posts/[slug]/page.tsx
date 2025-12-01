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

// ✅ Build-time safe: Direct Supabase connection (no cookies)
export async function generateStaticParams() {
  try {
    // CRITICAL: Use service role key for direct connection (no cookies)
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug')
      .in('status', ['published', '발행'])
      .order('published_date', { ascending: false })
      .limit(100); // Optimize build time

    if (error) {
      console.error('[generateStaticParams] Error:', error);
      return [];
    }

    console.log(`[generateStaticParams] Generated ${posts?.length || 0} static paths`);

    return posts?.map((post) => ({
      slug: post.slug,
    })) || [];
  } catch (error) {
    console.error('[generateStaticParams] Unexpected error:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
      robots: {
        index: false,
        follow: false
      }
    }
  }

  // Extract tags from post (if available)
  const tags = post.tags || []
  const category = post.category || 'insight'
  const categoryLabel = getCategoryLabel(category)

  // Format dates
  const publishedTime = post.publishedDate ? new Date(post.publishedDate).toISOString() : undefined
  const modifiedTime = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedTime

  return {
    title: post.title,
    description: post.summary || post.title,
    keywords: [
      ...tags,
      categoryLabel,
      '창업',
      '스타트업',
      '창업자',
      'The Founder',
      post.author || ''
    ].filter(Boolean),
    authors: [{ name: post.author || 'The Founder' }],
    openGraph: {
      title: post.title,
      description: post.summary || post.title,
      type: 'article',
      publishedTime,
      modifiedTime,
      authors: [post.author || 'The Founder'],
      section: categoryLabel,
      tags,
      locale: 'ko_KR',
      siteName: 'The Founder',
      url: `https://thefounder.co.kr/posts/${slug}`,
      images: post.cover ? [
        {
          url: post.cover,
          width: 1200,
          height: 630,
          alt: post.title
        }
      ] : [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'The Founder'
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary || post.title,
      creator: '@thefounder_kr',
      images: post.cover ? [post.cover] : ['/og-image.png'],
    },
    alternates: {
      canonical: `https://thefounder.co.kr/posts/${slug}`
    },
    category: categoryLabel
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug)
  const post = await getPostBySlug(decodedSlug)

  if (!post) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Always fetch fresh counts directly from DB to bypass Supabase query cache
  const { data: freshCounts, error: countsError } = await supabase
    .from('posts')
    .select('claps_count, comments_count')
    .eq('id', post.id)
    .single()

  if (freshCounts && !countsError) {
    post.clapsCount = freshCounts.claps_count || 0
    post.commentsCount = freshCounts.comments_count || 0
  } else if (countsError) {
    console.error('[PostPage] Error fetching fresh counts:', countsError)
  }

  const notionPageId = post.notionId || post.id

  // Load recommended posts - prioritize same category
  const allPosts = await getAllPosts()
  const sameCategoryPosts = allPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)
  const otherPosts = allPosts
    .filter(p => p.category !== post.category && p.slug !== post.slug)
    .slice(0, 3)
  const recommendedPosts = [...sameCategoryPosts, ...otherPosts].slice(0, 6)

  // Generate TOC from post content
  const tocItems = generateTocFromHTML(post.content)
  const contentWithIds = injectIdsToHeadings(post.content, tocItems)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: post.cover ? [post.cover] : [],
    datePublished: post.publishedDate,
    dateModified: post.publishedDate, // If you have modified date, use it
    author: [{
      '@type': 'Person',
      name: post.author,
      url: 'https://thefounder.co.kr' // Optional: Author profile URL
    }],
    publisher: {
      '@type': 'Organization',
      name: 'The Founder',
      logo: {
        '@type': 'ImageObject',
        url: 'https://thefounder.co.kr/logo.png' // Replace with actual logo URL
      }
    },
    description: post.summary
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
