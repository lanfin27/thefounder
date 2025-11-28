/**
 * YouTube Channel Remove API
 * 채널 제거 엔드포인트 (Soft/Hard Delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { YouTubeService } from '@/lib/youtube/youtube-service'
import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

// ✅ CRITICAL: API 캐싱 비활성화
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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

    // 1. 채널 정보 조회 (카테고리 코드 확인용)
    let oldCategoryCode: string | null = null

    try {
      const { data: channelInfo } = await ytSupabaseAdmin
        .from('youtube_channels')
        .select('category_code')
        .eq('channel_id', channelId)
        .single()

      oldCategoryCode = channelInfo?.category_code || null
      console.log('[Remove API] Channel category:', oldCategoryCode)
    } catch (error) {
      console.warn('[Remove API] Could not fetch channel category:', error)
      // 계속 진행 (카테고리 정보 없이도 삭제는 가능)
    }

    // 2. Initialize service for removal
    const service = new YouTubeService()

    // 2. ✅ NEW: 히스토리 데이터 삭제 (Hard Delete 시에만)
    if (hardDelete) {
      console.log('[Remove API] 🗑️ Deleting channel history data...')
      try {
        const { error: historyError, count } = await ytSupabaseAdmin
          .from('youtube_channel_history')
          .delete()
          .eq('channel_id', channelId)

        if (historyError) {
          console.error('[Remove API] ⚠️ Failed to delete history data:', historyError)
          // 히스토리 삭제 실패는 치명적이지 않으므로 경고만 출력
        } else {
          console.log('[Remove API] ✅ History data deleted:', {
            channelId,
            recordsDeleted: count || 0
          })
        }
      } catch (historyDeletionError) {
        console.error('[Remove API] ⚠️ Exception deleting history data:', historyDeletionError)
        // 계속 진행 - 히스토리 삭제 실패는 치명적이지 않음
      }
    } else {
      console.log('[Remove API] ℹ️ Soft delete - keeping history data')
    }

    // 3. Execute removal
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

    // 4. ✅ CRITICAL: 캐시 무효화 - 모든 관련 페이지 revalidate
    console.log('[Remove API] 🔄 Revalidating all affected paths and tags...')

    const pathsToRevalidate = [
      // Admin 페이지
      '/admin/youtube-industry/channels',
      '/admin/youtube-industry/categories',

      // User 메인 페이지
      '/youtube-industry',

      // 해당 카테고리 상세 페이지
      oldCategoryCode ? `/youtube-industry/${oldCategoryCode}` : null,
    ].filter(Boolean) as string[]

    try {
      // Path 기반 캐시 무효화
      for (const path of pathsToRevalidate) {
        revalidatePath(path, 'page')
        console.log(`[Remove API] ✅ Revalidated path: ${path}`)
      }

      // Tag 기반 캐시 무효화 (추가 안전장치)
      const tagsToRevalidate = [
        'youtube-channels',
        'youtube-categories',
        oldCategoryCode ? `category-${oldCategoryCode}` : null,
        'treemap-data',
      ].filter(Boolean) as string[]

      for (const tag of tagsToRevalidate) {
        revalidateTag(tag)
        console.log(`[Remove API] ✅ Revalidated tag: ${tag}`)
      }

      console.log('[Remove API] ✅ All caches revalidated successfully')
    } catch (revalidateError) {
      console.error('[Remove API] ⚠️ Revalidation error:', revalidateError)
      // 캐시 무효화 실패는 치명적이지 않으므로 계속 진행
    }

    console.log('[Remove API] ✓ Channel removed successfully:', channelId)
    return NextResponse.json({
      success: true,
      message: hardDelete
        ? 'Channel permanently deleted and all statistics will be recalculated'
        : 'Channel deactivated and all statistics will be recalculated',
      channelId,
      hardDelete,
      oldCategory: oldCategoryCode,
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

    // ✅ 재활성화 시에도 캐시 무효화
    console.log('[Remove API] 🔄 Revalidating caches for reactivation...')

    try {
      revalidatePath('/admin/youtube-industry/channels', 'page')
      revalidatePath('/youtube-industry', 'page')
      revalidateTag('youtube-channels')
      revalidateTag('youtube-categories')
      console.log('[Remove API] ✅ Caches revalidated')
    } catch (error) {
      console.error('[Remove API] ⚠️ Revalidation error:', error)
    }

    console.log('[Remove API] ✓ Channel reactivated successfully:', channelId)
    return NextResponse.json({
      success: true,
      message: 'Channel reactivated successfully',
      channelId
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
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
