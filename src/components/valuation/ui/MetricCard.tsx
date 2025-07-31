'use client'

import { formatCurrency, formatKoreanWon, formatMultiple, getValueGrade, getGradeColor } from '@/lib/valuation/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number
  type: 'currency' | 'multiple' | 'percentage' | 'grade'
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
  size?: 'sm' | 'md' | 'lg'
  currency?: 'USD' | 'KRW'
}

export function MetricCard({ 
  title, 
  value, 
  type, 
  subtitle, 
  trend, 
  className = '',
  size = 'md',
  currency = 'USD'
}: MetricCardProps) {
  const formatValue = () => {
    switch (type) {
      case 'currency': 
        return currency === 'KRW' ? formatKoreanWon(value) : formatCurrency(value, currency)
      case 'multiple': 
        return formatMultiple(value)
      case 'percentage': 
        return `${value.toFixed(1)}%`
      case 'grade': {
        const grade = getValueGrade(value)
        return grade
      }
      default: 
        return value.toString()
    }
  }

  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend) {
      case 'up': 
        return <TrendingUp className="w-4 h-4 text-medium-green" />
      case 'down': 
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'neutral': 
        return <Minus className="w-4 h-4 text-medium-black-tertiary" />
    }
  }

  const sizeClasses = {
    sm: 'text-heading-5',
    md: 'text-heading-3',
    lg: 'text-heading-2'
  }

  const gradeColor = type === 'grade' ? getGradeColor(getValueGrade(value)) : ''

  return (
    <div className={`bg-white border border-medium-gray-border rounded-lg p-6 transition-all duration-200 hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-body-small font-medium text-medium-black-secondary">
          {title}
        </h3>
        {getTrendIcon()}
      </div>
      
      <div className={`${sizeClasses[size]} font-serif text-medium-black font-bold mb-1 ${type === 'grade' ? gradeColor : ''}`}>
        {formatValue()}
      </div>
      
      {subtitle && (
        <p className="text-caption text-medium-black-tertiary leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}