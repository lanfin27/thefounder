// API endpoints for queue management

import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/scraping/queue/setup'
import { logger } from '@/lib/scraping/utils/logger'
import { isAdminAuthenticated } from '@/lib/auth/admin'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

// GET /api/scraping/queue - Get queue statistics
export async function GET(request: NextRequest) {
  try {
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token'
      }, { status: 401 })
    }

    // Get queue statistics
    const stats = await queueManager.getQueueStats()

    // Get recent jobs
    const recentJobs = await queueManager.getJobs(['active', 'waiting', 'failed'], 20)

    const formattedJobs = recentJobs.map(job => ({
      id: job.id,
      data: job.data,
      status: job.opts.delay ? 'delayed' : 'waiting',
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      processedOn: job.processedOn ? new Date(job.processedOn) : null
    }))

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: {
        stats,
        recentJobs: formattedJobs
      },
      metadata: {
        timestamp: new Date()
      }
    })
  } catch (error) {
    logger.error('Failed to get queue statistics', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/scraping/queue - Queue management actions
export async function POST(request: NextRequest) {
  try {
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token'
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'pause':
        await queueManager.pause()
        return NextResponse.json<ScrapingApiResponse>({
          success: true,
          data: { message: 'Queue paused' }
        })

      case 'resume':
        await queueManager.resume()
        return NextResponse.json<ScrapingApiResponse>({
          success: true,
          data: { message: 'Queue resumed' }
        })

      case 'retry-failed':
        const retried = await queueManager.retryFailedJobs()
        return NextResponse.json<ScrapingApiResponse>({
          success: true,
          data: { 
            message: `${retried} failed jobs retried`,
            retriedCount: retried
          }
        })

      case 'clean':
        await queueManager.cleanJobs()
        return NextResponse.json<ScrapingApiResponse>({
          success: true,
          data: { message: 'Old jobs cleaned' }
        })

      default:
        return NextResponse.json<ScrapingApiResponse>({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    logger.error('Failed to perform queue action', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}