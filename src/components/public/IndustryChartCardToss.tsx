'use client'

import { useState, useMemo } from 'react'
import { IndustryChartData } from '@/types/charts'
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts'

interface IndustryChartCardTossProps {
  data: IndustryChartData
  onClick?: () => void
  size?: 'small' | 'medium' | 'large'
  showChart?: boolean
  className?: string
}

export default function IndustryChartCardToss({
  data,
  onClick,
  size = 'medium',
  showChart = true,
  className = ''
}: IndustryChartCardTossProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Toss-style colors
  const isPositive = data.changePercent >= 0
  const trendColor = isPositive ? '#EF4444' : '#3B82F6' // Red for up, Blue for down
  const bgColor = isPositive ? 'bg-red-50' : 'bg-blue-50'
  const textColor = isPositive ? 'text-red-600' : 'text-blue-600'
  const darkBgColor = isPositive ? 'dark:bg-red-900/20' : 'dark:bg-blue-900/20'
  const darkTextColor = isPositive ? 'dark:text-red-400' : 'dark:text-blue-400'
  
  // Prepare chart data
  const chartData = useMemo(() => {
    return data.chartData.map((point, index) => ({
      ...point,
      index
    }))
  }, [data.chartData])

  const sizeClasses = {
    small: 'p-4 min-h-[140px]',
    medium: 'p-5 min-h-[180px]',
    large: 'p-6 min-h-[220px]'
  }

  const chartHeights = {
    small: 60,
    medium: 80,
    large: 100
  }

  return (
    <div
      className={`
        relative bg-white dark:bg-gray-900 rounded-xl
        shadow-sm hover:shadow-md transition-all duration-200
        cursor-pointer overflow-hidden
        ${sizeClasses[size]} ${className}
        hover:scale-[1.01] active:scale-[0.99]
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Real-time indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">실시간</span>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
          {data.industry}
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          매출 배수
        </div>
      </div>

      {/* Value and Change */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {data.current.toFixed(1)}x
        </span>
        
        {/* Percentage Badge - Toss Style */}
        <div className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
          ${bgColor} ${textColor} ${darkBgColor} ${darkTextColor}
        `}>
          <span className="text-[10px]">
            {isPositive ? '▲' : '▼'}
          </span>
          {Math.abs(data.changePercent).toFixed(2)}%
        </div>
      </div>

      {/* Chart */}
      {showChart && data.chartData.length > 1 && (
        <div className="relative -mx-2">
          <ResponsiveContainer width="100%" height={chartHeights[size]}>
            <AreaChart 
              data={chartData} 
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={`gradient-${data.industry}-toss`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <Area
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={2}
                fill={`url(#gradient-${data.industry}-toss)`}
                animationDuration={1000}
                animationBegin={0}
              />
              
              {/* Subtle reference line at current value */}
              {isHovered && (
                <ReferenceLine 
                  y={data.current} 
                  stroke={trendColor} 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.3}
                />
              )}
              
              {/* Clean tooltip */}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  padding: '8px 12px'
                }}
                labelStyle={{ display: 'none' }}
                formatter={(value: number) => [`${value.toFixed(2)}x`, '']}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Stats - Only on hover */}
      {isHovered && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>최고 <span className="font-medium">{data.stats.high30d.toFixed(1)}x</span></span>
            <span>평균 <span className="font-medium">{data.stats.avg30d.toFixed(1)}x</span></span>
            <span>최저 <span className="font-medium">{data.stats.low30d.toFixed(1)}x</span></span>
          </div>
        </div>
      )}

      {/* Loading skeleton overlay */}
      {!data && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 animate-pulse">
          <div className="p-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      )}
    </div>
  )
}