import { createClient } from '@supabase/supabase-js'
import FeaturedCard from '@/components/cards/FeaturedCard'

export default async function FeaturedContentSection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 각 카테고리별 최신 글 1개씩 가져오기
  const { data: trendPost } = await supabase
    .from('posts')
    .select('id, title, slug, category, cover_image, summary, published_at')
    .eq('category', 'trend')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  const { data: insightPost } = await supabase
    .from('posts')
    .select('id, title, slug, category, cover_image, summary, published_at')
    .eq('category', 'insight')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  const { data: casePost } = await supabase
    .from('posts')
    .select('id, title, slug, category, cover_image, summary, published_at')
    .eq('category', 'casestudy')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  const { data: blogPost } = await supabase
    .from('posts')
    .select('id, title, slug, category, cover_image, summary, published_at')
    .eq('category', 'blog')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">⭐ Featured Content</h2>
          <p className="text-gray-600 text-lg">엄선된 콘텐츠를 만나보세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 트렌드 카드 */}
          <FeaturedCard
            category="트렌드"
            emoji="🔥"
            post={trendPost}
            bgColor="bg-gradient-to-br from-red-50 to-orange-50"
          />

          {/* 인사이트 카드 */}
          <FeaturedCard
            category="인사이트"
            emoji="🎬"
            post={insightPost}
            bgColor="bg-gradient-to-br from-blue-50 to-indigo-50"
          />

          {/* 사례 카드 */}
          <FeaturedCard
            category="사례"
            emoji="📚"
            post={casePost}
            bgColor="bg-gradient-to-br from-purple-50 to-pink-50"
          />

          {/* 블로그 카드 */}
          <FeaturedCard
            category="블로그"
            emoji="✍️"
            post={blogPost}
            bgColor="bg-gradient-to-br from-green-50 to-emerald-50"
          />
        </div>
      </div>
    </section>
  )
}
