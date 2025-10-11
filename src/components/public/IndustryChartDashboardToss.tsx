'use client'

import { useState, useEffect, useCallback } from 'react'
import IndustryChartCardToss from './IndustryChartCardToss'
import { fetchIndustryChartData, ChartDataOptions } from '@/lib/api/charts'
import { IndustryChartData, CHART_TIME_RANGES } from '@/types/charts'
import { RefreshCw } from 'lucide-react'

interface IndustryChartDashboardTossProps {
  className?: string
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
  defaultTimeRange?: number
  onIndustryClick?: (industry: string, data: IndustryChartData) => void
}

export default function IndustryChartDashboardToss({
  className = '',
  maxItems = 8,
  autoRefresh = false,
  refreshInterval = 300000,
  defaultTimeRange = 30,
  onIndustryClick
}: IndustryChartDashboardTossProps) {
  const [chartData, setChartData] = useState<IndustryChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(defaultTimeRange)
  const [sortBy, setSortBy] = useState<'transactions' | 'change' | 'value'>('transactions')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch chart data
  const fetchData = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true)
    
    try {
      const options: ChartDataOptions = {
        days: timeRange,
        sortBy,
        limit: maxItems
      }
      
      const response = await fetchIndustryChartData(options)
      
      if (response.success) {
        setChartData(response.data)
        setLastUpdated(new Date(response.lastUpdated))
        setError(null)
      } else {
        throw new Error('Failed to fetch chart data')
      }
    } catch (err) {
      console.error('Error fetching chart data:', err)
      setError('차트 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      if (showRefreshState) {
        setTimeout(() => setIsRefreshing(false), 500)
      }
    }
  }, [timeRange, sortBy, maxItems])

  // Initial load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchData(true)
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  // Handle card click
  const handleCardClick = (data: IndustryChartData) => {
    if (onIndustryClick) {
      onIndustryClick(data.industry, data)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(8)].map((_, i) => (
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

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Clean Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              산업별 배수 트렌드
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              실시간 기업가치 배수 동향
            </p>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="새로고침"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Simplified Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Range - Clean pills */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">기간</span>
            <div className="flex gap-1">
              {CHART_TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                    ${timeRange === range.value 
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }
                  `}
                >
                  {range.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Sort - Clean pills */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">정렬</span>
            <div className="flex gap-1">
              {[
                { value: 'transactions', label: '거래량' },
                { value: 'change', label: '변동률' },
                { value: 'value', label: '배수' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as typeof sortBy)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                    ${sortBy === option.value 
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Grid - Toss Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {chartData.map((data) => (
          <IndustryChartCardToss
            key={data.industry}
            data={data}
            size="medium"
            onClick={() => handleCardClick(data)}
            showChart={true}
          />
        ))}
      </div>

      {/* Empty State */}
      {chartData.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            선택한 조건에 맞는 데이터가 없습니다.
          </p>
        </div>
      )}

      {/* Last updated info */}
      <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
        마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
        {autoRefresh && ` • ${Math.floor(refreshInterval / 60000)}분마다 자동 업데이트`}
      </div>
    </div>
  )
}