/**
 * YouTube Admin Dashboard API
 * 관리자 대시보드 통계 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('Dashboard API called')

    // API 설정 조회
    const { data: apiConfig, error: apiConfigError } = await supabase
      .from('youtube_api_config')
      .select('*')
      .eq('is_primary', true)
      .single()

    if (apiConfigError && apiConfigError.code !== 'PGRST116') {
      console.warn('API config error:', apiConfigError)
    }

    // 채널 통계 (삭제된 채널 제외)
    const { count: channelCount, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')

    if (channelError) {
      console.warn('Channel count error:', channelError)
    }

    const { count: categoryCount, error: categoryError } = await supabase
      .from('youtube_categories')
      .select('*', { count: 'exact', head: true })

    if (categoryError) {
      console.warn('Category count error:', categoryError)
    }

    // 최근 작업
    const { data: recentJobs, error: jobsError } = await supabase
      .from('youtube_update_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (jobsError) {
      console.warn('Recent jobs error:', jobsError)
    }

    // 실행 중인 작업
    const { data: runningJobs, error: runningError } = await supabase
      .from('youtube_update_jobs')
      .select('*')
      .eq('status', 'running')

    if (runningError) {
      console.warn('Running jobs error:', runningError)
    }

    // 활성 스케줄
    const { data: activeSchedules, error: schedulesError } = await supabase
      .from('youtube_schedules')
      .select('*')
      .eq('enabled', true)

    if (schedulesError) {
      console.warn('Active schedules error:', schedulesError)
    }

    const response = {
      totalChannels: channelCount || 0,
      totalCategories: categoryCount || 0,
      apiUsage: {
        used: apiConfig?.used_today || 0,
        limit: apiConfig?.daily_limit || 10000,
        percentage: apiConfig ? ((apiConfig.used_today || 0) / (apiConfig.daily_limit || 10000) * 100) : 0
      },
      activeSchedules: activeSchedules?.length || 0,
      runningJobs: runningJobs?.length || 0,
      recentJobs: recentJobs || []
    }

    console.log('Dashboard response:', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
