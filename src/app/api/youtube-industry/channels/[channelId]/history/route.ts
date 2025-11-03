import { NextRequest, NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'

interface RouteContext {
  params: {
    channelId: string
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { channelId } = context.params
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || 'all'

  console.log('[Channel History API] 🚀 Fetching:', channelId, 'Period:', period)

  try {
    // 기간 계산
    const daysMap: Record<string, number> = {
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    }

    let data: any[] = []
    let error: any = null
    let startDateStr: string | null = null

    // 기간 필터 적용
    if (period !== 'all' && daysMap[period]) {
      // 특정 기간 (1m, 3m, 6m, 1y)
      const days = daysMap[period]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      startDateStr = startDate.toISOString().split('T')[0]

      console.log('[Channel History API] 📅 Date range:', startDateStr, 'to', new Date().toISOString().split('T')[0])

      // ✅ 1. 기간 내 데이터 조회
      const { data: periodData, error: periodError } = await ytSupabase
        .from('youtube_channel_history')
        .select('date, views_per_video, channel_id')
        .eq('channel_id', channelId)
        .gte('date', startDateStr)
        .order('date', { ascending: true })
        .limit(10000)  // ✅ Supabase 기본 1000개 제한 해제!

      if (periodError) {
        error = periodError
      } else {
        // ✅ 2. 기간 시작 전 마지막 값 조회 (Backward Fill용)
        const { data: previousData, error: previousError } = await ytSupabase
          .from('youtube_channel_history')
          .select('date, views_per_video, channel_id')
          .eq('channel_id', channelId)
          .lt('date', startDateStr)
          .order('date', { ascending: false })
          .limit(1)

        if (previousError) {
          console.log('[Channel History API] ⚠️  No previous data found:', previousError.message)
        }

        // ✅ 3. 이전 데이터가 있으면 앞에 추가
        if (previousData && previousData.length > 0) {
          console.log('[Channel History API] 📌 Previous value:', {
            date: previousData[0].date,
            views_per_video: previousData[0].views_per_video,
          })
          data = [...previousData, ...periodData]
        } else {
          console.log('[Channel History API] ⚠️  No previous data available for Backward Fill')
          data = periodData
        }
      }
    } else {
      // 전체 기간: 실제 데이터의 최소 날짜부터 조회
      console.log('[Channel History API] 📅 Period: ALL - Fetching from earliest available data')

      // 먼저 실제 데이터의 최소 날짜 조회
      const { data: minDateData } = await ytSupabase
        .from('youtube_channel_history')
        .select('date')
        .eq('channel_id', channelId)
        .order('date', { ascending: true })
        .limit(1)

      if (minDateData && minDateData.length > 0) {
        startDateStr = minDateData[0].date
        console.log('[Channel History API] ✅ Earliest date found:', startDateStr)
      } else {
        // 폴백: 데이터가 없으면 10년 전부터
        const tenYearsAgo = new Date()
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
        startDateStr = tenYearsAgo.toISOString().split('T')[0]
        console.log('[Channel History API] ⚠️  No data found, using 10-year fallback:', startDateStr)
      }

      console.log('[Channel History API] 📅 Date range:', startDateStr, 'to', new Date().toISOString().split('T')[0])

      // 전체 데이터 조회
      const result = await ytSupabase
        .from('youtube_channel_history')
        .select('date, views_per_video, channel_id')
        .eq('channel_id', channelId)
        .gte('date', startDateStr)
        .order('date', { ascending: true })
        .limit(10000)  // ✅ Supabase 기본 1000개 제한 해제!

      data = result.data || []
      error = result.error
    }

    if (error) {
      console.error('[Channel History API] ❌ Error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        data: { chartData: [] },
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log('[Channel History API] ⚠️  No history data found for channel:', channelId)

      // ✅ Phase 6: Auto-generate initial history data if missing
      console.log('[Channel History API] 🔧 Attempting to auto-generate initial history data...')

      try {
        // Fetch current channel data
        const { data: channelData, error: channelError } = await ytSupabase
          .from('youtube_channels')
          .select('*')
          .eq('channel_id', channelId)
          .single()

        if (channelError || !channelData) {
          console.error('[Channel History API] ❌ Channel not found:', channelError)
          return NextResponse.json({
            success: false,
            error: 'No history data available and channel not found',
            data: { chartData: [] },
          })
        }

        console.log('[Channel History API] 📊 Channel found, creating initial history entry...')

        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        // Create initial history entry
        const { error: insertError } = await ytSupabase
          .from('youtube_channel_history')
          .insert({
            channel_id: channelData.channel_id,
            category_code: channelData.category_code,
            date: today,
            total_views: channelData.total_views || 0,
            video_count: channelData.video_count || 0,
            views_per_video: channelData.views_per_video || 0,
            subscribers: channelData.subscribers || 0
          })

        if (insertError) {
          console.error('[Channel History API] ⚠️ Failed to create initial history:', insertError)
          return NextResponse.json({
            success: false,
            error: 'No history data available',
            data: { chartData: [] },
          })
        }

        console.log('[Channel History API] ✅ Initial history data created:', {
          channel_id: channelData.channel_id,
          date: today,
          views_per_video: channelData.views_per_video
        })

        // Return the newly created data point
        return NextResponse.json({
          success: true,
          data: {
            chartData: [{
              date: today,
              viewsPerVideo: Number(channelData.views_per_video || 0),
              timestamp: new Date(today).getTime(),
            }]
          },
          meta: {
            channelId,
            period,
            originalCount: 0,
            cleanedCount: 1,
            filteredCount: 0,
            autoGenerated: true,
            dateRange: {
              start: today,
              end: today,
            }
          }
        })

      } catch (autoGenError: any) {
        console.error('[Channel History API] ❌ Auto-generation failed:', autoGenError)
        return NextResponse.json({
          success: false,
          error: 'No history data available',
          data: { chartData: [] },
        })
      }
    }

    console.log('[Channel History API] 📊 Raw data:', data.length, 'records')

    // ⚠️ 10,000개 제한에 걸렸는지 확인
    if (data.length === 10000) {
      console.warn('[Channel History API] ⚠️ Hit 10,000 record limit! Some data may be truncated.')
    }

    // ✅ 데이터 정제: null/0/undefined 값 필터링
    const cleanedData = data
      .filter((record: any) => {
        const isValid =
          record.views_per_video != null &&
          record.views_per_video > 0 &&
          record.date != null

        if (!isValid) {
          console.log('[Channel History API] 🔍 Filtered out invalid record:', {
            date: record.date,
            views_per_video: record.views_per_video,
            reason: record.views_per_video == null ? 'null/undefined' :
                    record.views_per_video <= 0 ? 'zero or negative' : 'invalid date'
          })
        }

        return isValid
      })
      .map((record: any) => ({
        date: record.date,
        viewsPerVideo: Number(record.views_per_video),
        timestamp: new Date(record.date).getTime(),
      }))

    const filteredCount = data.length - cleanedData.length

    console.log('[Channel History API] ✅ Cleaned data:', cleanedData.length, 'records')
    if (filteredCount > 0) {
      console.log('[Channel History API] 🗑️  Filtered out:', filteredCount, 'invalid records')
    }

    // 날짜 범위 통계 (all 기간일 때)
    if (period === 'all' && cleanedData.length > 0) {
      const oldestDate = cleanedData[0]?.date
      const newestDate = cleanedData[cleanedData.length - 1]?.date
      const yearSpan = oldestDate && newestDate
        ? ((new Date(newestDate).getTime() - new Date(oldestDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
        : 'N/A'

      console.log(`[Channel History API] 📊 Date range in data:`, {
        channelId,
        oldestDate,
        newestDate,
        yearSpan: `${yearSpan} years`,
        recordCount: cleanedData.length,
      })
    }

    return NextResponse.json({
      success: true,
      data: { chartData: cleanedData },
      meta: {
        channelId,
        period,
        startDate: period === 'all' ? startDateStr : null,
        originalCount: data.length,
        cleanedCount: cleanedData.length,
        filteredCount,
        hitLimit: data.length === 10000,
        dateRange: cleanedData.length > 0 ? {
          start: cleanedData[0]?.date,
          end: cleanedData[cleanedData.length - 1]?.date,
        } : null,
      }
    })

  } catch (error: any) {
    console.error('[Channel History API] ❌ Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      data: { chartData: [] },
    }, { status: 500 })
  }
}
