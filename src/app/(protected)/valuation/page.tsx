import { Metadata } from 'next'
import { Suspense } from 'react'
import { ValuationDashboard } from '@/components/valuation/ValuationDashboard'
import { ValuationErrorBoundary } from '@/components/valuation/ui/ErrorBoundary'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: '기업가치 산정 | The Founder',
  description: '1인 창업가를 위한 전문적인 기업가치 산정 도구. 실시간 업종 벤치마크와 함께 정확한 비즈니스 밸류에이션을 제공합니다.',
  keywords: ['기업가치', '밸류에이션', '스타트업', '창업', '투자', '기업평가'],
  openGraph: {
    title: '기업가치 산정 도구 | The Founder',
    description: '전문적인 기업가치 산정으로 당신의 비즈니스 가치를 확인하세요',
    type: 'website',
  },
}

export default function ValuationPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ValuationErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ValuationDashboard />
          </Suspense>
        </ValuationErrorBoundary>
      </div>
    </div>
  )
}