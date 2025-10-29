/**
 * Admin Category Management API - Individual Category
 * PUT /api/admin/youtube-industry/categories/[code] - 카테고리 수정
 * DELETE /api/admin/youtube-industry/categories/[code] - 카테고리 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

interface RouteContext {
  params: {
    code: string
  }
}

// PUT: 카테고리 수정
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { code } = context.params
    const body = await request.json()
    const { name, icon, description } = body

    console.log('[Admin Category API] Updating category:', code, body)

    // 카테고리 존재 확인
    const { data: existing, error: fetchError } = await ytSupabaseAdmin
      .from('youtube_categories')
      .select('*')
      .eq('code', code)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // 업데이트 데이터 준비
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (icon !== undefined) updateData.icon = icon
    if (description !== undefined) updateData.description = description

    // 업데이트 실행
    const { data: updated, error } = await ytSupabaseAdmin
      .from('youtube_categories')
      .update(updateData)
      .eq('code', code)
      .select()
      .single()

    if (error) {
      console.error('[Admin Category API] Update error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[Admin Category API] ✅ Category updated: ${code} - ${updated.name} ${updated.icon}`)

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: updated,
      changes: {
        from: existing,
        to: updated,
      },
    })
  } catch (error: any) {
    console.error('[Admin Category API] PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: 카테고리 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { code } = context.params

    console.log('[Admin Category API] Deleting category:', code)

    // 카테고리 존재 확인
    const { data: existing } = await ytSupabaseAdmin
      .from('youtube_categories')
      .select('*')
      .eq('code', code)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // 해당 카테고리를 사용 중인 채널 수 확인
    const { count: channelCount } = await ytSupabaseAdmin
      .from('youtube_channels')
      .select('*', { count: 'exact', head: true })
      .eq('category_code', code)
      .eq('is_active', true)

    if (channelCount && channelCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category. ${channelCount} active channels are using this category.`,
          channelCount,
        },
        { status: 409 }
      )
    }

    // 카테고리 삭제 (실제 삭제, soft delete 아님)
    const { error } = await ytSupabaseAdmin
      .from('youtube_categories')
      .delete()
      .eq('code', code)

    if (error) {
      console.error('[Admin Category API] Delete error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[Admin Category API] ✅ Category deleted: ${code}`)

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      data: existing,
    })
  } catch (error: any) {
    console.error('[Admin Category API] DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
