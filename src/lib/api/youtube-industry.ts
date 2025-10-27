/**
 * YouTube Industry Index - Client API Functions
 *
 * 클라이언트에서 API를 호출하기 위한 함수들
 */

import {
  CategoriesResponse,
  CategoryDetailResponse,
  ChannelsResponse,
  RealtimeMetricsResponse,
  TrendsResponse,
  FilterOptions,
  YCategoryCode,
  TimePeriod
} from '@/types/youtube-industry'

const API_BASE = '/api/youtube-industry'

// ==================== 카테고리 API ====================

/**
 * 모든 카테고리 목록 가져오기
 */
export async function fetchCategories(
  includeChannels: boolean = false
): Promise<CategoriesResponse> {
  const url = new URL(`${API_BASE}/categories`, window.location.origin)
  if (includeChannels) {
    url.searchParams.set('includeChannels', 'true')
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 특정 카테고리 상세 정보 가져오기
 */
export async function fetchCategoryDetail(
  categoryCode: YCategoryCode,
  limit: number = 50
): Promise<CategoryDetailResponse> {
  const url = new URL(
    `${API_BASE}/categories/${categoryCode}`,
    window.location.origin
  )
  if (limit !== 50) {
    url.searchParams.set('limit', limit.toString())
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to fetch category detail: ${response.statusText}`)
  }

  return response.json()
}

// ==================== 채널 API ====================

export interface FetchChannelsOptions extends FilterOptions {
  page?: number
  pageSize?: number
  category?: YCategoryCode
}

/**
 * 채널 목록 가져오기 (필터링, 정렬, 페이지네이션)
 */
export async function fetchChannels(
  options: FetchChannelsOptions = {}
): Promise<ChannelsResponse> {
  const url = new URL(`${API_BASE}/channels`, window.location.origin)

  // Pagination
  if (options.page) url.searchParams.set('page', options.page.toString())
  if (options.pageSize) url.searchParams.set('pageSize', options.pageSize.toString())

  // Category filter
  if (options.category) url.searchParams.set('category', options.category)

  // Sorting
  if (options.sortBy) url.searchParams.set('sortBy', options.sortBy)
  if (options.sortOrder) url.searchParams.set('sortOrder', options.sortOrder)

  // Filters
  if (options.minSubscribers) {
    url.searchParams.set('minSubscribers', options.minSubscribers.toString())
  }
  if (options.maxSubscribers) {
    url.searchParams.set('maxSubscribers', options.maxSubscribers.toString())
  }
  if (options.minViewsPerVideo) {
    url.searchParams.set('minViewsPerVideo', options.minViewsPerVideo.toString())
  }
  if (options.changeType) {
    url.searchParams.set('changeType', options.changeType)
  }
  if (options.shortsOnly) {
    url.searchParams.set('shortsOnly', 'true')
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to fetch channels: ${response.statusText}`)
  }

  return response.json()
}

// ==================== 지표 API ====================

/**
 * 실시간 지표 가져오기
 */
export async function fetchRealtimeMetrics(): Promise<RealtimeMetricsResponse> {
  const response = await fetch(`${API_BASE}/metrics/realtime`)

  if (!response.ok) {
    throw new Error(`Failed to fetch realtime metrics: ${response.statusText}`)
  }

  return response.json()
}

// ==================== 트렌드 API ====================

/**
 * 트렌드 데이터 가져오기
 */
export async function fetchTrends(
  categoryCode: YCategoryCode,
  period: TimePeriod = 'monthly'
): Promise<TrendsResponse> {
  const url = new URL(`${API_BASE}/trends`, window.location.origin)
  url.searchParams.set('category', categoryCode)
  url.searchParams.set('period', period)

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to fetch trends: ${response.statusText}`)
  }

  return response.json()
}

// ==================== 유틸리티 함수 ====================

/**
 * API 에러 핸들러
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

/**
 * 재시도 로직이 있는 fetch wrapper
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fetchFn()
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(fetchFn, retries - 1, delay * 2)
    }
    throw error
  }
}

// ==================== 추가 API 함수 ====================

/**
 * 카테고리 상세 정보 가져오기 (간단한 wrapper)
 */
export async function getCategoryDetails(categoryCode: YCategoryCode) {
  const response = await fetchCategoryDetail(categoryCode)
  return response.data
}

/**
 * 카테고리별 채널 목록 가져오기
 */
export async function getChannelsByCategory(categoryCode: YCategoryCode) {
  const response = await fetchChannels({ category: categoryCode, pageSize: 50 })
  return response.data
}

/**
 * 트렌드 데이터 가져오기 (시간 범위 변환)
 */
export async function getTrendData(
  categoryCode: YCategoryCode,
  timeRange: '1D' | '1W' | '1M' | '3M'
): Promise<Array<{ date: string; value: number }>> {
  let period: TimePeriod

  switch (timeRange) {
    case '1D':
      period = 'daily'
      break
    case '1W':
      period = 'weekly'
      break
    case '1M':
      period = 'monthly'
      break
    case '3M':
      period = '3months'
      break
    default:
      period = 'weekly'
  }

  const response = await fetchTrends(categoryCode, period)

  if (response.success && response.data.timeSeries) {
    return response.data.timeSeries.map((item) => ({
      date: item.date,
      value: item.value
    }))
  }

  return []
}
