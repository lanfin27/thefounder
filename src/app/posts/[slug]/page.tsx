import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts } from '@/lib/notion/converter'
import { createClient } from '@/lib/supabase/server'
import PostHeader from '@/components/blog/PostHeader'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import PremiumGate from '@/components/blog/PremiumGate'
import RelatedPosts from '@/components/blog/RelatedPosts'

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
  const post = await getPostBySlug(params.slug)
  
  if (!post) {
    notFound()
  }
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Check if user has premium access
  let isPremiumMember = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership_status')
      .eq('id', user.id)
      .single()
      
    isPremiumMember = profile?.membership_status === 'premium'
  }
  
  const isLocked = post.isPremium && !isPremiumMember
  
  // Track reading if user is logged in
  if (user && !isLocked) {
    await supabase
      .from('read_posts')
      .upsert({
        user_id: user.id,
        post_id: post.id,
        reading_time: post.readingTime,
      })
  }
  
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
          
          {isLocked ? (
            <div>
              <div className="mb-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  {post.summary}
                </p>
              </div>
              <PremiumGate />
            </div>
          ) : (
            <div className="prose-korean">
              <MarkdownRenderer content={post.content} />
            </div>
          )}
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <RelatedPosts currentPost={post} />
          </div>
        </div>
      </div>
    </article>
  )
}