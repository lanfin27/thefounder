'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import IndustryChartCard from './IndustryChartCard'
import { fetchIndustryChartData, ChartDataOptions } from '@/lib/api/charts'
import { IndustryChartData, CHART_TIME_RANGES } from '@/types/charts'
import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Loader2,
  AlertCircle,
  BarChart3,
  ArrowUpDown
} from 'lucide-react'

interface IndustryChartDashboardProps {
  className?: string
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
  defaultTimeRange?: number
  onIndustryClick?: (industry: string, data: IndustryChartData) => void
}

export default function IndustryChartDashboard({
  className = '',
  maxItems = 8,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  defaultTimeRange = 30,
  onIndustryClick
}: IndustryChartDashboardProps) {
  const [chartData, setChartData] = useState<IndustryChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(defaultTimeRange)
  const [sortBy, setSortBy] = useState<'transactions' | 'change' | 'value'>('transactions')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium')

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
        
        // Log if using mock data for development awareness
        if ((response as any).meta?.usingMockData) {
          console.info('📊 차트가 모의 데이터를 사용 중입니다. 실제 데이터를 사용하려면 데이터베이스 마이그레이션을 실행하세요.')
        }
      } else {
        throw new Error('Failed to fetch chart data')
      }
    } catch (err) {
      console.error('Error fetching chart data:', err)
      setError('차트 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      if (showRefreshState) {
        setTimeout(() => setIsRefreshing(false), 500) // Show refresh animation
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
    } else {
      // Default behavior: navigate to detail page
      window.location.href = `/charts/${encodeURIComponent(data.industry)}`
    }
  }

  // Sort options
  const sortOptions = [
    { value: 'transactions', label: '거래량', icon: BarChart3 },
    { value: 'change', label: '변동률', icon: TrendingUp },
    { value: 'value', label: '배수', icon: ArrowUpDown }
  ]

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">차트 데이터를 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">산업별 배수 트렌드</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="ml-2 p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">기간</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {CHART_TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`
                    px-3 py-1 text-sm font-medium rounded-md transition-all
                    ${timeRange === range.value 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {range.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">정렬</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as typeof sortBy)}
                  className={`
                    flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-all
                    ${sortBy === option.value 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <option.icon className="w-3 h-3" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">크기</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardSize(size)}
                  className={`
                    px-3 py-1 text-sm font-medium rounded-md transition-all capitalize
                    ${cardSize === size 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div className={`
        grid gap-4 
        ${cardSize === 'small' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' :
          cardSize === 'medium' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }
      `}>
        <AnimatePresence mode="popLayout">
          {chartData.map((data, index) => (
            <motion.div
              key={data.industry}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.05,
                layout: { duration: 0.3 }
              }}
            >
              <IndustryChartCard
                data={data}
                size={cardSize}
                onClick={() => handleCardClick(data)}
                showChart={cardSize !== 'small' || window.innerWidth > 640}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {chartData.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">선택한 조건에 맞는 데이터가 없습니다.</p>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="mt-4 text-center text-xs text-gray-400">
          <RefreshCw className="w-3 h-3 inline mr-1" />
          {Math.floor(refreshInterval / 1000)}초마다 자동 업데이트
        </div>
      )}
    </div>
  )
}