/**
 * YouTube Industry Index Dashboard - Type Definitions
 *
 * 유튜브 산업지수 대시보드를 위한 타입 정의
 * Y코드 분류 체계 기반 산업별 채널 데이터 및 지표 관리
 */

// ==================== Y코드 산업 분류 ====================

/**
 * Y코드 카테고리 (Y01~Y15)
 */
export type YCategoryCode =
  | 'Y01' // 패션
  | 'Y02' // 뷰티
  | 'Y03' // 먹방
  | 'Y04' // 게임
  | 'Y05' // 스포츠
  | 'Y06' // 음악
  | 'Y07' // 브이로그
  | 'Y08' // 교육
  | 'Y09' // 테크
  | 'Y10' // 엔터테인먼트
  | 'Y11' // 키즈
  | 'Y12' // 여행
  | 'Y13' // 반려동물
  | 'Y14' // 비즈니스
  | 'Y15' // 라이프스타일

/**
 * Y코드 산업 카테고리 정보
 */
export interface YCategory {
  code: YCategoryCode
  name: string
  nameEn: string
  description: string
  emoji: string
  color: string // Hex color for visualization
  topChannels: Channel[]
  metrics: IndustryMetrics
  lastUpdated: Date
}

// ==================== 채널 정보 ====================

/**
 * 유튜브 채널 정보
 */
export interface Channel {
  id: string
  channelId: string // YouTube Channel ID
  name: string
  handle?: string // @handle
  category: YCategoryCode

  // 기본 지표
  subscribers: number
  totalViews: number
  videoCount: number

  // 핵심 지표: 영상당 조회수
  viewsPerVideo: number // totalViews ÷ videoCount

  // 변화율
  dailyChangeRate: number // 일간 변화율 (%)
  weeklyChangeRate: number // 주간 변화율 (%)
  monthlyChangeRate: number // 월간 변화율 (%)

  // 참여도 지표
  engagementRate: number // (좋아요 + 댓글) ÷ 조회수
  likesPerVideo: number // 평균 좋아요 수
  commentsPerVideo: number // 평균 댓글 수

  // Shorts 비율
  shortsCount: number
  regularCount: number
  shortsRatio: number // shortsCount ÷ videoCount

  // 업로드 빈도
  uploadsPerWeek: number
  lastUploadDate: Date | null

  // 메타데이터
  thumbnailUrl?: string
  description?: string
  createdAt: Date
  lastUpdated: Date

  // 랭킹
  categoryRank: number // 산업 내 순위
  overallRank: number // 전체 순위
}

// ==================== 산업 지표 ====================

/**
 * 산업별 집계 지표
 */
export interface IndustryMetrics {
  categoryCode: YCategoryCode

  // 평균 지표
  averageViewsPerVideo: number // 산업 평균 영상당 조회수 (시장 규모)
  averageSubscribers: number
  averageEngagementRate: number
  averageShortsRatio: number

  // 총계
  totalChannels: number
  totalVideos: number
  totalViews: number

  // 변화율
  dailyChange: number // 전일 대비 평균 영상당 조회수 변화율
  weeklyChange: number
  monthlyChange: number

  // 시장 점유율
  marketShare: number // 전체 시장 내 점유율 (%)

  // 변동성
  volatility: number // 최근 30일 변동성 지수
  volatilityLevel: 'high' | 'medium' | 'low'

  // Top 채널
  topChannelsByViews: string[] // Channel IDs
  topChannelsByGrowth: string[] // Channel IDs

  // 시계열 데이터
  historicalData: TimeSeriesDataPoint[]

  lastUpdated: Date
}

// ==================== 시계열 데이터 ====================

/**
 * 시계열 데이터 포인트
 */
export interface TimeSeriesDataPoint {
  date: string // ISO date string
  value: number // 영상당 조회수
  change: number // 전일 대비 변화율
  volume?: number // 총 영상 수
  high?: number // 해당일 최고값
  low?: number // 해당일 최저값
}

/**
 * 채널별 시계열 데이터
 */
export interface ChannelTimeSeries {
  channelId: string
  data: TimeSeriesDataPoint[]
  period: TimePeriod
}

// ==================== 시장 맵 데이터 ====================

/**
 * Finviz 스타일 Treemap용 데이터 구조
 */
