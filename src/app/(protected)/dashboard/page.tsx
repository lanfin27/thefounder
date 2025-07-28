import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Clock, Bookmark, History } from 'lucide-react'
import ReadingHistory from '@/components/dashboard/ReadingHistory'
import BookmarksList from '@/components/dashboard/BookmarksList'
import MembershipCTA from '@/components/membership/MembershipCTA'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Fetch reading history
  const { data: readingHistory } = await supabase
    .from('user_reading_history')
    .select(`
      *,
      posts!inner(
        id,
        title,
        slug,
        category,
        author,
        cover
      )
    `)
    .eq('user_id', user!.id)
    .order('last_read_at', { ascending: false })
    .limit(10)

  // Fetch bookmarks
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`
      *,
      posts!inner(
        id,
        title,
        slug,
        category,
        author,
        summary,
        cover,
        is_premium
      )
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate stats
  const { count: totalReadPosts } = await supabase
    .from('user_reading_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  const { data: totalReadingTime } = await supabase
    .from('user_reading_history')
    .select('total_reading_time')
    .eq('user_id', user!.id)

  const totalMinutes = totalReadingTime?.reduce((acc, curr) => acc + (curr.total_reading_time || 0), 0) || 0
  const totalHours = (totalMinutes / 3600).toFixed(1)

  const stats = [
    {
      name: '읽은 글',
      value: totalReadPosts?.toString() || '0',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: '북마크',
      value: bookmarks?.length.toString() || '0',
      icon: Bookmark,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: '구독 상태',
      value: profile?.membership_status === 'premium' ? '프리미엄' : '무료',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: '읽은 시간',
      value: `${totalHours}h`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            안녕하세요, {profile?.name || user?.email?.split('@')[0]}님
          </h1>
          <p className="text-gray-600 mt-2">
            오늘도 한국 스타트업의 새로운 인사이트를 만나보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.bgColor} rounded-lg p-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Membership CTA for free users */}
        {profile?.membership_status !== 'premium' && (
          <div className="mb-8">
            <MembershipCTA variant="inline" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reading History */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  읽기 기록
                </h2>
                <Link
                  href="/dashboard/history"
                  className="text-sm text-founder-primary hover:underline"
                >
                  전체 보기
                </Link>
              </div>
            </div>
            <div className="p-6">
              <ReadingHistory history={readingHistory || []} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Bookmarks */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Bookmark className="w-5 h-5" />
                    북마크
                  </h2>
                  <Link
                    href="/dashboard/bookmarks"
                    className="text-sm text-founder-primary hover:underline"
                  >
                    전체 보기
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <BookmarksList bookmarks={bookmarks?.slice(0, 3) || []} />
              </div>
            </div>

            {/* Membership Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">멤버십 상태</h2>
              <div className="space-y-4">
                {profile?.membership_status === 'premium' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">상태</span>
                      <span className="text-sm font-semibold text-founder-primary">프리미엄</span>
                    </div>
                    {profile.membership_expires_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">만료일</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(profile.membership_expires_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                    <Link
                      href="/dashboard/subscription"
                      className="inline-flex items-center mt-4 text-sm text-founder-primary hover:underline"
                    >
                      구독 관리 →
                    </Link>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      프리미엄 멤버십으로 더 많은 혜택을 누리세요.
                    </p>
                    <Link
                      href="/membership"
                      className="block w-full text-center px-4 py-2 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      프리미엄 시작하기
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}