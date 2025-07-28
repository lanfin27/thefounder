import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import NewsletterToggle from '@/components/newsletter/NewsletterToggle'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get recent transactions
  const { data: transactions } = await supabase
    .from('membership_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const isPremium = profile?.membership_status === 'premium'
  const expiresAt = profile?.membership_expires_at ? new Date(profile.membership_expires_at) : null
  const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">구독 관리</h1>
          <p className="text-gray-600 mt-2">
            멤버십 상태와 결제 정보를 관리하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Membership Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">멤버십 상태</h2>
              
              {isPremium ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-gray-900">프리미엄 멤버십 활성화</p>
                        <p className="text-sm text-gray-600">모든 콘텐츠를 무제한으로 이용하고 계십니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-sm">결제 수단</span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {profile.stripe_customer_id ? '카드 등록됨' : '정보 없음'}
                      </p>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">다음 결제일</span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {expiresAt ? expiresAt.toLocaleDateString('ko-KR') : '-'}
                      </p>
                    </div>
                  </div>

                  {daysRemaining > 0 && daysRemaining <= 7 && (
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          멤버십이 {daysRemaining}일 후 만료됩니다.
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          서비스가 중단되지 않도록 결제 정보를 확인해주세요.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                      결제 정보 변경
                    </button>
                    <button className="px-4 py-2 text-red-600 font-medium hover:text-red-700 transition-colors">
                      구독 취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-4">
                      프리미엄 멤버십으로 더 많은 혜택을 누려보세요.
                    </p>
                    <Link
                      href="/membership"
                      className="inline-flex items-center px-6 py-3 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      프리미엄 시작하기
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">결제 내역</h2>
              
              {transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {(transaction.amount / 100).toLocaleString('ko-KR')}원
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : transaction.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                        }
                      `}>
                        {transaction.status === 'completed' ? '완료' : 
                         transaction.status === 'failed' ? '실패' : '대기중'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  결제 내역이 없습니다.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Newsletter Settings */}
            <NewsletterToggle 
              userId={user.id}
              initialSubscribed={profile?.newsletter_subscribed || false}
            />

            {/* Help */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">도움이 필요하신가요?</h3>
              <div className="space-y-3">
                <Link
                  href="/help/subscription"
                  className="block text-sm text-founder-primary hover:underline"
                >
                  구독 관련 FAQ →
                </Link>
                <Link
                  href="/help/payment"
                  className="block text-sm text-founder-primary hover:underline"
                >
                  결제 문제 해결 →
                </Link>
                <Link
                  href="/contact"
                  className="block text-sm text-founder-primary hover:underline"
                >
                  고객 지원 문의 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}