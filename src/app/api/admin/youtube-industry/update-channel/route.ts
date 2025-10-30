/**
 * Admin API: Update Channel with Real YouTube Data
 *
 * Fetches current channel statistics from YouTube API and updates database.
 * Uses ONLY real data from YouTube API - NO random generation.
 *
 * POST /api/admin/youtube-industry/update-channel
 * Body: { channelId: string, categoryCode?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeDataService } from '@/services/youtube-data.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, categoryCode = 'Y05' } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      )
    }

    console.log(`\n🔄 Updating channel ${channelId} with real YouTube data...`)

    const dataService = new YouTubeDataService()

    // Update channel with real YouTube data
    const success = await dataService.updateChannelWithRealData(channelId, categoryCode)

    if (!success) {
      throw new Error('Failed to update channel with real YouTube data')
    }

    return NextResponse.json({
      success: true,
      message: `Channel ${channelId} updated with real YouTube data`,
      channelId
    })

  } catch (error: any) {
    console.error('\n❌ Update channel API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update channel',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
