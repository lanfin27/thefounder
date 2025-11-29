export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { Metadata } from 'next'
import { getAllPosts } from '@/lib/posts'
import CategoryFilter from '@/components/blog/CategoryFilter'
import { CATEGORY_MAPPING } from '@/constants/categories'
import PostList from '@/components/sections/PostList'

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

  // Check for admin status
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  let isAdmin = false
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isAdmin = profile?.role === 'admin'
  }

  // Filter by category if provided
  const filteredPosts = searchParams.category
    ? posts.filter(post => {
      // Check if the post's category matches the new category slug
      const mappedCategory = CATEGORY_MAPPING[post.category || '']
      return mappedCategory === searchParams.category ||
        post.category === searchParams.category
    })
    : posts

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-heading-1 font-serif text-medium-black mb-4 text-korean">
              전체글
            </h1>
            <p className="text-body-large text-medium-black-secondary text-korean">
              1인 창업가를 위한 공간
            </p>
          </div>

          <CategoryFilter currentCategory={searchParams.category} />

          <PostList posts={filteredPosts} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}