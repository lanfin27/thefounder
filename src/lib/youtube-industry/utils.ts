/**
 * YouTube Industry Index - Utility Functions
 *
 * 유튜브 산업지수 대시보드를 위한 유틸리티 함수들
 */

import {
  Channel,
  IndustryMetrics,
  YCategoryCode,
  ChangeLevel,
  CHANGE_COLORS,
  MarketMapNode,
  TimeSeriesDataPoint
} from '@/types/youtube-industry'

// ==================== 계산 함수 ====================

/**
 * 영상당 조회수 계산
 */
export function calculateViewsPerVideo(totalViews: number, videoCount: number): number {
  if (videoCount === 0) return 0
  return Math.round(totalViews / videoCount)
}

/**
 * 변화율 계산 (%)
 */
export function calculateChangeRate(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Shorts 비율 계산 (%)
 */
export function calculateShortsRatio(shortsCount: number, totalVideos: number): number {
  if (totalVideos === 0) return 0
  return (shortsCount / totalVideos) * 100
}

/**
 * 참여도 계산 (%)
 */
export function calculateEngagementRate(
  likes: number,
  comments: number,
  views: number
): number {
  if (views === 0) return 0
  return ((likes + comments) / views) * 100
}

/**
 * 변동성 계산 (표준편차 기반)
 */
export function calculateVolatility(data: number[]): number {
  if (data.length === 0) return 0

  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  const stdDev = Math.sqrt(variance)

  return (stdDev / mean) * 100 // 변동계수 (CV)
}

// ==================== 색상 및 레벨 ====================

/**
 * 변화율에 따른 색상 레벨 및 색상 반환
 */
export function getChangeColor(changeRate: number): { level: ChangeLevel; color: string } {
  if (changeRate >= 10) {
    return { level: 'strong-up', color: CHANGE_COLORS['strong-up'] }
  } else if (changeRate >= 5) {
    return { level: 'up', color: CHANGE_COLORS['up'] }
  } else if (changeRate <= -10) {
    return { level: 'strong-down', color: CHANGE_COLORS['strong-down'] }
  } else if (changeRate <= -5) {
    return { level: 'down', color: CHANGE_COLORS['down'] }
  } else {
    return { level: 'neutral', color: CHANGE_COLORS['neutral'] }
  }
}

/**
 * 변동성 레벨 판단
 */
export function getVolatilityLevel(volatility: number): 'high' | 'medium' | 'low' {
  if (volatility >= 20) return 'high'
  if (volatility >= 10) return 'medium'
  return 'low'
}

/**
 * Gradient 색상 생성 (차트용)
 */
export function getChartGradient(changeRate: number): string {
  if (changeRate > 0) {
    return 'from-green-500/20 to-green-500/5'
  } else if (changeRate < 0) {
    return 'from-red-500/20 to-red-500/5'
  }
  return 'from-gray-500/20 to-gray-500/5'
}

// ==================== 포맷팅 ====================

/**
 * 숫자 포맷팅 (K, M, B 단위)
 */
export function formatNumber(num: number, decimals: number = 1): string {
  // undefined나 null 체크 추가
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }

  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + 'B'
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K'
  }
  return Math.round(num).toString()
}

/**
 * 변화율 포맷팅 (+/- 부호 포함)
 */
