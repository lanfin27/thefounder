/**
 * YouTube Industry Index API - Category Detail
 * GET /api/youtube-industry/categories/[code]
 *
 * 특정 카테고리의 상세 정보와 Top 50 채널 반환 (Supabase 데이터)
 */

import { NextRequest, NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'
import { YCategoryCode, Y_CATEGORIES } from '@/types/youtube-industry'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params
    const categoryCode = code.toUpperCase() as YCategoryCode

    // 유효한 카테고리 코드인지 확인
    if (!Y_CATEGORIES[categoryCode]) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category code',
          message: `Category code '${code}' is not valid. Valid codes: Y01-Y15`
        },
        { status: 400 }
      )
    }

    // Query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    console.log(`[API] Fetching category detail for: ${categoryCode}`)

    // Fetch category from Supabase
    const { data: categoryData, error: categoryError } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .eq('code', categoryCode)
      .single()

    if (categoryError || !categoryData) {
      console.error('[API] Error fetching category:', categoryError)
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
          message: `Category ${categoryCode} not found in database. Please run: npm run yt:import-data`
        },
        { status: 404 }
      )
    }

    // Fetch channels for this category
    const { data: channelsData, error: channelsError } = await ytSupabase
      .from('youtube_channels')
      .select('*')
      .eq('category_code', categoryCode)
      .eq('is_active', true)
      .order('views_per_video', { ascending: false })
      .limit(limit)

    if (channelsError) {
      console.error('[API] Error fetching channels:', channelsError)
    }

    const topChannels = (channelsData || []).map(ch => ({
      id: ch.id,
      channelId: ch.channel_id,
      category: categoryCode,
      name: ch.name,
      handle: ch.handle,
      description: ch.description,
      thumbnailUrl: ch.thumbnail_url,
      subscribers: ch.subscribers,
      totalViews: ch.total_views,
      videoCount: ch.video_count,
      viewsPerVideo: ch.views_per_video,
      dailyChangeRate: ch.daily_change_rate,
      weeklyChangeRate: ch.weekly_change_rate,
      monthlyChangeRate: ch.monthly_change_rate,
      engagementRate: ch.engagement_rate,
      likesPerVideo: ch.likes_per_video,
      commentsPerVideo: ch.comments_per_video,
      shortsCount: ch.shorts_count,
      regularCount: ch.regular_count,
      shortsRatio: ch.shorts_ratio,
      uploadsPerWeek: ch.uploads_per_week,
      lastUploadDate: ch.last_upload_date ? new Date(ch.last_upload_date) : null,
      createdAt: new Date(ch.created_at),
      lastUpdated: new Date(ch.updated_at),
      categoryRank: ch.category_rank,
      overallRank: ch.overall_rank
    }))

    const baseInfo = Y_CATEGORIES[categoryCode]

    const category = {
      code: categoryCode,
      name: categoryData.name,
      nameEn: categoryData.name_en,
      emoji: categoryData.emoji,
      color: categoryData.color,
      description: categoryData.description || baseInfo.description,
      topChannels,
      metrics: {
        totalChannels: categoryData.total_channels,
        totalViews: categoryData.total_views,
        totalVideos: categoryData.total_videos,
        averageViewsPerVideo: categoryData.avg_views_per_video,
        dailyChange: categoryData.daily_change,
        weeklyChange: categoryData.weekly_change,
        monthlyChange: categoryData.monthly_change,
        marketShare: categoryData.market_share,
        volatility: categoryData.volatility
      },
      lastUpdated: new Date(categoryData.updated_at)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          category,
          topChannels,
          metrics: category.metrics
        },
        lastUpdated: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' // 5분 캐시
        }
      }
    )
  } catch (error: any) {
    console.error('[API] Error fetching category detail:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch category detail',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
