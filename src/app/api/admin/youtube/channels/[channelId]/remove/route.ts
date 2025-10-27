/**
 * YouTube Channel Remove API
 * 채널 제거 엔드포인트 (Soft/Hard Delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeService } from '@/lib/youtube/youtube-service'

interface RouteParams {
  params: {
    channelId: string
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { channelId } = params
    const body = await request.json()
    const { deletedBy, reason, hardDelete = false } = body

    // Validation
    if (!channelId) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    if (!deletedBy) {
      return NextResponse.json(
        { success: false, error: 'Admin identifier (deletedBy) is required' },
        { status: 400 }
      )
    }

    console.log('[Remove API] Removing channel:', {
      channelId,
      deletedBy,
      hardDelete,
      reason
    })

    // Execute removal
    const service = new YouTubeService()
    const result = await service.removeChannel(
      channelId,
      deletedBy,
      reason,
      hardDelete
    )

    if (!result.success) {
      console.error('[Remove API] Failed to remove channel:', result.error)

      // Return appropriate status code
      let statusCode = 500
      if (result.error?.includes('not found')) {
        statusCode = 404
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

    console.log('[Remove API] ✓ Channel removed successfully:', channelId)
    return NextResponse.json({
      success: true,
      message: hardDelete
        ? 'Channel permanently deleted'
        : 'Channel deactivated successfully',
      channelId,
      hardDelete
    })

  } catch (error) {
    console.error('[Remove API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Reactivate Channel (POST)
 * 삭제된 채널을 다시 활성화
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { channelId } = params

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    console.log('[Remove API] Reactivating channel:', channelId)

    const service = new YouTubeService()
    const result = await service.reactivateChannel(channelId)

    if (!result.success) {
      console.error('[Remove API] Failed to reactivate channel:', result.error)

      let statusCode = 500
      if (result.error?.includes('not found')) {
        statusCode = 404
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

    console.log('[Remove API] ✓ Channel reactivated successfully:', channelId)
    return NextResponse.json({
      success: true,
      message: 'Channel reactivated successfully',
      channelId
    })

  } catch (error) {
    console.error('[Remove API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reactivate channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
