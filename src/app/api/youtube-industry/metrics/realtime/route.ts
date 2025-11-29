/**
 * YouTube Industry Index API - Realtime Metrics
 * GET /api/youtube-industry/metrics/realtime
 *
 * 실시간 변동성 데이터 반환
 */

import { NextResponse } from 'next/server'
import { generateMockRealtimeMetricsResponse } from '@/lib/youtube-industry/mock-data'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const response = generateMockRealtimeMetricsResponse()

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // 1분 캐시
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error fetching realtime metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch realtime metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
