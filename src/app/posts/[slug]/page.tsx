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
    <article className="min-h-screen bg-white">
      <PostHeader
        title={post.title}
        category={post.category}
        publishedAt={post.publishedDate}
        author={{ name: post.author }}
        readingTime={post.readingTime}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {post.cover && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={post.cover}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}
          
          <PaywallGate
            truncatedContent={truncatedContent}
            isUserLoggedIn={!!user}
            isPremiumContent={post.isPremium}
            postTitle={post.title}
            postId={post.id}
          >
            <div className="prose-korean">
              <MarkdownRenderer content={post.content} />
            </div>
          </PaywallGate>
          
          {/* Analytics tracking */}
          <PostAnalytics
            postId={post.id}
            userId={user?.id}
            enabled={!showPaywall}
          />
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <RelatedPosts currentPost={post} />
          </div>
        </div>
      </div>
    </article>
  )
}