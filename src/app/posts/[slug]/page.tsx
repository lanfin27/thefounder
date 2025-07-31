import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts } from '@/lib/notion/converter'
import { createClient } from '@/lib/supabase/server'
import { checkUserSubscription } from '@/lib/subscription/service'
import { truncateContent } from '@/utils/content'
import PostHeader from '@/components/blog/PostHeader'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import PaywallGate from '@/components/blog/PaywallGate'
import RelatedPosts from '@/components/blog/RelatedPosts'
import PostAnalytics from '@/components/blog/PostAnalytics'
import ReadingProgress from '@/components/ui/ReadingProgress'

export async function generateStaticParams() {
  const posts = await getAllPosts()
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
  // Decode the URL parameter to handle encoded slugs
  const decodedSlug = decodeURIComponent(params.slug)
  const post = await getPostBySlug(decodedSlug)
  
  if (!post) {
    notFound()
  }
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Check subscription status
  const subscription = await checkUserSubscription(user?.id)
  const canAccessPremium = subscription.status === 'premium' && subscription.isActive
  const showPaywall = post.isPremium && !canAccessPremium
  
  // Prepare truncated content for paywall
  const truncatedContent = showPaywall ? truncateContent(post.content, 300) : post.content
  
  return (
    <>
      <ReadingProgress />
      <article className="min-h-screen bg-white pt-20 md:pt-24">
        <div className="article-container px-4 sm:px-6">
          {/* Article Header */}
          <header className="py-8 md:py-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-caption font-medium text-medium-green">
                {post.category}
              </span>
              {post.isPremium && (
                <span className="text-caption font-medium text-medium-green">
                  Premium
                </span>
              )}
            </div>
            
            <h1 className="text-heading-1 font-serif text-medium-black mb-6 text-korean">
              {post.title}
            </h1>
            
            <p className="text-body-large text-medium-black-secondary mb-8 text-korean">
              {post.summary}
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-medium-gray" />
                <div>
                  <p className="text-body-small font-medium text-medium-black">
                    {post.author}
                  </p>
                  <p className="text-caption text-medium-black-tertiary">
                    {new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} · {post.readingTime}분 읽기
                  </p>
                </div>
              </div>
            </div>
          </header>
          
          {/* Article Cover Image */}
          {post.cover && (
            <div className="mb-12 -mx-4 sm:-mx-6 md:mx-0 md:rounded-lg overflow-hidden">
              <img
                src={post.cover}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}
          
          {/* Article Content */}
          <PaywallGate
            truncatedContent={truncatedContent}
            isUserLoggedIn={!!user}
            isPremiumContent={post.isPremium}
            postTitle={post.title}
            postId={post.id}
          >
            <div className="blog-content">
              <MarkdownRenderer content={post.content} />
            </div>
          </PaywallGate>
          
          {/* Analytics tracking */}
          <PostAnalytics
            postId={post.id}
            userId={user?.id}
            enabled={!showPaywall}
          />
        </div>
        
        {/* Related Posts Section */}
        <div className="border-t border-medium-gray-border mt-16 pt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <RelatedPosts currentPost={post} />
          </div>
        </div>
      </article>
    </>
  )
}