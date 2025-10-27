import { NextRequest, NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'

interface RouteContext {
  params: {
    code: string
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { code: categoryCode } = context.params
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || 'all' // 1m, 3m, 6m, 1y, all

  console.log('[History API] 🚀 Fetching history for:', categoryCode, 'Period:', period)

  try {
    // 기간 계산
    const daysMap: Record<string, number> = {
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    }

    // 쿼리 시작
    let query = ytSupabase
      .from('youtube_channel_history')
      .select('date, category_code, views_per_video')
      .eq('category_code', categoryCode)

    let startDateStr: string | null = null

    // 기간 필터 적용
    if (period !== 'all' && daysMap[period]) {
      // 특정 기간 (1m, 3m, 6m, 1y)
      const days = daysMap[period]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      startDateStr = startDate.toISOString().split('T')[0]

      console.log('[History API] 📅 Date range:', startDateStr, 'to', new Date().toISOString().split('T')[0])
      query = query.gte('date', startDateStr)
    } else {
      // 전체 기간: 최대 10년으로 제한
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      startDateStr = tenYearsAgo.toISOString().split('T')[0]

      console.log('[History API] 🗓️  10-year limit: Fetching data from', startDateStr, 'to today')
      query = query.gte('date', startDateStr)
    }

    // 카테고리별 일별 평균 조회수 조회
    const { data, error } = await query.order('date', { ascending: true })

    if (error) {
      console.error('[History API] ❌ Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log('[History API] ⚠️  No data found, generating sample data...')

      // 데이터가 없으면 샘플 데이터 생성 (테스트용)
      const sampleData = generateSampleData(categoryCode, 30)

      return NextResponse.json({
        success: true,
        data: {
          chartData: sampleData.chartData,
          currentValue: sampleData.currentValue,
          changes: sampleData.changes,
        },
        note: 'Sample data - Run sample data generation script to create real data',
      })
    }

    console.log('[History API] 📊 Raw data:', data.length, 'records')

    // ✅ 데이터 정제: null/0/undefined 값 필터링
    const validData = data.filter((record: any) => {
      const isValid =
        record.views_per_video != null &&
        record.views_per_video > 0 &&
        record.date != null

      if (!isValid) {
        console.log('[History API] 🔍 Filtered out invalid record:', {
          date: record.date,
          views_per_video: record.views_per_video,
          category_code: record.category_code,
        })
      }

      return isValid
    })

    console.log('[History API] ✅ Valid data:', validData.length, 'records')
    console.log('[History API] 🗑️  Filtered out:', data.length - validData.length, 'invalid records')

    // 날짜별로 평균 계산
    const dailyAverages = validData.reduce((acc: any, curr: any) => {
      if (!acc[curr.date]) {
        acc[curr.date] = { total: 0, count: 0 }
      }
      acc[curr.date].total += curr.views_per_video
      acc[curr.date].count += 1
      return acc
    }, {})

    const chartData = Object.entries(dailyAverages)
      .map(([date, value]: [string, any]) => ({
        date,
        viewsPerVideo: Math.round(value.total / value.count),
        timestamp: new Date(date).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // 변화율 계산
    const latest = chartData[chartData.length - 1]?.viewsPerVideo || 0
    const yesterday = chartData[chartData.length - 2]?.viewsPerVideo || 0
    const weekAgo = chartData[chartData.length - 8]?.viewsPerVideo || latest
    const monthAgo = chartData[0]?.viewsPerVideo || latest

    const changes = {
      daily: yesterday ? ((latest - yesterday) / yesterday) * 100 : 0,
      weekly: weekAgo ? ((latest - weekAgo) / weekAgo) * 100 : 0,
      monthly: monthAgo ? ((latest - monthAgo) / monthAgo) * 100 : 0,
    }

    // 10년 제한 통계
    if (period === 'all' && chartData.length > 0) {
      const oldestDate = chartData[0]?.date
      const newestDate = chartData[chartData.length - 1]?.date
      const yearSpan = oldestDate && newestDate
        ? ((new Date(newestDate).getTime() - new Date(oldestDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
        : 'N/A'

      console.log(`[History API] 📊 10-year filtered data:`, {
        categoryCode,
        oldestDate,
        newestDate,
        yearSpan: `${yearSpan} years`,
        recordCount: chartData.length
      })
    }

    console.log('[History API] ✅ Success:', {
      dataPoints: chartData.length,
      latestValue: latest,
      changes,
    })

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        currentValue: latest,
        changes,
      },
      meta: {
        categoryCode,
        period,
        tenYearLimit: period === 'all' ? startDateStr : null,
        recordCount: chartData.length,
        dateRange: chartData.length > 0 ? {
          start: chartData[0]?.date,
          end: chartData[chartData.length - 1]?.date,
        } : null,
      },
    })

  } catch (error) {
    console.error('[History API] ❌ Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 샘플 데이터 생성 함수 (실제 데이터가 없을 때)
function generateSampleData(categoryCode: string, days: number) {
  const chartData = []
  const baseValue = 5000000 + Math.random() * 10000000 // 5M ~ 15M

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    // 랜덤 변동 추가 (±10%)
    const randomVariation = 0.9 + Math.random() * 0.2
    const trendFactor = 1 + (days - i) * 0.001 // 약간의 상승 추세
    const value = Math.round(baseValue * randomVariation * trendFactor)

    chartData.push({
      date: date.toISOString().split('T')[0],
      viewsPerVideo: value,
      timestamp: date.getTime(),
    })
  }

  const latest = chartData[chartData.length - 1].viewsPerVideo
  const yesterday = chartData[chartData.length - 2].viewsPerVideo
  const weekAgo = chartData[chartData.length - 8]?.viewsPerVideo || latest
  const monthAgo = chartData[0].viewsPerVideo

  return {
    chartData,
    currentValue: latest,
    changes: {
      daily: ((latest - yesterday) / yesterday) * 100,
      weekly: ((latest - weekAgo) / weekAgo) * 100,
      monthly: ((latest - monthAgo) / monthAgo) * 100,
    },
  }
}
