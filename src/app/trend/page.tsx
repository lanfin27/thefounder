export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import PostCard from '@/components/cards/PostCard'

export const metadata: Metadata = {
  title: '트렌드 - The Founder',
  description: '1분 안에 파악하는 1인 창업 트렌드',
}

export default async function TrendPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('category', 'trend')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-24">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">🔥 트렌드</h1>
          <p className="text-xl text-gray-600">1분 안에 파악하는 1인 창업 트렌드</p>
        </div>

        {posts && posts.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
            {posts.map(post => (
              <div key={post.id} className="break-inside-avoid mb-6">
                <PostCard post={post} category="trend" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">아직 게시된 트렌드 콘텐츠가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
