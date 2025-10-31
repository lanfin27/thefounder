/**
 * Incremental Channel Update Endpoint
 * Update a single channel using incremental approach (80% cost savings)
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeService } from '@/lib/youtube/youtube-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    console.log('[Incremental Update API] === REQUEST START ===')

    const { channelId } = params

    if (!channelId) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'channelId is required'
        },
        { status: 400 }
      )
    }

    console.log(`[Incremental Update API] Starting incremental update for ${channelId}`)

    const youtubeService = new YouTubeService()
    const result = await youtubeService.incrementalUpdateChannel(channelId)

    console.log('[Incremental Update API] ✅ Update completed:', {
      channel: result.channel,
      newVideos: result.newVideos,
      apiCost: result.apiCost,
      savings: result.savings
    })
    console.log('[Incremental Update API] === REQUEST END ===')

    return NextResponse.json(result, { status: 200 })

  } catch (error: any) {
    console.error('[Incremental Update API] ❌ Error:', error)

    // Check error type
    const errorType = error.type || 'UNKNOWN'
    const errorMessage = error.message || 'Failed to update channel'

    let statusCode = 500

    if (errorType === 'API_KEY_MISSING') {
      statusCode = 500
    } else if (errorType === 'CHANNEL_NOT_FOUND') {
      statusCode = 404
    } else if (errorType === 'QUOTA_EXCEEDED') {
      statusCode = 429
    } else if (errorType === 'DATABASE_ERROR') {
      statusCode = 500
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        type: errorType,
        channelId: error.channelId
      },
      { status: statusCode }
    )
  }
}
