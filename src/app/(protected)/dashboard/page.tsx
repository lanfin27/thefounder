import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Users, TrendingUp, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const stats = [
    {
      name: '읽은 글',
      value: '12',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: '팔로워',
      value: '48',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: '구독 일수',
      value: profile?.membership_status === 'premium' ? '30일' : '-',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: '읽은 시간',
      value: '2.5h',
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">최근 읽은 글</h2>
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">아직 읽은 글이 없습니다.</p>
              <Link
                href="/blog"
                className="inline-flex items-center text-founder-primary hover:underline text-sm font-medium"
              >
                글 둘러보기 →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">멤버십 상태</h2>
            <div className="space-y-4">
              {profile?.membership_status === 'premium' ? (
                <div>
                  <p className="text-sm text-gray-600">현재 프리미엄 멤버입니다.</p>
                  <p className="text-lg font-semibold text-founder-primary mt-2">
                    30일 남음
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">
                    프리미엄 멤버십으로 모든 콘텐츠를 무제한으로 이용하세요.
                  </p>
                  <Link
                    href="/membership"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
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
  )
}