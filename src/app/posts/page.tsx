import { Metadata } from 'next'
import { getAllPosts } from '@/lib/notion/converter'
import PostCard from '@/components/blog/PostCard'
import CategoryFilter from '@/components/blog/CategoryFilter'

export const metadata: Metadata = {
  title: '블로그 | The Founder',
  description: '한국 스타트업 생태계의 깊이 있는 인사이트와 창업가들의 이야기',
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const posts = await getAllPosts()
  
  // Filter by category if provided
  const filteredPosts = searchParams.category
    ? posts.filter(post => post.category === searchParams.category)
    : posts
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            블로그
          </h1>
          <p className="text-lg text-gray-600">
            스타트업 세계의 다양한 인사이트를 만나보세요
          </p>
        </div>
        
        <CategoryFilter currentCategory={searchParams.category} />
        
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              아직 등록된 글이 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}