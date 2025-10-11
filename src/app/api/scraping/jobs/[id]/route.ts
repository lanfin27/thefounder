// API endpoints for individual scraping job management

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueManager } from '@/lib/scraping/queue/setup'
import { scrapingJobsService } from '@/lib/scraping/services/supabase'
import { logger } from '@/lib/scraping/utils/logger'
import { isAdminAuthenticated } from '@/lib/auth/admin'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/scraping/jobs/[id] - Get job details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token'
      }, { status: 401 })
    }

    // Get job from database
    const job = await scrapingJobsService.getJob(id)
    
    if (!job) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    // Get queue job status if available
    let queueJob = null
    if (job.config?.queueJobId) {
      queueJob = await queueManager.getJob(job.config.queueJobId)
    }

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: {
        job,
        queueStatus: queueJob ? {
          id: queueJob.id,
          progress: queueJob.progress(),
          attemptsMade: queueJob.attemptsMade,
          finishedOn: queueJob.finishedOn,
          processedOn: queueJob.processedOn
        } : null
      },
      metadata: {
        timestamp: new Date()
      }
    })
  } catch (error) {
    logger.error('Failed to get scraping job', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/scraping/jobs/[id] - Cancel job
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token'
      }, { status: 401 })
    }

    // Get job from database
    const job = await scrapingJobsService.getJob(id)
    
    if (!job) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    // Check if job can be cancelled
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Cannot cancel completed or failed job'
      }, { status: 400 })
    }

    // Remove from queue if exists
    if (job.config?.queueJobId) {
      const queueJob = await queueManager.getJob(job.config.queueJobId)
      if (queueJob) {
        await queueJob.remove()
      }
    }

    // Update job status
    await scrapingJobsService.updateJob(id, {
      status: 'failed',
      lastError: 'Cancelled by user',
      completedAt: new Date()
    })

    logger.info('Scraping job cancelled', { jobId: id })

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: { message: 'Job cancelled successfully' },
      metadata: {
        timestamp: new Date()
      }
    })
  } catch (error) {
    logger.error('Failed to cancel scraping job', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}