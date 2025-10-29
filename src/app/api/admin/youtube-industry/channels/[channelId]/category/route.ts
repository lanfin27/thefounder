import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

// ✅ CRITICAL: API 캐싱 비활성화
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface RouteContext {
  params: {
    channelId: string
  }
}

/**
 * PUT /api/admin/youtube-industry/channels/[channelId]/category
 * 채널의 카테고리를 업데이트합니다
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { channelId } = context.params
    const body = await request.json()
    const { categoryCode } = body

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[Category Update API] Request:', {
      channelId,
      categoryCode,
      timestamp: new Date().toISOString()
    })

    // 입력 검증
    if (!categoryCode || !categoryCode.match(/^Y\d{2}$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category code format. Expected: Y01-Y15' },
        { status: 400 }
      )
    }

    // 채널 존재 확인 (Admin client 사용으로 RLS 우회)
    const { data: existingChannel, error: fetchError } = await ytSupabaseAdmin
      .from('youtube_channels')
      .select('channel_id, name, title, category_code')
      .eq('channel_id', channelId)
      .single()

    if (fetchError || !existingChannel) {
      console.error('[Category Update API] ❌ Channel not found:', {
        channelId,
        error: fetchError
      })
      return NextResponse.json(
        {
          error: 'Channel not found',
          details: `채널 ID ${channelId}를 찾을 수 없습니다.`
        },
        { status: 404 }
      )
    }

    const channelTitle = existingChannel.name || existingChannel.title
    const oldCategory = existingChannel.category_code

    console.log('[Category Update API] Channel found:', {
      title: channelTitle,
      currentCategory: oldCategory,
      newCategory: categoryCode
    })

    // 이미 같은 카테고리인지 확인
    if (existingChannel.category_code === categoryCode) {
      console.log('[Category Update API] Category already set to:', categoryCode)
      return NextResponse.json({
        success: true,
        message: 'Category is already set to this value',
        data: existingChannel,
      })
    }

    // 카테고리 업데이트 (Admin client 사용으로 RLS 우회)
    const { data: updatedChannel, error: updateError} = await ytSupabaseAdmin
      .from('youtube_channels')
      .update({
        category_code: categoryCode,
        updated_at: new Date().toISOString(),
      })
      .eq('channel_id', channelId)
      .select()
      .single()

    if (updateError) {
      console.error('[Category Update API] ❌ Update error:', updateError)
      return NextResponse.json(
        {
          error: 'Update failed',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    // 성공 로그
    console.log('[Category Update API] ✅ Success:', {
      channelId,
      title: channelTitle,
      oldCategory,
      newCategory: updatedChannel.category_code,
      updated_at: updatedChannel.updated_at
    })

    // ✅ CRITICAL: Next.js 캐시 무효화 - 모든 관련 페이지 revalidate
    console.log('[Category Update API] 🔄 Revalidating all affected paths and tags...')

    const pathsToRevalidate = [
      // Admin 페이지
      '/admin/youtube-industry/channels',
      '/admin/youtube-industry/categories',

      // User 메인 페이지
      '/youtube-industry',

      // 이전 카테고리 상세 페이지
      oldCategory ? `/youtube-industry/${oldCategory}` : null,

      // 새 카테고리 상세 페이지
      `/youtube-industry/${categoryCode}`,
    ].filter(Boolean) as string[]

    try {
      // Path 기반 캐시 무효화
      for (const path of pathsToRevalidate) {
        revalidatePath(path, 'page')
        console.log(`[Category Update API] ✅ Revalidated path: ${path}`)
      }

      // Tag 기반 캐시 무효화 (추가 안전장치)
      const tagsToRevalidate = [
        'youtube-channels',
        'youtube-categories',
        `category-${oldCategory}`,
        `category-${categoryCode}`,
      ]

      for (const tag of tagsToRevalidate) {
        revalidateTag(tag)
        console.log(`[Category Update API] ✅ Revalidated tag: ${tag}`)
      }

      console.log('[Category Update API] ✅ All caches revalidated successfully')
    } catch (revalidateError) {
      console.error('[Category Update API] ⚠️ Revalidation error:', revalidateError)
      // 캐시 무효화 실패는 치명적이지 않으므로 계속 진행
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json(
      {
        success: true,
        message: 'Category updated and all statistics will be recalculated on next page load',
        data: updatedChannel,
        changes: {
          from: oldCategory,
          to: updatedChannel.category_code,
        },
        revalidated: {
          paths: pathsToRevalidate,
          timestamp: new Date().toISOString()
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )

  } catch (error: any) {
    console.error('[Category Update API] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
