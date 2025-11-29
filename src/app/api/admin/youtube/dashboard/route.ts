/**
 * YouTube Admin Dashboard API
 * 관리자 대시보드 통계 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { YouTubeAPIQuotaTracker } from '@/lib/youtube/api-quota-tracker'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('[Dashboard API] === REQUEST START ===')

    // 채널 통계 (삭제된 채널 제외)
    const { count: channelCount, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')

    if (channelError) {
      console.warn('[Dashboard API] Channel count error:', channelError)
    }

    const { count: categoryCount, error: categoryError } = await supabase
      .from('youtube_categories')
      .select('*', { count: 'exact', head: true })

    if (categoryError) {
      console.warn('[Dashboard API] Category count error:', categoryError)
    }

    // 최근 작업
    const { data: recentJobs, error: jobsError } = await supabase
      .from('youtube_update_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (jobsError) {
      console.warn('[Dashboard API] Recent jobs error:', jobsError)
    }

    // 실행 중인 작업
    const { data: runningJobs, error: runningError } = await supabase
      .from('youtube_update_jobs')
      .select('*')
      .eq('status', 'running')

    if (runningError) {
      console.warn('[Dashboard API] Running jobs error:', runningError)
    }

    // 활성 스케줄
    const { data: activeSchedules, error: schedulesError } = await supabase
      .from('youtube_schedules')
      .select('*')
      .eq('enabled', true)

    if (schedulesError) {
      console.warn('[Dashboard API] Active schedules error:', schedulesError)
    }

    // 실시간 API 사용량 조회 (새로운 quota tracking 시스템 사용)
    console.log('[Dashboard API] Fetching real-time API usage...')
    const usedToday = await YouTubeAPIQuotaTracker.getTodayUsage()
    const remaining = await YouTubeAPIQuotaTracker.getRemainingQuota()
    const quota = 10000
    const percentage = (usedToday / quota) * 100
    const costPerChannel = YouTubeAPIQuotaTracker.calculateChannelUpdateCost()
    const maxChannels = Math.floor(remaining / costPerChannel)

    console.log('[Dashboard API] API Usage:', {
      used: usedToday,
      remaining,
      percentage: `${percentage.toFixed(1)}%`,
      maxChannels
    })

    const response = {
      totalChannels: channelCount || 0,
      totalCategories: categoryCount || 0,
      apiUsage: {
        used: usedToday,
        limit: quota,
        percentage,
        remaining,
        maxChannels,
        costPerChannel
      },
      activeSchedules: activeSchedules?.length || 0,
      runningJobs: runningJobs?.length || 0,
      recentJobs: recentJobs || []
    }

    console.log('[Dashboard API] ✅ Dashboard response prepared')
    console.log('[Dashboard API] === REQUEST END ===')

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Dashboard API] ❌ Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
