'use client'

import { useState, useEffect } from 'react'
import IndustryChartCardToss from './IndustryChartCardToss'
import Link from 'next/link'
import { ChevronRight, BarChart3 } from 'lucide-react'
import { fetchIndustryChartData } from '@/lib/api/charts'
import { IndustryChartData } from '@/types/charts'

export default function HomepageChartPreviewToss() {
  const [topCharts, setTopCharts] = useState<IndustryChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTopCharts()
  }, [])

  const fetchTopCharts = async () => {
    try {
      const response = await fetchIndustryChartData({
        days: 30,
        limit: 4,
        sortBy: 'change'
      })
      
      if (response.success) {
        setTopCharts(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch top charts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChartClick = (industry: string) => {
    // Track analytics if needed
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'homepage_chart_click', {
        industry: industry,
        location: 'homepage_preview'
      })
    }
  }

  // Loading skeleton - Toss style
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Clean Header - Toss Style */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            실시간 산업별 기업가치 배수
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            한국 스타트업 M&A 거래 기반 실시간 배수 트렌드
          </p>
        </div>
        
        {/* View All Button - Toss Style */}
        <Link
          href="/charts"
          className="group flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
        >
          전체보기
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Chart Grid - Clean Toss Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {topCharts.map((chart) => (
          <Link
            key={chart.industry}
            href={`/charts/${encodeURIComponent(chart.industry)}`}
            onClick={() => handleChartClick(chart.industry)}
          >
            <IndustryChartCardToss
              data={chart}
              size="medium"
              showChart={true}
            />
          </Link>
        ))}
      </div>

      {/* Market Summary - Toss Style */}
      {topCharts.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">상승</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {topCharts.filter(c => c.trend === 'up').length}개
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">하락</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {topCharts.filter(c => c.trend === 'down').length}개
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">보합</span>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  {topCharts.filter(c => c.trend === 'stable').length}개
                </span>
              </div>
            </div>
            
            {/* CTA Link */}
            <Link
              href="/charts"
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              더 많은 산업 보기 →
            </Link>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && topCharts.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">차트 데이터를 불러올 수 없습니다.</p>
          <button
            onClick={fetchTopCharts}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}