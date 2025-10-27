/**
 * YouTube Industry Index API - Categories
 * GET /api/youtube-industry/categories
 *
 * 모든 Y코드 카테고리와 산업 지표 반환 (Supabase 데이터)
 */

import { NextRequest, NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'
import { Y_CATEGORIES, YCategory, YCategoryCode } from '@/types/youtube-industry'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const searchParams = request.nextUrl.searchParams
    const includeChannels = searchParams.get('includeChannels') === 'true'

    console.log('[Categories API] 🚀 Starting request...', { includeChannels })
    console.log('[Categories API] 📡 ytSupabase client:', {
      exists: !!ytSupabase,
      type: typeof ytSupabase
    })

    // Fetch categories from Supabase
    console.log('[Categories API] 📂 Querying youtube_categories table...')
    const { data: categoriesData, error: categoriesError } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .order('code')

    const queryTime = Date.now() - startTime
    console.log(`[Categories API] 📊 Query completed in ${queryTime}ms`)
    console.log('[Categories API] 📊 Result:', {
      hasError: !!categoriesError,
      hasData: !!categoriesData,
      dataLength: categoriesData?.length || 0,
      dataType: Array.isArray(categoriesData) ? 'array' : typeof categoriesData
    })

    if (categoriesError) {
      console.error('[Categories API] ❌ Error fetching categories:', categoriesError)
      throw categoriesError
    }

    if (!categoriesData || categoriesData.length === 0) {
      console.warn('[Categories API] ⚠️ No categories found in database')
      return NextResponse.json(
        {
          success: false,
          error: 'No categories found. Please run: npm run yt:import-data',
          data: []
        },
        { status: 404 }
      )
    }

    console.log(`[Categories API] ✅ Found ${categoriesData.length} categories`)

    // 🔥 Transform to YCategory format using ACTUAL database schema
    const categories: YCategory[] = []

    for (const cat of categoriesData) {
      const code = cat.code as YCategoryCode
      const baseInfo = Y_CATEGORIES[code]

      let topChannels = []

      if (includeChannels) {
        const { data: channelsData } = await ytSupabase
          .from('youtube_channels')
          .select('*')
          .eq('category_code', code)
          .eq('is_active', true)
          .neq('status', 'deleted')
          .order('views_per_video', { ascending: false })
          .limit(50)

        topChannels = channelsData || []
      }

      // Calculate aggregate metrics from channels if not in categories table
      const categoryChannels = includeChannels ? topChannels : []
      const totalChannels = categoryChannels.length
      const totalViews = categoryChannels.reduce((sum: number, ch: any) => sum + (ch.total_views || 0), 0)
      const totalVideos = categoryChannels.reduce((sum: number, ch: any) => sum + (ch.video_count || 0), 0)

      categories.push({
        code,
        name: cat.name || baseInfo?.name || code,
        nameEn: baseInfo?.nameEn || cat.name || code,  // Fallback to baseInfo or name
        emoji: cat.icon || baseInfo?.emoji || '📊',    // 🔥 Use 'icon' from DB, not 'emoji'
        color: baseInfo?.color || '#3b82f6',           // Get from baseInfo
        description: cat.description || baseInfo?.description || '',
        topChannels: topChannels.map((ch: any) => ({
          id: ch.id,
          channelId: ch.channel_id,
          category: code,
          name: ch.name,
          handle: ch.handle,
          description: ch.description,
          thumbnailUrl: ch.thumbnail_url,
          subscribers: ch.subscribers,
          totalViews: ch.total_views,
          videoCount: ch.video_count,
          viewsPerVideo: ch.views_per_video,
          dailyChangeRate: ch.daily_change_rate || 0,
          weeklyChangeRate: ch.weekly_change_rate || 0,
          monthlyChangeRate: ch.monthly_change_rate || 0,
          engagementRate: ch.engagement_rate || 0,
          likesPerVideo: ch.likes_per_video || 0,
          commentsPerVideo: ch.comments_per_video || 0,
          shortsCount: ch.shorts_count || 0,
          regularCount: ch.regular_count || 0,
          shortsRatio: ch.shorts_ratio || 0,
          uploadsPerWeek: ch.uploads_per_week || 0,
          lastUploadDate: ch.last_upload_date ? new Date(ch.last_upload_date) : null,
          createdAt: new Date(ch.created_at),
          lastUpdated: new Date(ch.updated_at),
          categoryRank: ch.category_rank || 0,
          overallRank: ch.overall_rank || 0
        })),
        metrics: {
          totalChannels: totalChannels || 0,
          totalViews: totalViews || 0,
          totalVideos: totalVideos || 0,
          averageViewsPerVideo: cat.avg_views_per_video || 0,           // 🔥 Use actual column name
          dailyChange: cat.daily_change_rate || 0,                      // 🔥 Use actual column name
          weeklyChange: cat.weekly_change_rate || 0,                    // 🔥 Use actual column name
          monthlyChange: 0,  // Not in current schema
          marketShare: 0,    // Not in current schema
          volatility: 0      // Not in current schema
        },
        lastUpdated: new Date(cat.updated_at)
      })
    }

    console.log(`[API] Successfully fetched ${categories.length} categories`)

    return NextResponse.json(
      {
        success: true,
        data: categories,
        totalCategories: categories.length,
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
    console.error('[API] Error in categories route:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch categories',
        data: []
      },
      { status: 500 }
    )
  }
}
