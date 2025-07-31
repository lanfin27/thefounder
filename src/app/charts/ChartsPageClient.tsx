'use client'

import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import IndustryChartDashboard from '@/components/public/IndustryChartDashboard'
import { WithChartErrorBoundary } from '@/components/charts/ChartErrorBoundary'
import ChartDashboardSkeleton from '@/components/charts/ChartDashboardSkeleton'
import NetworkStatusIndicator from '@/components/charts/NetworkStatusIndicator'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { IndustryChartData } from '@/types/charts'

export default function ChartsPageClient() {
  const router = useRouter()

  const handleIndustryClick = (industry: string, data: IndustryChartData) => {
    console.log(`사용자가 ${industry} 차트를 클릭했습니다:`, data)
    
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'chart_click', {
        industry: industry,
        current_value: data.current,
        change_percent: data.changePercent,
        page: 'charts_dashboard'
      })
    }
    
    // Navigate to detailed view
    router.push(`/charts/${encodeURIComponent(industry)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NetworkStatusIndicator />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            홈으로 돌아가기
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            한국 스타트업 산업별 배수 동향
          </h1>
          <p className="text-lg text-gray-600">
            실시간 M&A 거래 데이터를 기반으로 한 산업별 기업가치 배수 트렌드를 확인하세요.
          </p>
        </div>

        {/* Chart Dashboard with Error Boundary and Suspense */}
        <WithChartErrorBoundary>
          <Suspense fallback={<ChartDashboardSkeleton />}>
            <IndustryChartDashboard 
              maxItems={12}
              autoRefresh={true}
              refreshInterval={300000} // 5분
              defaultTimeRange={30}
              onIndustryClick={handleIndustryClick}
              className="mb-12"
            />
          </Suspense>
        </WithChartErrorBoundary>

        {/* Additional Info Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            데이터 안내
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">배수 계산 방식</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>매출 배수: 기업가치 ÷ 연매출</li>
                <li>이익 배수: 기업가치 ÷ 연이익 (EBITDA)</li>
                <li>산업 평균값 기준으로 표시</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">차트 표시 규칙</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>빨간색: 상승 추세 (한국 증시 관례)</li>
                <li>파란색: 하락 추세</li>
                <li>회색: 변동 없음 (±2% 이내)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
            * 표시된 데이터는 실제 거래 사례를 기반으로 하며, 개별 기업의 실제 가치와는 차이가 있을 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  )
}