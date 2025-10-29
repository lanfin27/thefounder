/**
 * YouTube Channel Add API
 * 새 채널 추가 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { YouTubeService } from '@/lib/youtube/youtube-service'
import { extractChannelId } from '@/lib/youtube/youtube-url-parser'
import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

// ✅ CRITICAL: API 캐싱 비활성화
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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

    // 3. ✅ NEW: 초기 시계열 데이터 생성
    console.log('[Add API] 📊 Creating initial time-series data...')
    try {
      const channel = result.channel
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

      // 초기 히스토리 데이터 생성
      const { error: historyError } = await ytSupabaseAdmin
        .from('youtube_channel_history')
        .insert({
          channel_id: channel.channel_id,
          category_code: channel.category_code,
          date: today,
          total_views: channel.total_views || 0,
          video_count: channel.video_count || 0,
          views_per_video: channel.views_per_video || 0,
          subscribers: channel.subscribers || 0
        })

      if (historyError) {
        // 히스토리 생성 실패는 치명적이지 않으므로 경고만 출력
        console.error('[Add API] ⚠️ Failed to create initial history data:', historyError)
        console.error('[Add API] Channel data:', {
          channel_id: channel.channel_id,
          category_code: channel.category_code,
          subscribers: channel.subscribers,
          total_views: channel.total_views,
          video_count: channel.video_count
        })
      } else {
        console.log('[Add API] ✅ Initial history data created:', {
          channel_id: channel.channel_id,
          date: today,
          views_per_video: channel.views_per_video
        })
      }
    } catch (historyCreationError) {
      console.error('[Add API] ⚠️ Exception creating history data:', historyCreationError)
      // 계속 진행 - 히스토리 생성 실패는 치명적이지 않음
    }

    // 4. ✅ CRITICAL: 캐시 무효화 - 모든 관련 페이지 revalidate
    console.log('[Add API] 🔄 Revalidating all affected paths and tags...')

    const pathsToRevalidate = [
      // Admin 페이지
      '/admin/youtube-industry/channels',
      '/admin/youtube-industry/categories',

      // User 메인 페이지
      '/youtube-industry',

      // 해당 카테고리 상세 페이지
      `/youtube-industry/${categoryCode}`,
    ]

    try {
      // Path 기반 캐시 무효화
      for (const path of pathsToRevalidate) {
        revalidatePath(path, 'page')
        console.log(`[Add API] ✅ Revalidated path: ${path}`)
      }

      // Tag 기반 캐시 무효화 (추가 안전장치)
      const tagsToRevalidate = [
        'youtube-channels',
        'youtube-categories',
        `category-${categoryCode}`,
        'treemap-data',
      ]

      for (const tag of tagsToRevalidate) {
        revalidateTag(tag)
        console.log(`[Add API] ✅ Revalidated tag: ${tag}`)
      }

      console.log('[Add API] ✅ All caches revalidated successfully')
    } catch (revalidateError) {
      console.error('[Add API] ⚠️ Revalidation error:', revalidateError)
      // 캐시 무효화 실패는 치명적이지 않으므로 계속 진행
    }

    // 5. Return success with channel data
    console.log('[Add API] ✓ Channel added successfully:', channelId)
    return NextResponse.json({
      success: true,
      message: 'Channel added and all statistics will be recalculated on next page load',
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
      },
      revalidated: {
        paths: pathsToRevalidate,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
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