export interface MarketMapNode {
  id: string
  name: string
  categoryCode: YCategoryCode
  value: number // 영상당 조회수 (사각형 크기)
  change: number // 변화율 (색상)
  color: string // 계산된 색상
  parent?: string // 계층 구조
  children?: MarketMapNode[]
}

/**
 * 변화율에 따른 색상 레벨
 */
export type ChangeLevel =
  | 'strong-up' // +10% 이상
  | 'up' // +5~10%
  | 'neutral' // -5~+5%
  | 'down' // -5~-10%
  | 'strong-down' // -10% 이하

// ==================== 필터 및 정렬 ====================

/**
 * 시간 범위
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'

/**
 * 정렬 기준
 */
export type SortBy =
  | 'viewsPerVideo'
  | 'dailyChange'
  | 'weeklyChange'
  | 'subscribers'
  | 'engagementRate'
  | 'categoryRank'

/**
 * 필터 옵션
 */
export interface FilterOptions {
  categories?: YCategoryCode[]
  minSubscribers?: number
  maxSubscribers?: number
  minViewsPerVideo?: number
  changeType?: 'up' | 'down' | 'all'
  shortsOnly?: boolean
  sortBy?: SortBy
  sortOrder?: 'asc' | 'desc'
  limit?: number
}

// ==================== API 응답 타입 ====================

/**
 * 카테고리 목록 API 응답
 */
export interface CategoriesResponse {
  success: boolean
  data: YCategory[]
  totalCategories: number
  lastUpdated: string
}

/**
 * 특정 카테고리 상세 API 응답
 */
export interface CategoryDetailResponse {
  success: boolean
  data: {
    category: YCategory
    topChannels: Channel[]
    metrics: IndustryMetrics
  }
  lastUpdated: string
}

/**
 * 채널 목록 API 응답
 */
