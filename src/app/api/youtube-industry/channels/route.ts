/**
 * YouTube Industry Index API - Channels
 * GET /api/youtube-industry/channels
 *
 * 채널 목록 반환 (필터링, 정렬, 페이지네이션 지원)
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateMockChannelsResponse, getCachedCategories } from '@/lib/youtube-industry/mock-data'
import { filterChannels, sortChannels } from '@/lib/youtube-industry/utils'
import { YCategoryCode, SortBy } from '@/types/youtube-industry'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // Category filter
    const categoryParam = searchParams.get('category')
    const categoryCode = categoryParam ? (categoryParam.toUpperCase() as YCategoryCode) : undefined

    // Sorting
    const sortBy = (searchParams.get('sortBy') || 'viewsPerVideo') as SortBy
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Filters
    const minSubscribers = searchParams.get('minSubscribers')
      ? parseInt(searchParams.get('minSubscribers')!, 10)
      : undefined
    const maxSubscribers = searchParams.get('maxSubscribers')
      ? parseInt(searchParams.get('maxSubscribers')!, 10)
      : undefined
    const minViewsPerVideo = searchParams.get('minViewsPerVideo')
      ? parseInt(searchParams.get('minViewsPerVideo')!, 10)
      : undefined
    const changeType = searchParams.get('changeType') as 'up' | 'down' | 'all' | null
    const shortsOnly = searchParams.get('shortsOnly') === 'true'

    // 데이터 가져오기
    let channels = categoryCode
      ? getCachedCategories()
          .find((c) => c.code === categoryCode)
          ?.topChannels || []
      : getCachedCategories().flatMap((c) => c.topChannels)

    // 필터링
    channels = filterChannels(channels, {
      minSubscribers,
      maxSubscribers,
      minViewsPerVideo,
      changeType: changeType || undefined,
      shortsOnly
    })

    // 정렬
    channels = sortChannels(channels, sortBy, sortOrder)

    // 페이지네이션
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedChannels = channels.slice(startIndex, endIndex)

    return NextResponse.json(
      {
        success: true,
        data: paginatedChannels,
        total: channels.length,
        page,
        pageSize,
        hasMore: endIndex < channels.length
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' // 1분 캐시
        }
      }
    )
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch channels',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
