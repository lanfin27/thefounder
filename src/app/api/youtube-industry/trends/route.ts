/**
 * YouTube Industry Index API - Trends
 * GET /api/youtube-industry/trends
 *
 * 기간별 트렌드 데이터 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateMockTrendsResponse } from '@/lib/youtube-industry/mock-data'
import { YCategoryCode, Y_CATEGORIES, TimePeriod, TIME_PERIODS } from '@/types/youtube-industry'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Category (required)
    const categoryParam = searchParams.get('category')
    if (!categoryParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter',
          message: 'Category code is required. Example: ?category=Y01'
        },
        { status: 400 }
      )
    }

    const categoryCode = categoryParam.toUpperCase() as YCategoryCode

    // 유효한 카테고리 코드인지 확인
    if (!Y_CATEGORIES[categoryCode]) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category code',
          message: `Category code '${categoryParam}' is not valid. Valid codes: Y01-Y15`
        },
        { status: 400 }
      )
    }

    // Period (optional, default: monthly)
    const periodParam = (searchParams.get('period') || 'monthly') as TimePeriod
    const days = TIME_PERIODS[periodParam]?.days || 30

    // Mock 데이터 생성
    const response = generateMockTrendsResponse(categoryCode, days)

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' // 10분 캐시
      }
    })
  } catch (error) {
    console.error('Error fetching trends:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
