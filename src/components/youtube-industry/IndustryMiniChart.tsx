'use client'

/**
 * Industry Mini Chart Component
 * 각 산업의 미니 트렌드 차트를 표시
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { format } from 'date-fns'

interface ChartData {
  date: string
  viewsPerVideo: number
  timestamp: number
}

interface IndustryMiniChartProps {
  categoryCode: string
  categoryName: string
  categoryIcon: string  // ✅ DB 카테고리 아이콘
  period: '1m' | '3m' | '6m' | '1y'
}

export function IndustryMiniChart({
  categoryCode,
  categoryName,
  categoryIcon,  // ✅ DB 카테고리 아이콘
  period
}: IndustryMiniChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [latestValue, setLatestValue] = useState<number>(0)
  const [change, setChange] = useState<number>(0)
  const [changePercent, setChangePercent] = useState<number>(0)

  useEffect(() => {
    fetchData()
  }, [categoryCode, period])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(false)

      console.log(`[IndustryMiniChart] Fetching ${categoryCode} (${period})`)

      const response = await fetch(
        `/api/youtube-industry/categories/${categoryCode}/history?period=${period}`
      )

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const result = await response.json()

      console.log(`[IndustryMiniChart] ${categoryCode} response:`, {
        success: result.success,
        dataLength: result.data?.chartData?.length || 0
      })

      if (result.success && result.data?.chartData && result.data.chartData.length > 0) {
        const chartData = result.data.chartData

        setData(chartData)

        // 최신값과 변화 계산
        const latest = chartData[chartData.length - 1]
        const first = chartData[0]
        const latestVal = latest.viewsPerVideo
        const firstVal = first.viewsPerVideo
        const changeVal = latestVal - firstVal
        const changePercentVal = firstVal > 0 ? ((changeVal / firstVal) * 100) : 0

        setLatestValue(latestVal)
        setChange(changeVal)
        setChangePercent(changePercentVal)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error(`[IndustryMiniChart] Error loading ${categoryCode}:`, err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B'
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
    return value.toFixed(0)
  }

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-100 dark:bg-gray-900 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" role="img" aria-label={categoryName}>{categoryIcon}</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {categoryName}
          </h3>
        </div>
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs">
          데이터 없음
        </div>
      </div>
    )
  }

  // 색상 결정 (증가: 빨강, 감소: 파랑)
  const lineColor = changePercent >= 0 ? '#ef4444' : '#3b82f6'
  const textColor = changePercent >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'

  return (
    <Link
      href={`/youtube-industry/${categoryCode}`}
      className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
    >
      {/* 헤더: 산업명과 아이콘 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" role="img" aria-label={categoryName}>{categoryIcon}</span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {categoryName}
        </h3>
      </div>

      {/* 통계 */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatValue(latestValue)}
          </span>
          <span className={`text-sm font-medium ${textColor}`}>
            {changePercent >= 0 ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {change >= 0 ? '+' : ''}{formatValue(change)}
        </div>
      </div>

      {/* 미니 차트 */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              hide
            />
            <YAxis
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [formatValue(value), '영상당 조회수']}
              labelFormatter={(timestamp) => format(new Date(timestamp), 'yyyy-MM-dd')}
            />
            <Line
              type="monotone"
              dataKey="viewsPerVideo"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 하단: 기간 표시 */}
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
        {period === '1m' && '최근 1개월'}
        {period === '3m' && '최근 3개월'}
        {period === '6m' && '최근 6개월'}
        {period === '1y' && '최근 1년'}
      </div>
    </Link>
  )
}
