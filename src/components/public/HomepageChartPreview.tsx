'use client'

import { useState, useEffect } from 'react'
import IndustryChartCard from './IndustryChartCard'
import Link from 'next/link'
import { ChevronRight, BarChart3, TrendingUp, Clock } from 'lucide-react'
import { fetchIndustryChartData } from '@/lib/api/charts'
import { IndustryChartData } from '@/types/charts'
import { motion } from 'framer-motion'
import { useChartAnalytics, ChartVisibilityTracker } from './ChartAnalytics'
import { useChartPerformance } from './ChartPerformanceMonitor'

export default function HomepageChartPreview() {
  const [topCharts, setTopCharts] = useState<IndustryChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { trackChartInteraction, trackChartConversion } = useChartAnalytics()
  const { measureApiCall, reportMetrics } = useChartPerformance()

  useEffect(() => {
    fetchTopCharts()
  }, [])

  const fetchTopCharts = async () => {
    try {
      const response = await measureApiCall(async () => 
        fetchIndustryChartData({
          days: 30,
          limit: 4,
          sortBy: 'change'
        })
      )
      
      if (response.success) {
        setTopCharts(response.data)
        // Report performance metrics after data loads
        setTimeout(() => reportMetrics(), 100)
      }
    } catch (error) {
      console.error('Failed to fetch top charts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const upTrends = topCharts.filter(chart => chart.trend === 'up').length
  const avgChange = topCharts.length > 0 ? 
    topCharts.reduce((sum, chart) => sum + chart.changePercent, 0) / topCharts.length : 0

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl p-8 border border-green-100">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-96"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl p-8 border border-green-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            <h3 className="text-2xl font-bold text-gray-900">실시간 업종별 배수</h3>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <p className="text-gray-600">
            실제 거래 데이터 기반 기업가치 배수를 실시간으로 확인하세요
          </p>
        </div>
        <Link 
          href="/charts"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          전체 보기
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Market Summary */}
      <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">상승 업종:</span>
          <span className="font-semibold text-green-600">{upTrends}개</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">평균 변화:</span>
          <span className={`font-semibold ${avgChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <Clock className="w-3 h-3" />
          {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
        </div>
      </div>

      {/* Top 4 Charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {topCharts.map((chart, index) => (
          <motion.div 
            key={chart.industry}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.4,
              delay: index * 0.1
            }}
          >
            <div id={`chart-${chart.industry}`}>
              <ChartVisibilityTracker 
                chartId={chart.industry} 
                position={index + 1} 
                variant="homepage" 
              />
            <IndustryChartCard
              data={chart}
              size="small"
              onClick={() => {
                trackChartInteraction('click', {
                  chartId: chart.industry,
                  position: index + 1,
                  variant: 'homepage',
                  value: chart.current
                })
                window.location.href = `/charts/${encodeURIComponent(chart.industry)}`
              }}
            />
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center pt-6 border-t border-green-200/50">
        <p className="text-gray-600 mb-4">
          <strong>내 비즈니스</strong>는 업종 평균 대비 어떤 위치에 있을까요?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => trackChartConversion('calculate', 'homepage_chart_cta')}
          >
            내 기업가치 계산하기
          </Link>
          <Link 
            href="/charts" 
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-green-600 bg-white border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
            onClick={() => trackChartConversion('full_dashboard', 'homepage_chart_cta')}
          >
            전체 차트 보기
          </Link>
        </div>
      </div>
    </motion.div>
  )
}