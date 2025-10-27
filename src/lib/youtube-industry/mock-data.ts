/**
 * YouTube Industry Index - Mock Data Generator
 *
 * 개발 및 테스트를 위한 Mock 데이터 생성
 */

import {
  Channel,
  YCategory,
  YCategoryCode,
  IndustryMetrics,
  Y_CATEGORIES,
  TimeSeriesDataPoint
} from '@/types/youtube-industry'
import {
  calculateViewsPerVideo,
  calculateChangeRate,
  calculateShortsRatio,
  calculateEngagementRate,
  aggregateIndustryMetrics,
  generateMockTimeSeriesData,
  calculateMarketShare
} from './utils'

// ==================== Mock 채널 이름 생성 ====================

const CHANNEL_NAME_TEMPLATES = {
  Y01: ['패션', '스타일', '룩북', '코디', 'Fashion'],
  Y02: ['뷰티', '메이크업', '스킨케어', '화장품', 'Beauty'],
  Y03: ['먹방', '요리', '레시피', '쿡', 'Cook'],
  Y04: ['게임', 'Game', 'Gaming', 'Play', 'Pro'],
  Y05: ['스포츠', '운동', '피트니스', 'Fitness', 'Sports'],
  Y06: ['음악', 'Music', '노래', 'Song', 'Cover'],
  Y07: ['브이로그', 'Vlog', '일상', 'Daily', 'Life'],
  Y08: ['교육', '강의', 'Edu', 'Learn', 'Academy'],
  Y09: ['테크', 'Tech', '리뷰', 'Review', 'Gadget'],
  Y10: ['예능', '코미디', 'Comedy', 'Fun', 'Show'],
  Y11: ['키즈', 'Kids', '어린이', 'Children', 'Family'],
  Y12: ['여행', 'Travel', '관광', 'Trip', 'Journey'],
  Y13: ['펫', 'Pet', '반려동물', 'Dog', 'Cat'],
  Y14: ['비즈니스', 'Business', '창업', 'Startup', 'CEO'],
  Y15: ['라이프', 'Life', '힐링', 'Healing', 'Chill']
}

/**
 * 카테고리별 랜덤 채널 이름 생성
 */
function generateChannelName(category: YCategoryCode, index: number): string {
  const templates = CHANNEL_NAME_TEMPLATES[category]
  const template = templates[Math.floor(Math.random() * templates.length)]
  const suffix = ['TV', 'Channel', '채널', '', ''][Math.floor(Math.random() * 5)]

  return `${template}${suffix ? ' ' + suffix : ''} ${index + 1}`
}

// ==================== Mock 채널 생성 ====================

/**
 * 단일 Mock 채널 생성
 */
