import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/notion/client'
import { renderBlock } from '@/lib/notion/renderer'
import { createClient } from '@/lib/supabase/server'
import PremiumGate from '@/components/blog/PremiumGate'
import PostHeader from '@/components/blog/PostHeader'
import PostContent from '@/components/blog/PostContent'

export default async function BlogPostPage({
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
  
  // TODO: Check actual membership status from database
  const isPremiumMember = false
  const isLocked = post.page.properties.Premium.checkbox && !isPremiumMember

  return (
    <article className="min-h-screen bg-white">
      <PostHeader
        title={post.page.properties.Title.title[0].plain_text}
        category={post.page.properties.Category.select.name}
        publishedAt={post.page.properties.PublishedAt.date.start}
        author={{ name: 'The Founder 팀', avatar: '' }}
        readingTime={Math.ceil(post.blocks.length / 5)}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {isLocked ? (
            <div>
              <div className="blog-content mb-8">
                {post.blocks.slice(0, 3).map((block) => renderBlock(block))}
              </div>
              <PremiumGate />
            </div>
          ) : (
            <PostContent blocks={post.blocks} />
          )}
        </div>
      </div>
    </article>
  )
}