export interface ChannelsResponse {
  success: boolean
  data: Channel[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * 실시간 지표 API 응답
 */
export interface RealtimeMetricsResponse {
  success: boolean
  data: {
    categories: Record<YCategoryCode, IndustryMetrics>
    trending: {
      topGainers: Channel[]
      topLosers: Channel[]
      mostActive: Channel[]
    }
    marketOverview: {
      totalViews: number
      totalChannels: number
      avgChange: number
    }
  }
  timestamp: string
}

/**
 * 트렌드 데이터 API 응답
 */
export interface TrendsResponse {
  success: boolean
  data: {
    categoryCode: YCategoryCode
    timeSeries: TimeSeriesDataPoint[]
    period: TimePeriod
    statistics: {
      mean: number
      median: number
      stdDev: number
      min: number
      max: number
    }
  }
  lastUpdated: string
}

// ==================== 상태 관리 ====================

/**
 * YouTube Industry Dashboard State
 */
export interface YTIndustryState {
  // 데이터
  categories: YCategory[]
  selectedCategory: YCategoryCode | null
  channels: Channel[]
  metrics: Record<YCategoryCode, IndustryMetrics>

  // 필터 및 정렬
  filters: FilterOptions
  timeRange: TimePeriod
  sortBy: SortBy

  // UI 상태
  isLoading: boolean
  error: string | null
  viewMode: 'map' | 'chart' | 'table' | 'grid'

  // 실시간 업데이트
  lastUpdate: Date | null
  autoRefresh: boolean
  refreshInterval: number // milliseconds
}

// ==================== 유틸리티 함수 타입 ====================

/**
 * 영상당 조회수 계산
 */
export type CalculateViewsPerVideo = (totalViews: number, videoCount: number) => number

/**
 * 변화율 계산
 */
export type CalculateChangeRate = (current: number, previous: number) => number

/**
 * 색상 맵핑
 */
export type GetChangeColor = (changeRate: number) => { level: ChangeLevel; color: string }

/**
 * 데이터 집계
 */
export type AggregateMetrics = (channels: Channel[]) => IndustryMetrics

// ==================== 상수 ====================

/**
 * Y코드 카테고리 정의
 */
export const Y_CATEGORIES: Record<YCategoryCode, Omit<YCategory, 'topChannels' | 'metrics' | 'lastUpdated'>> = {
  Y01: {
    code: 'Y01',
    name: '패션',
    nameEn: 'Fashion',
    description: '패션, 스타일링, 의류 관련 콘텐츠',
    emoji: '👗',
    color: '#FF6B9D'
  },
  Y02: {
    code: 'Y02',
    name: '뷰티',
    nameEn: 'Beauty',
    description: '메이크업, 스킨케어, 헤어 관련 콘텐츠',
    emoji: '💄',
    color: '#FFA07A'
  },
  Y03: {
    code: 'Y03',
    name: '먹방',
    nameEn: 'Mukbang',
    description: '음식, 요리, 먹방 관련 콘텐츠',
    emoji: '🍕',
    color: '#FFD700'
  },
  Y04: {
    code: 'Y04',
    name: '게임',
    nameEn: 'Gaming',
    description: '게임 플레이, 리뷰, e스포츠 관련 콘텐츠',
    emoji: '🎮',
    color: '#9370DB'
  },
  Y05: {
    code: 'Y05',
    name: '스포츠',
    nameEn: 'Sports',
    description: '스포츠, 피트니스, 운동 관련 콘텐츠',
    emoji: '⚽',
    color: '#32CD32'
  },
  Y06: {
    code: 'Y06',
    name: '음악',
    nameEn: 'Music',
    description: '음악, 커버, 뮤직비디오 관련 콘텐츠',
    emoji: '🎵',
    color: '#FF1493'
  },
  Y07: {
    code: 'Y07',
    name: '브이로그',
    nameEn: 'Vlog',
    description: '일상, 브이로그 관련 콘텐츠',
    emoji: '📹',
    color: '#FF4500'
  },
  Y08: {
    code: 'Y08',
    name: '교육',
    nameEn: 'Education',
    description: '교육, 강의, 튜토리얼 관련 콘텐츠',
    emoji: '📚',
    color: '#4169E1'
  },
  Y09: {
    code: 'Y09',
    name: '테크',
    nameEn: 'Tech',
    description: '기술, 가젯, 리뷰 관련 콘텐츠',
    emoji: '💻',
    color: '#00CED1'
  },
  Y10: {
    code: 'Y10',
    name: '엔터테인먼트',
    nameEn: 'Entertainment',
    description: '예능, 코미디, 엔터테인먼트 관련 콘텐츠',
    emoji: '🎬',
    color: '#FF6347'
  },
  Y11: {
    code: 'Y11',
    name: '키즈',
    nameEn: 'Kids',
    description: '어린이, 가족 관련 콘텐츠',
    emoji: '👶',
    color: '#FFB6C1'
  },
  Y12: {
    code: 'Y12',
    name: '여행',
    nameEn: 'Travel',
    description: '여행, 관광, 문화 관련 콘텐츠',
    emoji: '✈️',
    color: '#87CEEB'
  },
  Y13: {
    code: 'Y13',
    name: '반려동물',
    nameEn: 'Pets',
    description: '반려동물, 동물 관련 콘텐츠',
    emoji: '🐶',
    color: '#DEB887'
  },
  Y14: {
    code: 'Y14',
    name: '비즈니스',
    nameEn: 'Business',
    description: '비즈니스, 창업, 재테크 관련 콘텐츠',
    emoji: '💼',
    color: '#2F4F4F'
  },
  Y15: {
    code: 'Y15',
    name: '라이프스타일',
    nameEn: 'Lifestyle',
    description: '라이프스타일, 힐링 관련 콘텐츠',
    emoji: '🌿',
    color: '#98FB98'
  }
}

/**
 * 시간 범위 옵션
 */
export const TIME_PERIODS: Record<TimePeriod, { label: string; days: number; shortLabel: string }> = {
  daily: { label: '1일', days: 1, shortLabel: '1D' },
  weekly: { label: '1주', days: 7, shortLabel: '1W' },
  monthly: { label: '1개월', days: 30, shortLabel: '1M' },
  '3months': { label: '3개월', days: 90, shortLabel: '3M' },
  '6months': { label: '6개월', days: 180, shortLabel: '6M' },
  yearly: { label: '1년', days: 365, shortLabel: '1Y' }
}

/**
 * 변화율 색상 매핑
 */
export const CHANGE_COLORS: Record<ChangeLevel, string> = {
  'strong-up': '#006400', // 진한 초록
  'up': '#22C55E', // 연한 초록
  'neutral': '#9CA3AF', // 회색
  'down': '#EF4444', // 연한 빨강
  'strong-down': '#8B0000' // 진한 빨강
}
