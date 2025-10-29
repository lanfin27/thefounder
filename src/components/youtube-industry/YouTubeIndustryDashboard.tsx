'use client'

/**
 * YouTube Industry Dashboard - Main Component
 *
 * Finviz 스타일 마켓맵 + 토스증권 스타일 차트 통합 대시보드
 * 서버에서 전달받은 데이터 사용
 */

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { YCategoryCode } from '@/types/youtube-industry'
import IndustryRankTable from './IndustryRankTable'
import TrendingChannels from './TrendingChannels'
import MarketOverview from './MarketOverview'
import { IndustryChartsGrid } from './IndustryChartsGrid'
import { TreemapCategoryData } from '@/lib/youtube-industry/treemap-data-generator'

// ✅ CRITICAL: MarketMapView를 동적 로딩 (SSR 비활성화)
const MarketMapView = dynamic(() => import('./MarketMapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">산업지도맵 로딩 중...</p>
      </div>
    </div>
  ),
})

interface YouTubeIndustryDashboardProps {
  initialCategories: any[]
  initialChannels: any[]
  initialTreemapData: TreemapCategoryData[]
  timestamp?: number
}

export default function YouTubeIndustryDashboard({
  initialCategories = [],  // 🔥 기본값 설정
  initialChannels = [],     // 🔥 기본값 설정
  initialTreemapData = [],  // 🔥 NEW: Treemap 데이터
  timestamp
}: YouTubeIndustryDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<YCategoryCode | null>(null)
  const [lastUpdated] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)

  // 🔥 배열 보장 및 로깅
  const categories = Array.isArray(initialCategories) ? initialCategories : []
  const channels = Array.isArray(initialChannels) ? initialChannels : []
  const treemapData = Array.isArray(initialTreemapData) ? initialTreemapData : []

  console.log('🎨 [YouTubeIndustryDashboard] Rendering with:', {
    categoriesCount: categories.length,
    channelsCount: channels.length,
    treemapDataCount: treemapData.length,
    timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
  })

  // 여행 카테고리 검증
  const travel = treemapData.find(item => item.code === 'Y05')
  if (travel) {
    console.log('✅ [Dashboard] Y05 여행 treemap data:', {
      channels: travel.channels,
      topChannels: travel.topChannels?.map(ch => ch.name),
    })
  }

  // 클라이언트에서만 시간 표시 (Hydration 에러 방지)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 🔥 빈 데이터 체크
  if (categories.length === 0 || channels.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            데이터가 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            카테고리: {categories.length}개 / 채널: {channels.length}개
          </p>
        </div>
      </div>
    )
  }

  // ❌ useMemo 제거 - 직접 계산
  const totalSubscribers = channels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0)
  const totalViews = channels.reduce((sum, ch) => sum + (ch.total_views || 0), 0)
  const avgEngagement = channels.length > 0
    ? channels.reduce((sum, ch) => sum + (ch.engagement_rate || 0), 0) / channels.length
    : 0

  const metrics = {
    totalSubscribers,
    totalViews,
    avgEngagement,
    totalChannels: channels.length
  }

  // ❌ categoriesWithStats useMemo 제거 - 단순 계산
  const categoriesWithStats = categories.map((category) => {
    const categoryChannels = channels.filter(ch => ch.category_code === category.code)

    const catTotalViews = categoryChannels.reduce((sum, ch) => sum + (ch.total_views || 0), 0)
    const totalVideos = categoryChannels.reduce((sum, ch) => sum + (ch.video_count || 0), 0)

    const avgViewsPerVideo = category.avg_views_per_video ||
      (totalVideos > 0 ? catTotalViews / totalVideos : 0)

    return {
      code: category.code,
      name: category.name,
      emoji: category.emoji || category.icon || '📊',
      color: '#3b82f6',
      description: category.description || '',
      topChannels: categoryChannels
        .sort((a, b) => (b.views_per_video || 0) - (a.views_per_video || 0))
        .slice(0, 10),
      metrics: {
        totalChannels: categoryChannels.length,
        totalViews: catTotalViews,
        totalVideos: totalVideos,
        averageViewsPerVideo: avgViewsPerVideo,
        dailyChange: category.daily_change_rate || 0,
        weeklyChange: category.weekly_change_rate || 0,
        monthlyChange: category.monthly_change_rate || 0,
        marketShare: totalViews > 0 ? (catTotalViews / totalViews) * 100 : 0,
        volatility: 0
      },
      lastUpdated: new Date(category.updated_at || Date.now())
    }
  })

  // 트렌딩 채널 계산
  const trendingChannels = useMemo(() => {
    // 일간 변화율 기준으로 정렬
    const sortedByChange = [...channels]
      .filter(ch => ch.daily_change_rate !== null && ch.daily_change_rate !== undefined)
      .sort((a, b) => Math.abs(b.daily_change_rate || 0) - Math.abs(a.daily_change_rate || 0))

    const rising = sortedByChange.filter(ch => (ch.daily_change_rate || 0) > 0).slice(0, 5)
    const falling = sortedByChange.filter(ch => (ch.daily_change_rate || 0) < 0).slice(0, 5)

    return { rising, falling }
  }, [channels])

  // 실시간 메트릭 데이터
  const realtimeMetrics = useMemo(() => ({
    success: true,
    data: {
      marketOverview: {
        totalChannels: metrics.totalChannels,
        totalSubscribers: metrics.totalSubscribers,
        totalViews: metrics.totalViews,
        avgEngagementRate: metrics.avgEngagement,
        dailyGrowth: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0
      },
      trending: trendingChannels
    }
  }), [metrics, trendingChannels])

  const handleRefresh = () => {
    // 페이지 새로고침
    window.location.reload()
  }

  return (
    <div className="space-y-8">
      {/* Market Overview */}
      {realtimeMetrics && (
        <MarketOverview
          data={realtimeMetrics.data.marketOverview}
          lastUpdated={lastUpdated}
          isRefreshing={false}
          onRefresh={handleRefresh}
        />
      )}

      {/* Market Map - Finviz Style */}
      {/* ✅ Props 직접 전달 - useMemo 없음 */}
      <MarketMapView
        data={treemapData}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        timestamp={timestamp}
      />

      {/* Industry Charts Grid - Mini Trend Charts */}
      <IndustryChartsGrid
        categories={categoriesWithStats.map(cat => ({
          code: cat.code,
          name: cat.name,
          emoji: cat.emoji
        }))}
      />

      {/* Trending Channels - 급등/급락 */}
      {realtimeMetrics && (
        <TrendingChannels trending={realtimeMetrics.data.trending} />
      )}

      {/* Industry Rank Table */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          산업 순위
        </h2>
        <IndustryRankTable
          categories={categoriesWithStats}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Last Updated Info */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
        마지막 업데이트:{' '}
        {mounted ? (
          lastUpdated.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        ) : (
          <span className="inline-block w-40">...</span>
        )}
      </div>
    </div>
  )
}

