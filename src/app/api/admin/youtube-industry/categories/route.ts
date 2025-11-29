/**
 * Admin Category Management API
 * GET /api/admin/youtube-industry/categories - 모든 카테고리 조회
 * POST /api/admin/youtube-industry/categories - 새 카테고리 추가
 */

import { NextRequest, NextResponse } from 'next/server'
import { ytSupabase, ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: 모든 카테고리 조회 (채널 수 포함)
export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Categories API] Fetching all categories...')

    const { data: categories, error } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .order('code', { ascending: true })

    if (error) {
      console.error('[Admin Categories API] Fetch error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[Admin Categories API] ✅ Found ${categories.length} categories`)

    // 각 카테고리별 채널 수 집계
    console.log('[Admin Categories API] 📊 Counting channels per category...')
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const { count, error: countError } = await ytSupabase
          .from('youtube_channels')
          .select('*', { count: 'exact', head: true })
          .eq('category_code', category.code)

        if (countError) {
          console.error(`[Admin Categories API] Count error for ${category.code}:`, countError)
          return { ...category, channel_count: 0 }
        }

        return { ...category, channel_count: count || 0 }
      })
    )

    console.log(`[Admin Categories API] ✅ Aggregated channel counts:`,
      categoriesWithCount.map(c => `${c.code}: ${c.channel_count}`).join(', '))

    return NextResponse.json({
      success: true,
      data: categoriesWithCount,
      count: categoriesWithCount.length,
    })
  } catch (error: any) {
    console.error('[Admin Categories API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 새 카테고리 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, icon, description } = body

    console.log('[Admin Categories API] Creating new category:', { code, name, icon })

    // 입력 검증
    if (!code || !name || !icon) {
      return NextResponse.json(
        { success: false, error: 'Code, name, and icon are required' },
        { status: 400 }
      )
    }

    // 코드 형식 검증 (Y + 숫자 2자리)
    if (!code.match(/^Y\d{2}$/)) {
      return NextResponse.json(
        { success: false, error: 'Code must be in format Y01-Y99' },
        { status: 400 }
      )
    }

    // 코드 중복 확인
    const { data: existing } = await ytSupabaseAdmin
      .from('youtube_categories')
      .select('code')
      .eq('code', code)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Category code already exists' },
        { status: 409 }
      )
    }

    // 카테고리 생성
    const { data: newCategory, error } = await ytSupabaseAdmin
      .from('youtube_categories')
      .insert({
        code,
        name,
        icon,
        description: description || '',
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Categories API] Create error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[Admin Categories API] ✅ Category created: ${code} - ${name} ${icon}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Category created successfully',
        data: newCategory,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Admin Categories API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