export function formatChangeRate(change: number | undefined | null, decimals: number = 1): string {
  // undefined나 null 체크 추가
  if (change === undefined || change === null || isNaN(change)) {
    return '0.0%';
  }

  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(decimals)}%`
}

/**
 * 영상당 조회수 포맷팅
 */
export function formatViewsPerVideo(views: number | undefined | null): string {
  if (views === undefined || views === null || isNaN(views)) {
    return '0';
  }
  return formatNumber(views);
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = typeof date === 'string' ? new Date(date) : date

  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'numeric',
        day: 'numeric'
      }).format(d)
    case 'long':
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d)
    case 'medium':
    default:
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(d)
  }
}

/**
 * 상대 시간 포맷팅 (예: "2시간 전")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
  return `${Math.floor(diffDays / 365)}년 전`
}

// ==================== 데이터 집계 ====================

/**
 * 채널 목록에서 산업 지표 집계
 */
export function aggregateIndustryMetrics(
  channels: Channel[],
  categoryCode: YCategoryCode,
  historicalData?: TimeSeriesDataPoint[]
): IndustryMetrics {
  if (channels.length === 0) {
    return {
      categoryCode,
      averageViewsPerVideo: 0,
      averageSubscribers: 0,
      averageEngagementRate: 0,
      averageShortsRatio: 0,
      totalChannels: 0,
      totalVideos: 0,
      totalViews: 0,
      dailyChange: 0,
      weeklyChange: 0,
      monthlyChange: 0,
      marketShare: 0,
      volatility: 0,
      volatilityLevel: 'low',
      topChannelsByViews: [],
      topChannelsByGrowth: [],
      historicalData: historicalData || [],
      lastUpdated: new Date()
    }
  }

  // 유효한 채널만 필터링
  const validChannels = channels.filter(c => c && c.viewsPerVideo !== undefined)

  // 평균 계산 (안전한 계산)
  const averageViewsPerVideo = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.viewsPerVideo || 0), 0) / validChannels.length
    : 0
  const averageSubscribers = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.subscribers || 0), 0) / validChannels.length
    : 0
  const averageEngagementRate = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.engagementRate || 0), 0) / validChannels.length
    : 0
  const averageShortsRatio = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.shortsRatio || 0), 0) / validChannels.length
    : 0

  // 총계
  const totalChannels = validChannels.length
  const totalVideos = validChannels.reduce((sum, c) => sum + (c.videoCount || 0), 0)
  const totalViews = validChannels.reduce((sum, c) => sum + (c.totalViews || 0), 0)

  // 변화율 평균
  const dailyChange = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.dailyChangeRate || 0), 0) / validChannels.length
    : 0
  const weeklyChange = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.weeklyChangeRate || 0), 0) / validChannels.length
    : 0
  const monthlyChange = validChannels.length > 0
    ? validChannels.reduce((sum, c) => sum + (c.monthlyChangeRate || 0), 0) / validChannels.length
    : 0

  // 변동성 계산 (안전한 계산)
  const viewsPerVideoValues = validChannels
    .map((c) => c.viewsPerVideo || 0)
    .filter(v => v > 0 && !isNaN(v))
  const volatility = viewsPerVideoValues.length > 0
    ? calculateVolatility(viewsPerVideoValues)
    : 0
  const volatilityLevel = getVolatilityLevel(volatility)

  // Top 채널 (조회수 기준)
  const topChannelsByViews = validChannels
    .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
    .slice(0, 10)
    .map((c) => c.channelId)

  // Top 채널 (성장률 기준)
  const topChannelsByGrowth = validChannels
    .sort((a, b) => (b.weeklyChangeRate || 0) - (a.weeklyChangeRate || 0))
    .slice(0, 10)
    .map((c) => c.channelId)

  return {
    categoryCode,
    averageViewsPerVideo: Math.round(averageViewsPerVideo || 0),
    averageSubscribers: Math.round(averageSubscribers || 0),
    averageEngagementRate: Number((averageEngagementRate || 0).toFixed(2)),
    averageShortsRatio: Number((averageShortsRatio || 0).toFixed(2)),
    totalChannels,
    totalVideos,
    totalViews,
    dailyChange: Number((dailyChange || 0).toFixed(2)),
    weeklyChange: Number((weeklyChange || 0).toFixed(2)),
    monthlyChange: Number((monthlyChange || 0).toFixed(2)),
    marketShare: 0, // 전체 대비 계산 필요
    volatility: Number((volatility || 0).toFixed(2)),
    volatilityLevel,
    topChannelsByViews,
    topChannelsByGrowth,
    historicalData: historicalData || [],
    lastUpdated: new Date()
  }
}

/**
 * 시장 점유율 계산
 */
export function calculateMarketShare(
  categoryMetrics: IndustryMetrics,
  allMetrics: IndustryMetrics[]
): number {
  const totalMarketViews = allMetrics.reduce((sum, m) => sum + m.totalViews, 0)
  if (totalMarketViews === 0) return 0
  return (categoryMetrics.totalViews / totalMarketViews) * 100
}

// ==================== Treemap 데이터 생성 ====================

/**
 * Finviz 스타일 Treemap 데이터 생성
 */
export function generateMarketMapData(metrics: IndustryMetrics[]): MarketMapNode[] {
  return metrics.map((metric) => {
    const { level, color } = getChangeColor(metric.dailyChange)

    return {
      id: metric.categoryCode,
      name: metric.categoryCode,
      categoryCode: metric.categoryCode,
      value: metric.averageViewsPerVideo,
      change: metric.dailyChange,
      color
    }
  })
}

/**
 * 카테고리 내 Top 채널 Treemap 데이터 생성
 */
export function generateCategoryTreemapData(
  channels: Channel[],
  categoryCode: YCategoryCode
): MarketMapNode[] {
  return channels.map((channel) => {
    const { level, color } = getChangeColor(channel.dailyChangeRate)

    return {
      id: channel.channelId,
      name: channel.name,
      categoryCode: categoryCode,
      value: channel.viewsPerVideo,
      change: channel.dailyChangeRate,
      color,
      parent: categoryCode
    }
  })
}

// ==================== 필터링 및 정렬 ====================

/**
 * 채널 필터링
 */
export function filterChannels(
  channels: Channel[],
  filters: {
    categories?: YCategoryCode[]
    minSubscribers?: number
    maxSubscribers?: number
    minViewsPerVideo?: number
    changeType?: 'up' | 'down' | 'all'
    shortsOnly?: boolean
  }
): Channel[] {
  return channels.filter((channel) => {
    // 카테고리 필터
    if (filters.categories && !filters.categories.includes(channel.category)) {
      return false
    }

    // 구독자 수 필터
    if (filters.minSubscribers && channel.subscribers < filters.minSubscribers) {
      return false
    }
    if (filters.maxSubscribers && channel.subscribers > filters.maxSubscribers) {
      return false
    }

    // 영상당 조회수 필터
    if (filters.minViewsPerVideo && channel.viewsPerVideo < filters.minViewsPerVideo) {
      return false
    }

    // 변화 타입 필터
    if (filters.changeType === 'up' && channel.dailyChangeRate <= 0) {
      return false
    }
    if (filters.changeType === 'down' && channel.dailyChangeRate >= 0) {
      return false
    }

    // Shorts 전용 필터
    if (filters.shortsOnly && channel.shortsRatio < 50) {
      return false
    }

    return true
  })
}

/**
 * 채널 정렬
 */
export function sortChannels(
  channels: Channel[],
  sortBy: 'viewsPerVideo' | 'dailyChange' | 'weeklyChange' | 'subscribers' | 'engagementRate' | 'categoryRank',
  order: 'asc' | 'desc' = 'desc'
): Channel[] {
  const sorted = [...channels].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortBy) {
      case 'viewsPerVideo':
        aValue = a.viewsPerVideo
        bValue = b.viewsPerVideo
        break
      case 'dailyChange':
        aValue = a.dailyChangeRate
        bValue = b.dailyChangeRate
        break
      case 'weeklyChange':
        aValue = a.weeklyChangeRate
        bValue = b.weeklyChangeRate
        break
      case 'subscribers':
        aValue = a.subscribers
        bValue = b.subscribers
        break
      case 'engagementRate':
        aValue = a.engagementRate
        bValue = b.engagementRate
        break
      case 'categoryRank':
        aValue = a.categoryRank
        bValue = b.categoryRank
        break
      default:
        return 0
    }

    return order === 'desc' ? bValue - aValue : aValue - bValue
  })

  return sorted
}

// ==================== Mock 데이터 생성 (테스트용) ====================

/**
 * Mock 시계열 데이터 생성
 */
export function generateMockTimeSeriesData(
  days: number,
  baseValue: number,
  volatility: number = 0.05
): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = []
  const now = new Date()
  let previousValue = baseValue

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // 랜덤 워크 + 트렌드
    const randomChange = (Math.random() - 0.5) * volatility * baseValue
    const trendComponent = Math.sin(i * 0.1) * 0.02 * baseValue
    const value = previousValue + randomChange + trendComponent

    const change = calculateChangeRate(value, previousValue)

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
      change: Number(change.toFixed(2)),
      volume: Math.floor(Math.random() * 100) + 50,
      high: Math.round(value * 1.05),
      low: Math.round(value * 0.95)
    })

    previousValue = value
  }

  return data
}

// ==================== 통계 함수 ====================

/**
 * 기본 통계 계산
 */
export function calculateStatistics(data: number[]): {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
} {
  if (data.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 }
  }

  const sorted = [...data].sort((a, b) => a - b)
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const median = sorted[Math.floor(sorted.length / 2)]
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  const stdDev = Math.sqrt(variance)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    min,
    max
  }
}

/**
 * 채널 지표 계산 (안전한 계산)
 */
export function calculateChannelMetrics(channels: Channel[]): {
  totalViews: number
  totalChannels: number
  averageChange: number
} {
  const validChannels = channels.filter(c => c && c.totalViews !== undefined)

  const totalViews = validChannels.reduce((sum, channel) => sum + (channel.totalViews || 0), 0)
  const totalChannels = validChannels.length
  const averageChange = totalChannels > 0
    ? validChannels.reduce((sum, channel) => sum + (channel.dailyChangeRate || 0), 0) / totalChannels
    : 0

  return {
    totalViews,
    totalChannels,
    averageChange
  }
}
