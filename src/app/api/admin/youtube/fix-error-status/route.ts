/**
 * Fix Error Status API
 * 최근 Job에서 실패한 채널들의 상태를 에러로 설정하는 일회성 스크립트
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  console.log('[Fix Error Status] === START ===')

  try {
    // 1. 최근 업데이트 작업 가져오기
    const { data: latestJob, error: jobError } = await supabase
      .from('youtube_update_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (jobError || !latestJob) {
      console.error('[Fix Error Status] Failed to fetch latest job:', jobError)
      throw new Error('Failed to fetch latest job')
    }

    console.log('[Fix Error Status] Latest job:', {
      id: latestJob.id,
      status: latestJob.status,
      created_at: latestJob.created_at,
      processed: latestJob.processed_channels,
      total: latestJob.total_channels
    })

    // 2. Job의 에러 정보 확인
    const errors = latestJob.errors
    console.log('[Fix Error Status] Errors:', errors)

    if (!errors || !errors.breakdown) {
      console.log('[Fix Error Status] No error breakdown found')
      return NextResponse.json({
        success: true,
        message: 'No failed channels to fix',
        jobId: latestJob.id
      })
    }

    // 3. 실패한 채널 ID 추출
    const errorBreakdown = errors.breakdown || {}
    const errorDetails = errors.details || {}

    const allFailedChannelIds: string[] = []

    // 각 에러 타입별 채널 ID 수집
    if (errorDetails.notFound) allFailedChannelIds.push(...errorDetails.notFound)
    if (errorDetails.apiError) allFailedChannelIds.push(...errorDetails.apiError)
    if (errorDetails.databaseError) allFailedChannelIds.push(...errorDetails.databaseError)
    if (errorDetails.quotaExceeded) allFailedChannelIds.push(...errorDetails.quotaExceeded)
    if (errorDetails.other) allFailedChannelIds.push(...errorDetails.other)

    console.log('[Fix Error Status] Failed channel IDs count:', allFailedChannelIds.length)

    if (allFailedChannelIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed channels found in error details',
        jobId: latestJob.id
      })
    }

    // 4. 채널 정보 조회 (channel_id로 실제 id 가져오기)
    const { data: channelsToFix, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('id, channel_id, name, title')
      .in('channel_id', allFailedChannelIds)

    if (channelsError) {
      console.error('[Fix Error Status] Failed to fetch channels:', channelsError)
      throw new Error('Failed to fetch channels')
    }

    console.log('[Fix Error Status] Channels to fix:', channelsToFix?.length || 0)

    if (!channelsToFix || channelsToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No channels found to update',
        jobId: latestJob.id,
        failedChannelIds: allFailedChannelIds.length
      })
    }

    // 5. 각 채널을 에러 상태로 설정
    let successCount = 0
    let failCount = 0
    const failedUpdates: string[] = []

    for (const channel of channelsToFix) {
      try {
        const errorMessage = `Update failed in job ${latestJob.id}`

        const { error: updateError } = await supabase
          .from('youtube_channels')
          .update({
            status: 'error',
            error_message: errorMessage,
            last_error_at: latestJob.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', channel.id)

        if (updateError) {
          console.error(`[Fix Error Status] ✗ Failed to update ${channel.channel_id}:`, updateError)
          failCount++
          failedUpdates.push(channel.channel_id)
        } else {
          console.log(`[Fix Error Status] ✓ Updated ${channel.name || channel.title || channel.channel_id}`)
          successCount++
        }
      } catch (error) {
        console.error(`[Fix Error Status] ✗ Exception updating ${channel.channel_id}:`, error)
        failCount++
        failedUpdates.push(channel.channel_id)
      }
    }

    console.log('[Fix Error Status] === COMPLETE ===')
    console.log('[Fix Error Status] Success:', successCount)
    console.log('[Fix Error Status] Failed:', failCount)

    return NextResponse.json({
      success: true,
      jobId: latestJob.id,
      totalFailedInJob: allFailedChannelIds.length,
      channelsFound: channelsToFix.length,
      successCount,
      failCount,
      failedUpdates: failCount > 0 ? failedUpdates : undefined
    })

  } catch (error) {
    console.error('[Fix Error Status] ✗ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
