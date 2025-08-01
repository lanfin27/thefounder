// Test endpoint for scraping system

import { NextRequest, NextResponse } from 'next/server'
import { FlippaScraper } from '@/lib/scraping/flippa/scraper'
import { ListingValidator } from '@/lib/scraping/flippa/validator'
import { logger } from '@/lib/scraping/utils/logger'
import type { ScrapingApiResponse } from '@/lib/scraping/flippa/types'

// GET /api/scraping/test - Test scraping functionality
export async function GET(request: NextRequest) {
  try {
    // Check for admin token in headers
    const adminToken = request.headers.get('x-admin-token')
    
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json<ScrapingApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get test type from query
    const searchParams = request.nextUrl.searchParams
    const testType = searchParams.get('type') || 'basic'

    const scraper = new FlippaScraper({
      headless: true,
      timeout: 30000
    })

    let result: any = {}

    try {
      await scraper.initialize()
      logger.info('Scraper initialized for testing')

      switch (testType) {
        case 'categories':
          // Test category scraping
          const categories = await scraper.scrapeCategories()
          result = {
            testType: 'categories',
            success: true,
            categoriesFound: categories.length,
            categories: categories.slice(0, 5) // First 5 categories
          }
          break

        case 'listings':
          // Test listing scraping
          const category = searchParams.get('category') || 'saas'
          const rawListings = await scraper.scrapeListings(category, 1)
          const { valid, invalid } = ListingValidator.validateBatch(rawListings)
          
          result = {
            testType: 'listings',
            success: true,
            category,
            totalScraped: rawListings.length,
            validListings: valid.length,
            invalidListings: invalid.length,
            sampleListing: valid[0] || null,
            validationErrors: invalid.slice(0, 3).map(({ listing, validation }) => ({
              listingId: listing.listingId,
              errors: validation.errors
            }))
          }
          break

        case 'detail':
          // Test detail fetching
          const url = searchParams.get('url')
          if (!url) {
            throw new Error('URL parameter required for detail test')
          }
          
          const detailListing = await scraper.scrapeListingDetails(url)
          const validation = detailListing ? ListingValidator.validate(detailListing) : null
          
          result = {
            testType: 'detail',
            success: !!detailListing,
            url,
            listing: detailListing,
            validation
          }
          break

        default:
          // Basic connectivity test
          result = {
            testType: 'basic',
            success: true,
            message: 'Scraper initialized successfully',
            config: {
              headless: true,
              userAgent: 'Test'
            }
          }
      }

      await scraper.close()
      
      logger.info('Scraping test completed', { testType, success: true })

      return NextResponse.json<ScrapingApiResponse>({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          duration: Date.now()
        }
      })
    } catch (error) {
      await scraper.close()
      throw error
    }
  } catch (error) {
    logger.error('Scraping test failed', error)
    return NextResponse.json<ScrapingApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 })
  }
}