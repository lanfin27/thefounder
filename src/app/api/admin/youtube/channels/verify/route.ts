/**
 * YouTube Channel Verification API
 * 채널 추가 전 검증 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeService } from '@/lib/youtube/youtube-service'
import { extractChannelId } from '@/lib/youtube/youtube-url-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, categoryCode } = body

    console.log('[Verify API] === START ===')
    console.log('[Verify API] Input:', input)
    console.log('[Verify API] Category Code:', categoryCode)
    console.log('[Verify API] API Key present:', !!process.env.YOUTUBE_API_KEY)
    console.log('[Verify API] API Key length:', process.env.YOUTUBE_API_KEY?.length)

    if (!input) {
      console.log('[Verify API] ✗ No input provided')
      return NextResponse.json(
        { success: false, error: 'YouTube URL or channel ID is required' },
        { status: 400 }
      )
    }

    console.log('[Verify API] Parsing YouTube URL/ID...')

    // 1. Parse YouTube URL/ID
    const parseResult = await extractChannelId(input)

    console.log('[Verify API] Parse result:', {
      success: !!parseResult.channelId,
      channelId: parseResult.channelId,
      type: parseResult.type,
      error: parseResult.error
    })

    if (!parseResult.channelId) {
      console.log('[Verify API] ✗ Failed to parse input:', parseResult.error)
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
    console.log('[Verify API] ✓ Extracted Channel ID:', channelId)

    // 2. Verify channel exists on YouTube
    console.log('[Verify API] Calling YouTube API to verify channel existence...')
    const service = new YouTubeService()
    const verifyResult = await service.verifyChannelExists(channelId)

    console.log('[Verify API] YouTube API verification result:', {
      exists: verifyResult.exists,
      title: verifyResult.title,
      subscribers: verifyResult.subscriberCount,
      error: verifyResult.error
    })

    if (!verifyResult.exists) {
      console.log('[Verify API] ✗ Channel not found on YouTube:', channelId)
      return NextResponse.json(
        {
          success: false,
          error: verifyResult.error || 'Channel not found on YouTube',
          channelId,
          details: { urlType: parseResult.type }
        },
        { status: 404 }
      )
    }

    // 3. Check for duplicates
    console.log('[Verify API] Checking for duplicate channels...')
    const duplicateCheck = await service.checkChannelDuplicate(channelId, categoryCode)

    console.log('[Verify API] Duplicate check result:', {
      isDuplicate: duplicateCheck.isDuplicate,
      existingChannelId: duplicateCheck.existingChannel?.id,
      existingChannelTitle: duplicateCheck.existingChannel?.title,
      existingChannelStatus: duplicateCheck.existingChannel?.status
    })

    if (duplicateCheck.isDuplicate) {
      console.warn('[Verify API] Duplicate channel found:', channelId)
      return NextResponse.json(
        {
          success: false,
          error: 'Channel already exists in the database',
          channelId,
          duplicate: true,
          existingChannel: {
            id: duplicateCheck.existingChannel?.id,
            title: duplicateCheck.existingChannel?.title,
            categoryCode: duplicateCheck.existingChannel?.category_code,
            status: duplicateCheck.existingChannel?.status,
            isActive: duplicateCheck.existingChannel?.is_active
          }
        },
        { status: 409 }
      )
    }

    // 4. Return success with channel data
    console.log('[Verify API] ✓ Channel verified successfully:', channelId)
    return NextResponse.json({
      success: true,
      channelId,
      urlType: parseResult.type,
      channelData: {
        title: verifyResult.title,
        description: verifyResult.description,
        thumbnailUrl: verifyResult.thumbnailUrl,
        subscriberCount: verifyResult.subscriberCount,
        videoCount: verifyResult.videoCount,
        viewCount: verifyResult.viewCount
      }
    })

  } catch (error: any) {
    console.error('[Verify API] ✗ Unexpected error:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack,
      fullError: error
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
