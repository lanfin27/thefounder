'use client'

/**
 * Market Overview Component
 *
 * 전체 시장 개요 표시
 */

import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Users, Eye } from 'lucide-react'
import { formatNumber, formatChangeRate, getChangeColor } from '@/lib/youtube-industry/utils'

interface MarketOverviewProps {
  data: {
    totalChannels: number
    totalSubscribers: number
    totalViews: number
    avgEngagementRate: number
    dailyGrowth: number
    weeklyGrowth: number
    monthlyGrowth: number
  }
  lastUpdated: Date
  isRefreshing: boolean
  onRefresh: () => void
}

export default function MarketOverview({
  data,
  lastUpdated,
  isRefreshing,
  onRefresh
}: MarketOverviewProps) {
  const [currentTime, setCurrentTime] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 클라이언트에서만 시간 업데이트
    const updateTime = () => {
      setCurrentTime(lastUpdated.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      }))
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // 1분마다 업데이트

    return () => clearInterval(interval)
  }, [lastUpdated])

  const stats = [
    {
      label: '총 채널',
      value: formatNumber(data.totalChannels),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      label: '총 구독자',
      value: formatNumber(data.totalSubscribers),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      label: '총 조회수',
      value: formatNumber(data.totalViews),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      label: '평균 참여율',
      value: `${(data.avgEngagementRate || 0).toFixed(2)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">시장 개요</h2>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="새로고침"
        >
          <RefreshCw
            className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50"
          >
            <div className={`${stat.bgColor} rounded-lg p-3`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {mounted && currentTime && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            마지막 업데이트: {currentTime}
          </p>
        )}
      </div>
    </div>
  )
}
