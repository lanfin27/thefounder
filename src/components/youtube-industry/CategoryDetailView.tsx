'use client'

/**
 * Category Detail View - Toss Securities Style
 *
 * 토스증권 스타일의 카테고리 상세 뷰
 * - 개별 채널 선택 기능
 * - 완벽한 다크모드 지원
 * - 실제 데이터 표시
 */

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, TrendingUp, TrendingDown, Activity, Users, Eye } from 'lucide-react'
import { Y_CATEGORIES } from '@/types/youtube-industry'
import { formatNumber, formatChangeRate, formatViewsPerVideo } from '@/lib/youtube-industry/utils'
import MultiChannelTrendChart from './MultiChannelTrendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CategoryDetailViewProps {
  category: any
  channels: any[]
  chartData: Array<{
    channel: any
    history: Array<{ date: string; value: number; channel_id: string }>
  }>
}

// 색상 팔레트 (토스 스타일)
const CHANNEL_COLORS = [
  '#10b981', // 초록
  '#3b82f6', // 파랑
  '#f59e0b', // 주황
  '#8b5cf6', // 보라
  '#ef4444', // 빨강
]

export default function CategoryDetailView({ category, channels, chartData }: CategoryDetailViewProps) {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M'>('1M')
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([])
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null)

  const categoryInfo = Y_CATEGORIES[category.code]

  // 초기 선택: 상위 5개 채널
  useEffect(() => {
    if (chartData.length > 0 && selectedChannelIds.length === 0) {
      const topFive = chartData.slice(0, 5).map(item => item.channel.id)
      setSelectedChannelIds(topFive)
    }
  }, [chartData, selectedChannelIds.length])

  // 채널 선택 토글
  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds(prev => {
      if (prev.includes(channelId)) {
        // 최소 1개는 선택되어야 함
        if (prev.length === 1) {
          return prev
        }
        return prev.filter(id => id !== channelId)
      }
      // 최대 5개까지만 선택 가능
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, channelId]
    })
  }

  // 선택된 채널의 차트 데이터
  const selectedChartData = useMemo(() => {
    return chartData.filter(item => selectedChannelIds.includes(item.channel.id))
  }, [chartData, selectedChannelIds])

  // 기간별 데이터 필터링
  const filteredChartData = useMemo(() => {
    const days = timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : 90

    return selectedChartData.map(item => ({
      ...item,
      history: item.history.slice(-days)
    }))
  }, [selectedChartData, timeRange])

  // 카테고리 통계 계산
  const categoryStats = useMemo(() => {
    // views_per_video 필드를 확인하고 0이 아닌 값만 사용
    const validChannels = channels.filter(ch => {
      const viewsPerVideo = ch.views_per_video || ch.viewsPerVideo || 0
      return viewsPerVideo > 0
    })

    const totalViews = channels.reduce((sum, ch) => sum + (ch.total_views || 0), 0)
    const totalSubs = channels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0)
    const totalVideos = channels.reduce((sum, ch) => sum + (ch.video_count || 0), 0)

    const avgViewsPerVideo = validChannels.length > 0
      ? validChannels.reduce((sum, ch) => sum + (ch.views_per_video || ch.viewsPerVideo || 0), 0) / validChannels.length
      : 0

    const avgDailyChange = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.daily_change_rate || 0), 0) / channels.length
      : 0

    const avgEngagement = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.engagement_rate || 0), 0) / channels.length
      : 0

    return {
      totalViews,
      totalSubs,
      totalVideos,
      avgViewsPerVideo,
      avgDailyChange,
      avgEngagement,
      channelCount: channels.length
    }
  }, [channels])

  const isPositive = categoryStats.avgDailyChange >= 0
  const changeAmount = categoryStats.avgViewsPerVideo * (categoryStats.avgDailyChange / 100)

  // 채널의 색상 가져오기
  const getChannelColor = (channelId: string) => {
    const index = selectedChannelIds.indexOf(channelId)
    return index >= 0 ? CHANNEL_COLORS[index % CHANNEL_COLORS.length] : '#9ca3af'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/youtube-industry')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <span className="text-3xl">{categoryInfo?.emoji || '📊'}</span>
                {categoryInfo?.name || category.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span>{categoryStats.channelCount}개 채널</span>
                <span>•</span>
                <span>평균 {formatViewsPerVideo(categoryStats.avgViewsPerVideo)}/영상</span>
                <span>•</span>
                <span className={isPositive ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                  {isPositive ? '+' : ''}{categoryStats.avgDailyChange.toFixed(1)}% 오늘
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 주요 지표 카드 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {formatViewsPerVideo(categoryStats.avgViewsPerVideo)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">평균 영상당 조회수</span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1 text-lg font-semibold ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {formatChangeRate(categoryStats.avgDailyChange)}
              </span>
              <span className={`text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}
                {formatNumber(Math.abs(changeAmount))}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">오늘</span>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">총 채널 수</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(categoryStats.channelCount)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">총 구독자</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(categoryStats.totalSubs)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">총 조회수</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(categoryStats.totalViews)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">평균 참여율</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {categoryStats.avgEngagement.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>채널별 영상당 조회수 추세</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  최대 5개 채널까지 선택하여 비교할 수 있습니다
                </p>
              </div>
              <div className="flex gap-2">
                {(['1W', '1M', '3M'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      timeRange === range
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {range === '1W' ? '1주' : range === '1M' ? '1개월' : '3개월'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <MultiChannelTrendChart data={filteredChartData} />
            </div>

            {/* 채널 선택 그리드 - 토스증권 스타일 */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  채널 선택 ({selectedChannelIds.length}/5)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  클릭하여 차트에 추가/제거
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {chartData.slice(0, 10).map((item) => {
                  const isSelected = selectedChannelIds.includes(item.channel.id)
                  const color = getChannelColor(item.channel.id)
                  const viewsPerVideo = item.channel.views_per_video || item.channel.viewsPerVideo || 0
                  const dailyChange = item.channel.daily_change_rate || 0
                  const isHovered = hoveredChannelId === item.channel.id

                  return (
                    <button
                      key={item.channel.id}
                      onClick={() => toggleChannel(item.channel.id)}
                      onMouseEnter={() => setHoveredChannelId(item.channel.id)}
                      onMouseLeave={() => setHoveredChannelId(null)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                      } ${isHovered ? 'transform scale-105' : ''}`}
                      disabled={!isSelected && selectedChannelIds.length >= 5}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-4 h-4 rounded-full transition-all"
                          style={{
                            backgroundColor: isSelected ? color : '#d1d5db',
                            opacity: isSelected ? 1 : 0.3
                          }}
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white truncate mb-1">
                          {item.channel.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {formatViewsPerVideo(viewsPerVideo)}/영상
                        </div>
                        <div className={`text-xs font-semibold ${
                          dailyChange > 0
                            ? 'text-green-600 dark:text-green-400'
                            : dailyChange < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {dailyChange > 0 ? '+' : ''}{dailyChange.toFixed(1)}%
                        </div>
                      </div>

                      {!isSelected && selectedChannelIds.length >= 5 && (
                        <div className="absolute inset-0 bg-gray-900/10 dark:bg-gray-900/30 rounded-xl flex items-center justify-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">최대 5개</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 채널 순위 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>전체 채널 순위</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 {channels.length}개 채널
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">순위</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">채널명</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">구독자</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">영상당 조회수</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">일간 변화</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">참여율</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel, idx) => {
                    const viewsPerVideo = channel.views_per_video || channel.viewsPerVideo || 0
                    const dailyChange = channel.daily_change_rate || 0
                    const engagement = channel.engagement_rate || 0

                    return (
                      <tr
                        key={channel.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="p-3 text-sm font-medium text-gray-600 dark:text-gray-400">{idx + 1}</td>
                        <td className="p-3">
                          <button
                            onClick={() => window.open(`https://youtube.com/channel/${channel.channel_id}`, '_blank')}
                            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
                          >
                            {channel.name}
                          </button>
                        </td>
                        <td className="text-right p-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatNumber(channel.subscribers)}
                        </td>
                        <td className="text-right p-3 text-sm font-bold text-gray-900 dark:text-white">
                          {viewsPerVideo > 0 ? formatViewsPerVideo(viewsPerVideo) : '-'}
                        </td>
                        <td className="text-right p-3 text-sm font-semibold">
                          <span className={
                            dailyChange > 0
                              ? 'text-green-600 dark:text-green-400'
                              : dailyChange < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }>
                            {dailyChange > 0 ? '+' : ''}{dailyChange.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right p-3 text-sm font-medium text-gray-900 dark:text-white">
                          {engagement > 0 ? `${engagement.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {channels.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  채널 데이터가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
