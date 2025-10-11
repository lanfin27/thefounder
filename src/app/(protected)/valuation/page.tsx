import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ValuationDashboard from '@/components/valuation/ValuationDashboard'

export const metadata: Metadata = {
  title: '기업가치 평가 | The Founder',
  description: '스타트업 기업가치를 간편하게 계산하고 분석하세요',
}

export default async function ValuationPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?next=/valuation')
  }

  // Check if user has access (free tier: 3 per month, premium: unlimited)
  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_status')
    .eq('id', user.id)
    .single()

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  
  const { count: valuationCount } = await supabase
    .from('valuations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', `${currentMonth}-01`)
    .lt('created_at', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()}`)

  const monthlyLimit = profile?.membership_status === 'premium' ? null : 3
  const remainingValuations = monthlyLimit ? Math.max(0, monthlyLimit - (valuationCount || 0)) : null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">기업가치 평가</h1>
            <p className="text-lg text-gray-600">
              다양한 방법론을 활용하여 스타트업의 가치를 평가해보세요
            </p>
            {remainingValuations !== null && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  이번 달 남은 평가 횟수: <strong>{remainingValuations}회</strong>
                  {remainingValuations === 0 && (
                    <span className="ml-2">
                      <a href="/membership" className="text-blue-600 hover:underline">
                        프리미엄으로 업그레이드하여 무제한 이용하기
                      </a>
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Valuation Dashboard */}
          <ValuationDashboard 
            userId={user.id}
            canCreateNew={remainingValuations === null || remainingValuations > 0}
          />
        </div>
      </div>
    </div>
  )
}