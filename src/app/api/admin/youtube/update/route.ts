/**
 * YouTube Admin Update API
 * 수동 업데이트 트리거 - 실제 YouTube API 연동
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { YouTubeService } from '@/lib/youtube/youtube-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 1. Validate YouTube API Key first
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('[Update API] YouTube API key is not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube API key is not configured',
          details: 'Please set YOUTUBE_API_KEY in .env.local file'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('[Update API] Update request received:', {
      scope: body.scope,
      categoriesCount: body.categories?.length || 0
    })

    // 새 작업 생성
    const { data: job, error } = await supabase
      .from('youtube_update_jobs')
      .insert({
        type: 'manual',
        update_scope: body.scope || 'incremental',
        target_categories: body.categories || [],
        status: 'pending',
        total_channels: 0,
        processed_channels: 0,
        api_calls_used: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create job:', error)
      throw error
    }

    console.log('Job created:', job)

    // 백그라운드에서 실제 업데이트 시작
    processUpdateJob(job.id, body.scope, body.categories)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: '업데이트가 시작되었습니다'
    })
  } catch (error) {
    console.error('Update API Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to start update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 실제 YouTube API 업데이트 프로세스
 */
async function processUpdateJob(jobId: string, scope: string, categories?: string[]) {
  const service = new YouTubeService()

  try {
    console.log(`[Update Job ${jobId}] Starting YouTube API update`)

    // 작업 시작
    await supabase
      .from('youtube_update_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // 실제 업데이트 수행
    const result = await service.updateAllChannels(
      scope === 'full' ? undefined : categories
    )

    console.log(`[Update Job ${jobId}] ✓ Update completed:`, {
      total: result.total,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors
    })

    // 작업 상태 결정 (부분 성공도 처리)
    let jobStatus: 'completed' | 'failed' = 'completed'
    if (result.updated === 0 && result.failed > 0) {
      jobStatus = 'failed' // 모든 채널 실패
    }

    // 작업 완료
    await supabase
      .from('youtube_update_jobs')
      .update({
        status: jobStatus,
        completed_at: new Date().toISOString(),
        processed_channels: result.updated + result.failed,
        total_channels: result.total,
        api_calls_used: result.updated + (result.errors?.notFound || 0), // 성공 + 404도 API 사용
        progress_details: {
          updated: result.updated,
          failed: result.failed,
          total: result.total,
          errors: result.errors
        },
        errors: result.failed > 0 ? {
          summary: `${result.failed} channels failed to update`,
          breakdown: result.errors,
          details: result.errorDetails
        } : null
      })
      .eq('id', jobId)

    console.log(`[Update Job ${jobId}] Job status updated to: ${jobStatus}`)

  } catch (error: any) {
    console.error(`[Update Job ${jobId}] Job processing failed:`, error)

    // 작업 실패
    await supabase
      .from('youtube_update_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: {
          type: 'UNEXPECTED_ERROR',
          message: error.message || 'Unknown error occurred',
          stack: error.stack
        }
      })
      .eq('id', jobId)
  }
}
