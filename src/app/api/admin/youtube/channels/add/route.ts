/**
 * YouTube Channel Add API
 * 새 채널 추가 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeService } from '@/lib/youtube/youtube-service'
import { extractChannelId } from '@/lib/youtube/youtube-url-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, categoryCode, addedBy, notes } = body

    // Validation
    if (!input) {
      return NextResponse.json(
        { success: false, error: 'YouTube URL or channel ID is required' },
        { status: 400 }
      )
    }

    if (!categoryCode) {
      return NextResponse.json(
        { success: false, error: 'Category code is required' },
        { status: 400 }
      )
    }

    if (!addedBy) {
      return NextResponse.json(
        { success: false, error: 'Admin identifier (addedBy) is required' },
        { status: 400 }
      )
    }

    console.log('[Add API] Adding channel:', { input, categoryCode, addedBy })

    // 1. Parse YouTube URL/ID
    const parseResult = await extractChannelId(input)

    if (!parseResult.channelId) {
      console.warn('[Add API] Failed to parse input:', parseResult.error)
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || 'Invalid YouTube URL or channel ID',
          details: {
            input,
            type: parseResult.type
          }
        },
        { status: 400 }
      )
    }

    const channelId = parseResult.channelId

    // 2. Add channel using YouTubeService
    const service = new YouTubeService()
    const result = await service.addChannel({
      channelId,
      categoryCode,
      addedBy,
      notes
    })

    if (!result.success) {
      console.error('[Add API] Failed to add channel:', result.error)

      // Return appropriate status code based on error type
      let statusCode = 500
      if (result.error?.includes('already exists')) {
        statusCode = 409 // Conflict
      } else if (result.error?.includes('not found')) {
        statusCode = 404 // Not found
      } else if (result.error?.includes('Category')) {
        statusCode = 400 // Bad request
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          channelId
        },
        { status: statusCode }
      )
    }

    // 3. Return success with channel data
    console.log('[Add API] ✓ Channel added successfully:', channelId)
    return NextResponse.json({
      success: true,
      message: 'Channel added successfully',
      channel: {
        id: result.channel?.id,
        channelId: result.channel?.channel_id,
        title: result.channel?.title,
        categoryCode: result.channel?.category_code,
        subscriberCount: result.channel?.subscribers,
        videoCount: result.channel?.video_count,
        viewCount: result.channel?.total_views,
        addedBy: result.channel?.added_by,
        addedAt: result.channel?.added_at,
        status: result.channel?.status,
        isActive: result.channel?.is_active
      }
    })

  } catch (error) {
    console.error('[Add API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
