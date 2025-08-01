// API endpoints for scraping job management

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueManager } from '@/lib/scraping/queue/setup'
import { scrapingJobsService } from '@/lib/scraping/services/supabase'
import { logger } from '@/lib/scraping/utils/logger'
import { isAdminAuthenticated, getAuthDebugInfo } from '@/lib/auth/admin'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

// GET /api/scraping/jobs - List scraping jobs
export async function GET(request: NextRequest) {
  try {
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      const debugInfo = getAuthDebugInfo(request)
      logger.warn('Authentication failed', debugInfo)
      
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token',
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
      }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const jobType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Create Supabase client
    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('scraping_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }
    if (jobType) {
      query = query.eq('job_type', jobType)
    }

    const { data: jobs, error } = await query

    if (error) throw error

    // Get queue stats
    const queueStats = await queueManager.getQueueStats()

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: {
        jobs,
        queueStats
      },
      metadata: {
        timestamp: new Date(),
        count: jobs?.length || 0
      }
    })
  } catch (error) {
    logger.error('Failed to list scraping jobs', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/scraping/jobs - Create new scraping job
export async function POST(request: NextRequest) {
  try {
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      const debugInfo = getAuthDebugInfo(request)
      logger.warn('Authentication failed', debugInfo)
      
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token',
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { jobType, config = {} } = body

    if (!jobType) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Job type is required'
      }, { status: 400 })
    }

    // Validate job type
    const validJobTypes = ['category_scan', 'listing_scan', 'detail_fetch', 'statistics_calc']
    if (!validJobTypes.includes(jobType)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Invalid job type'
      }, { status: 400 })
    }

    // Create job in database
    const dbJob = await scrapingJobsService.createJob({
      type: jobType,
      config
    })

    // Add to queue
    const queueJob = await queueManager.addJob(jobType, {
      ...config,
      jobId: dbJob.id
    })

    logger.info('Scraping job created', {
      jobId: dbJob.id,
      queueJobId: queueJob.id,
      jobType
    })

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: {
        job: dbJob,
        queueJobId: queueJob.id
      },
      metadata: {
        timestamp: new Date()
      }
    })
  } catch (error) {
    logger.error('Failed to create scraping job', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}