/**
 * Admin Update Trigger API
 * 수동 업데이트 트리거 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { YouTubeAPIManager } from '@/lib/youtube/api-manager'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { type = 'manual', scope = 'all', categories = [] } = body

    // 업데이트 작업 생성
    const { data: job, error: jobError } = await supabase
      .from('youtube_update_jobs')
      .insert({
        type,
        update_scope: scope,
        target_categories: categories.length > 0 ? categories : null,
        status: 'pending',
        total_channels: 0,
        processed_channels: 0,
        api_calls_used: 0
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`)
    }

    // 백그라운드에서 업데이트 실행
    // 실제 운영 환경에서는 Queue 시스템 사용 권장
    processUpdateJob(job.id, scope, categories).catch(error => {
      console.error('Update job failed:', error)
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Update job started'
    })
  } catch (error) {
    console.error('Failed to trigger update:', error)
    return NextResponse.json(
      { error: 'Failed to trigger update' },
      { status: 500 }
    )
  }
}

async function processUpdateJob(jobId: string, scope: string, categories: string[]) {
  const supabase = await createClient()
  const apiManager = new YouTubeAPIManager()

  try {
    // 작업 시작
    await supabase
      .from('youtube_update_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // 대상 채널 가져오기
    let query = supabase
      .from('youtube_channels')
      .select('channel_id, category_code')

    if (scope !== 'all' && categories.length > 0) {
      query = query.in('category_code', categories)
    }

    const { data: channels } = await query

    if (!channels || channels.length === 0) {
      throw new Error('No channels to update')
    }

    // 총 채널 수 업데이트
    await supabase
      .from('youtube_update_jobs')
      .update({ total_channels: channels.length })
      .eq('id', jobId)

    let processedCount = 0
    let apiCallsUsed = 0

    // 채널 데이터 업데이트
    for (const channel of channels) {
      try {
        const data = await apiManager.getChannelData(channel.channel_id)

        if (data) {
          // 채널 데이터 업데이트
          await supabase
            .from('youtube_channels')
            .update({
              title: data.title,
              subscribers: data.subscribers,
              total_views: data.total_views,
              video_count: data.video_count,
              updated_at: new Date().toISOString()
            })
            .eq('channel_id', channel.channel_id)
        }

        processedCount++
        apiCallsUsed++

        // 진행률 업데이트 (매 10개 채널마다)
        if (processedCount % 10 === 0) {
          await supabase
            .from('youtube_update_jobs')
            .update({
              processed_channels: processedCount,
              api_calls_used: apiCallsUsed
            })
            .eq('id', jobId)
        }
      } catch (error) {
        console.error(`Failed to update channel ${channel.channel_id}:`, error)
      }
    }

    // 작업 완료
    await supabase
      .from('youtube_update_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_channels: processedCount,
        api_calls_used: apiCallsUsed
      })
      .eq('id', jobId)
  } catch (error) {
    console.error('Job processing failed:', error)

    // 작업 실패
    await supabase
      .from('youtube_update_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: { message: error instanceof Error ? error.message : 'Unknown error' }
      })
      .eq('id', jobId)
  }
}
