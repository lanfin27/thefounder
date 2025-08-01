// API endpoint for scraping system status
// Returns comprehensive real-time status of the scraping system

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueManager } from '@/lib/scraping/queue/setup'
import { logger } from '@/lib/scraping/utils/logger'
import { isAdminAuthenticated } from '@/lib/auth/admin'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

// GET /api/scraping/status - Get comprehensive scraping system status
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
    const queueStats = await queueManager.getQueueStats()

    // Get recent jobs from queue
    const recentJobs = await queueManager.getJobs(['active', 'completed', 'failed'], 10)
    
    // Create Supabase client
    const supabase = await createClient()

    // Get database statistics
    const [
      { count: totalListings },
      { count: activeListings },
      { data: recentListings },
      { data: jobStats }
    ] = await Promise.all([
      // Total listings count
      supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true }),
      
      // Verified listings count (instead of active)
      supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true),
      
      // Recent listings (last 5)
      supabase
        .from('flippa_listings')
        .select('listing_id, title, asking_price, scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(5),
      
      // Job statistics from database
      supabase
        .from('scraping_jobs')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(100)
    ])

    // Calculate job statistics
    const dbJobStats = {
      total: jobStats?.length || 0,
      pending: jobStats?.filter(j => j.status === 'pending').length || 0,
      running: jobStats?.filter(j => j.status === 'running').length || 0,
      completed: jobStats?.filter(j => j.status === 'completed').length || 0,
      failed: jobStats?.filter(j => j.status === 'failed').length || 0
    }

    // Format recent jobs
    const formattedJobs = recentJobs.map(job => ({
      id: job.id,
      type: job.data.jobType,
      status: job.failedReason ? 'failed' : job.finishedOn ? 'completed' : 'active',
      progress: job.progress(),
      createdAt: new Date(job.timestamp),
      data: {
        jobId: job.data.jobId,
        config: job.data.config
      }
    }))

    // Calculate system health
    const systemHealth = {
      status: queueStats.failed > 10 ? 'warning' : 'healthy',
      queueActive: queueStats.active > 0 || queueStats.waiting > 0,
      databaseConnected: totalListings !== null,
      lastActivity: recentListings?.[0]?.scraped_at || null,
      errorRate: queueStats.total > 0 
        ? Math.round((queueStats.failed / queueStats.total) * 100) 
        : 0
    }

    // Compile comprehensive status
    const status = {
      system: {
        health: systemHealth,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      queue: {
        stats: queueStats,
        recentJobs: formattedJobs
      },
      database: {
        connected: totalListings !== null,
        listings: {
          total: totalListings || 0,
          active: activeListings || 0,
          recent: recentListings || []
        },
        jobs: dbJobStats
      },
      scraping: {
        active: queueStats.active > 0,
        jobsInProgress: queueStats.active,
        jobsWaiting: queueStats.waiting,
        lastRun: formattedJobs[0]?.createdAt || null,
        successRate: queueStats.completed > 0 
          ? Math.round((queueStats.completed / (queueStats.completed + queueStats.failed)) * 100)
          : 0
      }
    }

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: status,
      metadata: {
        timestamp: new Date(),
        version: '1.0.0'
      }
    })

  } catch (error) {
    logger.error('Failed to get scraping status', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}