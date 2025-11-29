export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/notion/client'
import { renderBlock } from '@/lib/notion/renderer'
import { createClient } from '@/lib/supabase/server'
import PaywallGate from '@/components/blog/PaywallGate'
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

  return (
    <article className="min-h-screen bg-white">
      <PostHeader
        title={post.page.properties['제목'].title[0].plain_text}
        category={post.page.properties['카테고리'].select?.name || '기타'}
        publishedAt={post.page.properties['발행일']?.date?.start || new Date().toISOString()}
        author={{ name: 'The Founder 팀', avatar: '' }}
        readingTime={Math.ceil(post.blocks.length / 5)}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <PaywallGate
            isUserLoggedIn={!!user}
            postTitle={post.page.properties['제목'].title[0].plain_text}
            postId={post.page.id}
            contentId={post.page.id}
            triggerPoint={0.33}
          >
            <PostContent blocks={post.blocks} />
          </PaywallGate>
        </div>
      </div>
    </article>
  )
}