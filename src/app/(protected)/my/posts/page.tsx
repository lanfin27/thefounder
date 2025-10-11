import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FileText, Edit3, Trash2, Eye, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '내 글 목록 | The Founder',
  description: '작성한 글을 관리하고 확인하세요',
}

async function getMyPosts(userId: string) {
  const supabase = await createClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      categories (
        id,
        name,
        slug
      )
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  
  return posts || []
}

export default async function MyPostsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  const posts = await getMyPosts(user.id)
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">내 글 목록</h1>
              <p className="mt-2 text-gray-600">
                총 {posts.length}개의 글을 작성하셨습니다.
              </p>
            </div>
            <Link
              href="/write"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              새 글 작성
            </Link>
          </div>
        </div>
        
        {/* Posts List */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              아직 작성한 글이 없습니다
            </h2>
            <p className="text-gray-600 mb-6">
              The Founder에서 첫 번째 글을 작성해보세요.
            </p>
            <Link
              href="/write"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              첫 글 작성하기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      {post.categories && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {post.categories.name}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.status === 'published' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {post.status === 'published' ? '게시됨' : '임시저장'}
                      </span>
                      {post.is_premium && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          프리미엄
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      <Link 
                        href={`/posts/${post.slug}`}
                        className="hover:text-green-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        조회 {post.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        좋아요 {post.like_count || 0}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/write/${post.id}`}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit3 className="w-5 h-5" />
                    </Link>
                    <button
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Stats Summary */}
        {posts.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">통계</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {posts.reduce((sum, post) => sum + (post.view_count || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">총 조회수</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {posts.reduce((sum, post) => sum + (post.like_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">총 좋아요</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {posts.filter(post => post.status === 'published').length}
                </div>
                <div className="text-sm text-gray-600">게시된 글</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}