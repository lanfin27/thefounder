export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import PostCard from '@/components/cards/PostCard'

export const metadata: Metadata = {
  title: '블로그 - The Founder',
  description: '창업가들의 실전 경험 공유',
}

export default async function BlogPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('category', 'blog')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-24">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">✍️ 블로그</h1>
          <p className="text-xl text-gray-600">창업가들의 실전 경험 공유</p>
        </div>

        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map(post => (
              <PostCard key={post.id} post={post} category="blog" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">아직 게시된 블로그 콘텐츠가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