export function generateMockChannel(
  category: YCategoryCode,
  index: number,
  categoryRank: number
): Channel {
  const channelId = `UC${Math.random().toString(36).substring(2, 15)}`
  const name = generateChannelName(category, index)

  // 구독자 수 (100K ~ 10M)
  const subscribers = Math.floor(Math.random() * 9_900_000) + 100_000

  // 영상 수 (50 ~ 5000)
  const videoCount = Math.floor(Math.random() * 4950) + 50

  // 총 조회수 (구독자 수의 10배 ~ 100배)
  const viewsMultiplier = Math.random() * 90 + 10
  const totalViews = Math.floor(subscribers * viewsMultiplier)

  // 영상당 조회수 계산
  const viewsPerVideo = calculateViewsPerVideo(totalViews, videoCount)

  // 변화율 (-20% ~ +20%)
  const dailyChangeRate = (Math.random() - 0.5) * 40
  const weeklyChangeRate = (Math.random() - 0.5) * 40
  const monthlyChangeRate = (Math.random() - 0.5) * 40

  // Shorts 비율
  const shortsCount = Math.floor(videoCount * Math.random() * 0.6) // 0~60%
  const regularCount = videoCount - shortsCount
  const shortsRatio = calculateShortsRatio(shortsCount, videoCount)

  // 참여도
  const likesPerVideo = Math.floor(viewsPerVideo * (Math.random() * 0.05 + 0.01)) // 1~6%
  const commentsPerVideo = Math.floor(likesPerVideo * (Math.random() * 0.3 + 0.1)) // 10~40% of likes
  const engagementRate = calculateEngagementRate(
    likesPerVideo * videoCount,
    commentsPerVideo * videoCount,
    totalViews
  )

  // 업로드 빈도 (주당 1~14회)
  const uploadsPerWeek = Math.floor(Math.random() * 13) + 1

  // 마지막 업로드 (1~30일 전)
  const lastUploadDate = new Date()
  lastUploadDate.setDate(lastUploadDate.getDate() - Math.floor(Math.random() * 30))

  return {
    id: channelId,
    channelId,
    name,
    handle: `@${name.replace(/\s+/g, '').toLowerCase()}`,
    category,
    subscribers: subscribers || 0,
    totalViews: totalViews || 0,
    videoCount: videoCount || 0,
    viewsPerVideo: viewsPerVideo || 0,
    dailyChangeRate: Number((dailyChangeRate || 0).toFixed(2)),
    weeklyChangeRate: Number((weeklyChangeRate || 0).toFixed(2)),
    monthlyChangeRate: Number((monthlyChangeRate || 0).toFixed(2)),
    engagementRate: Number((engagementRate || 0).toFixed(2)),
    likesPerVideo: likesPerVideo || 0,
    commentsPerVideo: commentsPerVideo || 0,
    shortsCount: shortsCount || 0,
    regularCount: regularCount || 0,
    shortsRatio: Number((shortsRatio || 0).toFixed(2)),
    uploadsPerWeek: Number((uploadsPerWeek || 0).toFixed(1)),
    lastUploadDate: lastUploadDate || null,
    thumbnailUrl: `https://i.pravatar.cc/150?img=${index}`,
    description: `${Y_CATEGORIES[category].name} 카테고리의 인기 채널`,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // 1년 이내
    lastUpdated: new Date(),
    categoryRank: categoryRank || 0,
    overallRank: 0 // 나중에 계산
  }
}

/**
 * 카테고리별 Top 50 채널 생성
 */
export function generateMockChannelsForCategory(
  category: YCategoryCode,
  count: number = 50
): Channel[] {
  const channels: Channel[] = []

  for (let i = 0; i < count; i++) {
    channels.push(generateMockChannel(category, i, i + 1))
  }

  // 영상당 조회수 기준으로 정렬하여 순위 재조정
  channels.sort((a, b) => b.viewsPerVideo - a.viewsPerVideo)
  channels.forEach((channel, index) => {
    channel.categoryRank = index + 1
  })

  return channels
}

// ==================== Mock 카테고리 생성 ====================

/**
 * 단일 카테고리 Mock 데이터 생성
 */
export function generateMockCategory(
  categoryCode: YCategoryCode,
  channelCount: number = 50
): YCategory {
  const baseInfo = Y_CATEGORIES[categoryCode]
  const topChannels = generateMockChannelsForCategory(categoryCode, channelCount)

  // 시계열 데이터 생성 (30일)
  const baseValue = topChannels.reduce((sum, c) => sum + c.viewsPerVideo, 0) / topChannels.length
  const historicalData = generateMockTimeSeriesData(30, baseValue, 0.05)

  const metrics = aggregateIndustryMetrics(topChannels, categoryCode, historicalData)

  return {
    ...baseInfo,
    topChannels,
    metrics,
    lastUpdated: new Date()
  }
}

/**
 * 모든 카테고리 Mock 데이터 생성
 */
export function generateAllMockCategories(channelsPerCategory: number = 50): YCategory[] {
  const categories: YCategory[] = []
  const allCategoryCodes = Object.keys(Y_CATEGORIES) as YCategoryCode[]

  for (const code of allCategoryCodes) {
    categories.push(generateMockCategory(code, channelsPerCategory))
  }

  // 시장 점유율 계산
  const allMetrics = categories.map((c) => c.metrics)
  categories.forEach((category) => {
    category.metrics.marketShare = calculateMarketShare(category.metrics, allMetrics)
  })

  return categories
}

// ==================== Mock API 응답 생성 ====================

/**
 * 카테고리 목록 API 응답 생성
 */
