import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import PostCard from '@/components/cards/PostCard'

export const metadata: Metadata = {
  title: '인사이트 - The Founder',
  description: '성공한 창업가들의 생생한 이야기',
}

export default async function InsightPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('category', 'insight')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-24">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">🎬 인사이트</h1>
          <p className="text-xl text-gray-600">성공한 창업가들의 생생한 이야기</p>
        </div>

        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <PostCard key={post.id} post={post} category="insight" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">아직 게시된 인사이트 콘텐츠가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
