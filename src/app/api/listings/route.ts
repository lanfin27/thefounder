// API endpoint for fetching Flippa listings
// Returns paginated listings data from the database

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminAuthenticated } from '@/lib/auth/admin'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

// Simple console logger as fallback
const logger = {
  error: (message: string, error: any) => {
    console.error(`[API Error] ${message}:`, error)
  },
  info: (message: string, data?: any) => {
    console.log(`[API Info] ${message}`, data || '')
  }
}

// GET /api/listings - Get Flippa listings with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Check admin token authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Authentication required - check admin token'
      }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'scraped_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const isVerified = searchParams.get('verified') === 'true' // Filter by verified status instead
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : null
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : null

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Invalid pagination parameters'
      }, { status: 400 })
    }

    // Create Supabase client
    let supabase
    try {
      supabase = await createClient()
    } catch (dbError) {
      logger.error('Failed to create Supabase client', dbError)
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 })
    }

    // Build query
    let query = supabase
      .from('flippa_listings')
      .select('*', { count: 'exact' })

    // Apply filters - removed is_active filter since column doesn't exist
    if (isVerified) {
      query = query.eq('is_verified', true)
    }

    if (category) {
      query = query.eq('primary_category', category)
    }

    if (minPrice !== null) {
      query = query.gte('asking_price', minPrice)
    }

    if (maxPrice !== null) {
      query = query.lte('asking_price', maxPrice)
    }

    // Apply sorting
    const validSortFields = ['scraped_at', 'asking_price', 'monthly_revenue', 'listing_date', 'view_count']
    if (validSortFields.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('scraped_at', { ascending: false })
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: listings, error, count } = await query

    if (error) {
      logger.error('Database query error', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    // Handle empty results gracefully
    const safeListings = listings || []
    const safeCount = count || 0

    // Get category statistics - with error handling
    let categoryCounts: Record<string, number> = {}
    try {
      const { data: categoryStats, error: catError } = await supabase
        .from('flippa_listings')
        .select('primary_category')
        // Removed is_active filter - get all categories
        .order('primary_category')
      
      if (!catError && categoryStats) {
        categoryStats.forEach(item => {
          const cat = item.primary_category || 'uncategorized'
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        })
      }
    } catch (catError) {
      logger.error('Category stats error', catError)
      // Continue without category stats
    }

    // Calculate metadata
    const totalPages = Math.ceil(safeCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Format response
    const response = {
      listings: safeListings,
      pagination: {
        page,
        limit,
        total: safeCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        category,
        isVerified,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      },
      categories: Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count),
      summary: {
        totalListings: safeCount,
        averagePrice: safeListings.length > 0
          ? Math.round(safeListings.reduce((sum, l) => sum + (l.asking_price || 0), 0) / safeListings.length)
          : 0,
        lastUpdated: safeListings.length > 0 ? safeListings[0]?.scraped_at || null : null
      }
    }

    return NextResponse.json<ScrapingApiResponse>({
      success: true,
      data: response,
      metadata: {
        timestamp: new Date(),
        processingTime: 0 // Simplified to avoid type casting issues
      }
    })

  } catch (error) {
    logger.error('Failed to fetch listings', error)
    
    // More detailed error response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = {
      message: errorMessage,
      type: error?.constructor?.name || 'UnknownError',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString()
    }
    
    console.error('Listings API Error Details:', errorDetails)
    
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 })
  }
}