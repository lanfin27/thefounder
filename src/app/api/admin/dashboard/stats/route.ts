/**
 * Admin Dashboard Stats API
 * 관리자 대시보드 통계 API
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 전체 채널 수
    const { count: totalChannels } = await supabase
      .from('youtube_channels')
      .select('*', { count: 'exact', head: true })

    // 전체 카테고리 수
    const { count: totalCategories } = await supabase
      .from('youtube_categories')
      .select('*', { count: 'exact', head: true })

    // 오늘의 API 사용량
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: apiLogs } = await supabase
      .from('youtube_api_logs')
      .select('units_used')
      .gte('timestamp', today.toISOString())

    const apiUsedToday = apiLogs?.reduce((sum, log) => sum + (log.units_used || 0), 0) || 0

    // 활성화된 스케줄 수
    const { count: activeSchedules } = await supabase
      .from('youtube_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true)

    // 최근 업데이트 작업
    const { data: recentJobs } = await supabase
      .from('youtube_update_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    // 실행 중인 작업
    const { count: runningJobs } = await supabase
      .from('youtube_update_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running')

    return NextResponse.json({
      totalChannels: totalChannels || 0,
      totalCategories: totalCategories || 0,
      apiUsedToday,
      apiLimit: 10000,
      activeSchedules: activeSchedules || 0,
      recentJobs: recentJobs || [],
      runningJobs: runningJobs || 0
    })
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