export function generateMockCategoriesResponse() {
  const categories = generateAllMockCategories(50)

  return {
    success: true,
    data: categories,
    totalCategories: categories.length,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * 특정 카테고리 상세 API 응답 생성
 */
export function generateMockCategoryDetailResponse(categoryCode: YCategoryCode) {
  const category = generateMockCategory(categoryCode, 50)

  return {
    success: true,
    data: {
      category,
      topChannels: category.topChannels,
      metrics: category.metrics
    },
    lastUpdated: new Date().toISOString()
  }
}

/**
 * 실시간 지표 API 응답 생성
 */
export function generateMockRealtimeMetricsResponse() {
  const categories = generateAllMockCategories(50)
  const allChannels = categories.flatMap((c) => c.topChannels)

  // Top gainers/losers
  const sortedByChange = [...allChannels].sort((a, b) => b.dailyChangeRate - a.dailyChangeRate)
  const topGainers = sortedByChange.slice(0, 10)
  const topLosers = sortedByChange.slice(-10).reverse()

  // Most active (업로드 빈도 기준)
  const mostActive = [...allChannels]
    .sort((a, b) => b.uploadsPerWeek - a.uploadsPerWeek)
    .slice(0, 10)

  // 카테고리별 지표
  const categoriesMetrics: Record<YCategoryCode, IndustryMetrics> = {} as any
  categories.forEach((cat) => {
    categoriesMetrics[cat.code] = cat.metrics
  })

  // 전체 시장 개요
  const totalViews = categories.reduce((sum, c) => sum + c.metrics.totalViews, 0)
  const totalChannels = categories.reduce((sum, c) => sum + c.metrics.totalChannels, 0)
  const avgChange =
    categories.reduce((sum, c) => sum + c.metrics.dailyChange, 0) / categories.length

  return {
    success: true,
    data: {
      categories: categoriesMetrics,
      trending: {
        topGainers,
        topLosers,
        mostActive
      },
      marketOverview: {
        totalViews,
        totalChannels,
        avgChange: Number(avgChange.toFixed(2))
      }
    },
    timestamp: new Date().toISOString()
  }
}

/**
 * 트렌드 데이터 API 응답 생성
 */
export function generateMockTrendsResponse(
  categoryCode: YCategoryCode,
  days: number = 30
) {
  const category = generateMockCategory(categoryCode, 50)
  const baseValue = category.metrics.averageViewsPerVideo
  const timeSeries = generateMockTimeSeriesData(days, baseValue, 0.05)

  // 통계 계산
  const values = timeSeries.map((d) => d.value)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return {
    success: true,
    data: {
      categoryCode,
      timeSeries,
      period: days <= 7 ? 'weekly' : days <= 30 ? 'monthly' : '3months',
      statistics: {
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        min,
        max
      }
    },
    lastUpdated: new Date().toISOString()
  }
}

// ==================== 채널 검색/필터 ====================

/**
 * 채널 목록 API 응답 생성 (페이지네이션)
 */
export function generateMockChannelsResponse(
  page: number = 1,
  pageSize: number = 20,
  categoryCode?: YCategoryCode
) {
  let allChannels: Channel[] = []

  if (categoryCode) {
    allChannels = generateMockChannelsForCategory(categoryCode, 50)
  } else {
    const categories = generateAllMockCategories(50)
    allChannels = categories.flatMap((c) => c.topChannels)
  }

  // 전체 순위 계산
  allChannels.sort((a, b) => b.viewsPerVideo - a.viewsPerVideo)
  allChannels.forEach((channel, index) => {
    channel.overallRank = index + 1
  })

  // 페이지네이션
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedChannels = allChannels.slice(startIndex, endIndex)

  return {
    success: true,
    data: paginatedChannels,
    total: allChannels.length,
    page,
    pageSize,
    hasMore: endIndex < allChannels.length
  }
}

// ==================== 캐시 관리 ====================

let cachedCategories: YCategory[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5분

/**
 * 캐시된 카테고리 데이터 가져오기
 */
export function getCachedCategories(): YCategory[] {
  const now = Date.now()

  if (cachedCategories && now - cacheTimestamp < CACHE_TTL) {
    return cachedCategories
  }

  cachedCategories = generateAllMockCategories(50)
  cacheTimestamp = now

  return cachedCategories
}

/**
 * 캐시 무효화
 */
export function invalidateCache(): void {
  cachedCategories = null
  cacheTimestamp = 0
}

/**
 * 여러 채널 생성 (별칭 함수)
 */
export function generateMockChannels(
  category: YCategoryCode,
  count: number = 50
): Channel[] {
  return generateMockChannelsForCategory(category, count)
}
