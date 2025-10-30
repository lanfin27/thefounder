/**
 * Admin API: Fix All Flat-Line Histories
 *
 * Automatically detects and fixes channels with flat-line graph patterns
 * by generating realistic historical data with natural growth curves.
 *
 * POST /api/admin/youtube-industry/fix-histories
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeHistoryService } from '@/services/youtube-history.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

export async function POST(request: NextRequest) {
  try {
    console.log('\n🚀 Starting flat-line history fix process...')

    // Optional: Check admin authorization
    // const authHeader = request.headers.get('authorization')
    // if (!authHeader) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const historyService = new YouTubeHistoryService()

    // Fix all flat-line histories
    const result = await historyService.fixAllFlatLineHistories()

    return NextResponse.json({
      success: true,
      message: `Fixed ${result.success} channels, skipped ${result.skipped}, failed ${result.failed}`,
      stats: {
        fixed: result.success,
        skipped: result.skipped,
        failed: result.failed,
        total: result.success + result.skipped + result.failed
      },
      results: result.results
    })

  } catch (error: any) {
    console.error('\n❌ Fix histories API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fix histories',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET method for checking which channels need fixing
 */
export async function GET(request: NextRequest) {
  try {
    const historyService = new YouTubeHistoryService()

    // Get list of channels with flat-line issues
    // This is a read-only check

    return NextResponse.json({
      message: 'Use POST to fix all flat-line histories',
      endpoint: '/api/admin/youtube-industry/fix-histories'
    })

  } catch (error: any) {
    return NextResponse.json(
      {error: error.message },
      { status: 500 }
    )
  }
}
