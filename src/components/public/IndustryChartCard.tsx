'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { IndustryChartData, formatPercentChange, getChangeColor, getChartGradient } from '@/types/charts'
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react'

interface IndustryChartCardProps {
  data: IndustryChartData
  onClick?: () => void
  size?: 'small' | 'medium' | 'large'
  showChart?: boolean
  className?: string
}

export default function IndustryChartCard({
  data,
  onClick,
  size = 'medium',
  showChart = true,
  className = ''
}: IndustryChartCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Calculate min/max for chart scaling
  const { minValue, maxValue } = useMemo(() => {
    const values = data.chartData.map(d => d.value)
    return {
      minValue: Math.min(...values) * 0.95,
      maxValue: Math.max(...values) * 1.05
    }
  }, [data.chartData])

  // Create SVG path for sparkline
  const chartPath = useMemo(() => {
    if (!showChart || data.chartData.length < 2) return ''
    
    const width = size === 'small' ? 80 : size === 'medium' ? 120 : 160
    const height = size === 'small' ? 40 : size === 'medium' ? 60 : 80
    
    const xScale = width / (data.chartData.length - 1)
    const yRange = maxValue - minValue
    const yScale = height / yRange
    
    const points = data.chartData.map((point, index) => {
      const x = index * xScale
      const y = height - ((point.value - minValue) * yScale)
      return `${x},${y}`
    })
    
    return `M ${points.join(' L ')}`
  }, [data.chartData, showChart, size, minValue, maxValue])

  // Gradient area path
  const areaPath = useMemo(() => {
    if (!chartPath) return ''
    const width = size === 'small' ? 80 : size === 'medium' ? 120 : 160
    const height = size === 'small' ? 40 : size === 'medium' ? 60 : 80
    return `${chartPath} L ${width},${height} L 0,${height} Z`
  }, [chartPath, size])

  const sizeClasses = {
    small: 'p-3 min-w-[160px]',
    medium: 'p-4 min-w-[220px]',
    large: 'p-6 min-w-[300px]'
  }

  const textSizes = {
    small: {
      industry: 'text-sm',
      value: 'text-lg',
      change: 'text-xs',
      stat: 'text-[10px]'
    },
    medium: {
      industry: 'text-base',
      value: 'text-2xl',
      change: 'text-sm',
      stat: 'text-xs'
    },
    large: {
      industry: 'text-lg',
      value: 'text-3xl',
      change: 'text-base',
      stat: 'text-sm'
    }
  }

  const changeIcon = {
    up: <ArrowUpRight className="w-3 h-3" />,
    down: <ArrowDownRight className="w-3 h-3" />,
    stable: <Minus className="w-3 h-3" />
  }

  return (
    <motion.div
      className={`
        relative bg-white rounded-xl border border-gray-100 
        ${sizeClasses[size]} ${className}
        cursor-pointer overflow-hidden
        hover:shadow-lg transition-all duration-300
      `}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background gradient effect */}
      <div 
        className={`
          absolute inset-0 opacity-5 
          bg-gradient-to-br ${getChartGradient(data.trend)}
        `} 
      />
      
      {/* Header */}
      <div className="relative z-10 mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-medium text-gray-900 ${textSizes[size].industry}`}>
            {data.industry}
          </h3>
          {data.stats.totalTransactions > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <TrendingUp className="w-3 h-3" />
              <span className={textSizes[size].stat}>
                {data.stats.totalTransactions}건
              </span>
            </div>
          )}
        </div>
        
        {/* Current value and change */}
        <div className="flex items-baseline gap-3">
          <span className={`font-bold text-gray-900 ${textSizes[size].value}`}>
            {data.current.toFixed(1)}x
          </span>
          <div className={`flex items-center gap-1 ${getChangeColor(data.changePercent)}`}>
            {changeIcon[data.trend]}
            <span className={`font-medium ${textSizes[size].change}`}>
              {formatPercentChange(data.changePercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline Chart */}
      {showChart && data.chartData.length > 1 && (
        <div className="relative">
          <svg 
            className="w-full" 
            height={size === 'small' ? 40 : size === 'medium' ? 60 : 80}
            viewBox={`0 0 ${size === 'small' ? 80 : size === 'medium' ? 120 : 160} ${size === 'small' ? 40 : size === 'medium' ? 60 : 80}`}
            preserveAspectRatio="none"
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id={`gradient-${data.industry}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop 
                  offset="0%" 
                  stopColor={
                    data.trend === 'up' ? '#DC2626' : 
                    data.trend === 'down' ? '#2563EB' : 
                    '#6B7280'
                  } 
                  stopOpacity="0.2" 
                />
                <stop 
                  offset="100%" 
                  stopColor={
                    data.trend === 'up' ? '#DC2626' : 
                    data.trend === 'down' ? '#2563EB' : 
                    '#6B7280'
                  } 
                  stopOpacity="0.05" 
                />
              </linearGradient>
            </defs>
            
            {/* Area fill */}
            <path
              d={areaPath}
              fill={`url(#gradient-${data.industry})`}
              className="transition-opacity duration-300"
              opacity={isHovered ? 0.3 : 0.2}
            />
            
            {/* Line */}
            <path
              d={chartPath}
              fill="none"
              stroke={
                data.trend === 'up' ? '#DC2626' : 
                data.trend === 'down' ? '#2563EB' : 
                '#6B7280'
              }
              strokeWidth={size === 'small' ? 1.5 : 2}
              className="transition-all duration-300"
              strokeOpacity={isHovered ? 1 : 0.8}
            />
            
            {/* Hover dot */}
            {isHovered && (
              <circle
                cx={size === 'small' ? 80 : size === 'medium' ? 120 : 160}
                cy={((size === 'small' ? 40 : size === 'medium' ? 60 : 80) - 
                     ((data.current - minValue) * ((size === 'small' ? 40 : size === 'medium' ? 60 : 80) / (maxValue - minValue))))}
                r="3"
                fill={
                  data.trend === 'up' ? '#DC2626' : 
                  data.trend === 'down' ? '#2563EB' : 
                  '#6B7280'
                }
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )}

      {/* Stats on hover */}
      <motion.div
        className={`
          absolute bottom-0 left-0 right-0 
          bg-white/95 backdrop-blur-sm
          border-t border-gray-100
          p-3 flex justify-between
          ${textSizes[size].stat} text-gray-600
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: 'none' }}
      >
        <span>고점 {data.stats.high30d.toFixed(1)}x</span>
        <span>저점 {data.stats.low30d.toFixed(1)}x</span>
        <span>평균 {data.stats.avg30d.toFixed(1)}x</span>
      </motion.div>
    </motion.div>
  )
}