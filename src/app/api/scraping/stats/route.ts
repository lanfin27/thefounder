// API endpoints for scraping statistics

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { statisticsService, metricsService } from '@/lib/scraping/services/supabase'
import { logger } from '@/lib/scraping/utils/logger'
import { isAdminAuthenticated } from '@/lib/auth/admin'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

// GET /api/scraping/stats - Get scraping statistics
export async function GET(request: NextRequest) {
  try {
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token'
      }, { status: 401 })
    }
    
    // Get Supabase client for database queries
    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const industry = searchParams.get('industry')
    const days = parseInt(searchParams.get('days') || '30', 10)
    const metricType = searchParams.get('metric')

    let data: any = {}

    // Get industry statistics
    if (industry) {
      data.industryStats = await statisticsService.getIndustryStats(industry, days)
    } else {
      data.latestStats = await statisticsService.getLatestStats()
    }

    // Get metrics if requested
    if (metricType) {
      data.metrics = await metricsService.getMetrics(metricType, days * 24)
    }

    // Get summary statistics
    const { data: summary, error: summaryError } = await supabase
      .from('scraping_jobs')
      .select('status, count')
      .order('created_at', { ascending: false })

    if (!summaryError && summary) {
      const statusCounts = summary.reduce((acc: any, row: any) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {})

      data.jobSummary = {
        total: summary.length,
        ...statusCounts
      }
    }

    // Get listing counts by industry
    const { data: listingCounts, error: countError } = await supabase
      .from('flippa_listings')
      .select('industry, count')
      .eq('is_active', true)

    if (!countError && listingCounts) {
      const industryCounts = listingCounts.reduce((acc: any, row: any) => {
        acc[row.industry] = (acc[row.industry] || 0) + 1
        return acc
      }, {})

      data.listingCounts = industryCounts
    }

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data,
      metadata: {
        timestamp: new Date(),
        days
      }
    })
  } catch (error) {
    logger.error('Failed to get scraping statistics', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}