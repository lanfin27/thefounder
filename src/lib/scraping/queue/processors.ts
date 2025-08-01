// Job processors for scraping queue

import { Job } from 'bull'
import { FlippaScraper } from '../flippa/scraper'
import { ListingValidator } from '../flippa/validator'
import { 
  flippaListingsService, 
  categoriesService, 
  scrapingJobsService,
  statisticsService,
  metricsService 
} from '../services/supabase'
import { logger, scrapingLogger, PerformanceTracker } from '../utils/logger'
import { TARGET_CATEGORIES } from '../flippa/types'
import type { QueueJobData, ScrapingJob } from '../flippa/types'

// Process different job types
export async function processScrapingJob(job: Job<QueueJobData>) {
  const { jobType, jobId, config } = job.data
  const perf = new PerformanceTracker()

  try {
    // Update job status in database
    await scrapingJobsService.updateJob(jobId, {
      status: 'running',
      startedAt: new Date()
    })

    let result: any

    switch (jobType) {
      case 'category_scan':
        result = await processCategoryScan(job)
        break
      
      case 'listing_scan':
        result = await processListingScan(job)
        break
      
      case 'detail_fetch':
        result = await processDetailFetch(job)
        break
      
      case 'statistics_calc':
        result = await processStatisticsCalc(job)
        break
      
      default:
        throw new Error(`Unknown job type: ${jobType}`)
    }

    // Update job as completed
    await scrapingJobsService.updateJob(jobId, {
      status: 'completed',
      completedAt: new Date(),
      results: result
    })

    // Record metrics
    const perfData = perf.finish()
    await metricsService.recordMetric(
      'job_duration',
      jobType,
      perfData.totalTime,
      { jobId, success: true }
    )

    return result
  } catch (error) {
    // Update job as failed
    await scrapingJobsService.updateJob(jobId, {
      status: 'failed',
      lastError: error instanceof Error ? error.message : String(error),
      retryCount: job.attemptsMade
    })

    // Record failure metric
    await metricsService.recordMetric(
      'job_error',
      jobType,
      1,
      { jobId, error: error instanceof Error ? error.message : String(error) }
    )

    throw error
  }
}

/**
 * Process category scan job
 */
async function processCategoryScan(job: Job<QueueJobData>) {
  const scraper = new FlippaScraper()
  
  try {
    await scraper.initialize()
    
    // Scrape categories
    const categories = await scraper.scrapeCategories()
    
    // Update category counts in database
    for (const category of categories) {
      const mapping = TARGET_CATEGORIES.find(tc => tc.flippaSlug === category.slug)
      if (mapping) {
        await categoriesService.updateCategoryCount(category.slug, category.count || 0)
      }
    }

    // Queue listing scan jobs for each active category
    const activeCategories = await categoriesService.getActiveCategories()
    let jobsQueued = 0

    for (const category of activeCategories) {
      if (category.listingCount > 0) {
        // Create a new listing scan job
        const scanJob = await scrapingJobsService.createJob({
          type: 'listing_scan',
          targetUrl: `https://flippa.com/search?filter[property_type]=${category.flippaSlug}`,
          config: {
            category: category.flippaSlug,
            maxPages: Math.min(10, Math.ceil(category.listingCount / 30))
          }
        })

        // Add to queue
        await job.queue.add({
          jobId: scanJob.id,
          jobType: 'listing_scan',
          config: scanJob.config || {}
        })

        jobsQueued++
      }
    }

    scrapingLogger.categoryScanned('all', categories.length)

    return {
      categoriesFound: categories.length,
      jobsQueued,
      categories: categories.map(c => ({ name: c.name, slug: c.slug, count: c.count }))
    }
  } finally {
    await scraper.close()
  }
}

/**
 * Process listing scan job
 */
async function processListingScan(job: Job<QueueJobData>) {
  const { category, maxPages = 1 } = job.data.config
  const scraper = new FlippaScraper()
  
  try {
    await scraper.initialize()
    
    // Update job progress
    await job.progress(10)
    
    // Scrape listings
    const rawListings = await scraper.scrapeListings(category, maxPages)
    
    await job.progress(50)
    
    // Validate listings
    const { valid, invalid } = ListingValidator.validateBatch(rawListings)
    
    // Save valid listings
    if (valid.length > 0) {
      await flippaListingsService.upsertListings(valid)
    }
    
    await job.progress(80)
    
    // Log validation issues
    for (const { listing, validation } of invalid) {
      scrapingLogger.dataQualityIssue(
        listing.listingId || 'unknown',
        [...validation.errors, ...validation.warnings]
      )
    }
    
    // Queue detail fetch jobs for high-value listings
    let detailJobsQueued = 0
    for (const listing of valid) {
      if (listing.askingPrice > 100000 || listing.isVerified) {
        const detailJob = await scrapingJobsService.createJob({
          type: 'detail_fetch',
          targetUrl: listing.url,
          config: {
            listingId: listing.listingId,
            priority: listing.askingPrice > 500000 ? 'high' : 'normal'
          }
        })

        await job.queue.add({
          jobId: detailJob.id,
          jobType: 'detail_fetch',
          config: detailJob.config || {}
        }, {
          priority: listing.askingPrice > 500000 ? 1 : 5
        })

        detailJobsQueued++
      }
    }
    
    await job.progress(100)
    
    return {
      category,
      listingsScraped: rawListings.length,
      listingsSaved: valid.length,
      listingsInvalid: invalid.length,
      detailJobsQueued,
      metrics: {
        avgAskingPrice: valid.reduce((sum, l) => sum + l.askingPrice, 0) / valid.length,
        verifiedCount: valid.filter(l => l.isVerified).length
      }
    }
  } finally {
    await scraper.close()
  }
}

/**
 * Process detail fetch job
 */
async function processDetailFetch(job: Job<QueueJobData>) {
  const { listingId, url } = job.data.config
  const scraper = new FlippaScraper()
  
  try {
    await scraper.initialize()
    
    // Fetch detailed listing data
    const detailedListing = await scraper.scrapeListingDetails(url || `https://flippa.com/businesses/${listingId}`)
    
    if (detailedListing) {
      // Validate and normalize
      const validation = ListingValidator.validate(detailedListing)
      
      if (validation.isValid) {
        const normalized = ListingValidator.normalize(detailedListing)
        await flippaListingsService.upsertListing(normalized)
        
        return {
          listingId,
          success: true,
          dataQualityScore: validation.dataQualityScore
        }
      } else {
        logger.warn('Invalid detailed listing data', {
          listingId,
          errors: validation.errors
        })
        
        return {
          listingId,
          success: false,
          errors: validation.errors
        }
      }
    }
    
    return {
      listingId,
      success: false,
      error: 'No data retrieved'
    }
  } finally {
    await scraper.close()
  }
}

/**
 * Process statistics calculation job
 */
async function processStatisticsCalc(job: Job<QueueJobData>) {
  const { industry, date = new Date().toISOString().split('T')[0] } = job.data.config
  
  try {
    if (industry) {
      // Calculate for specific industry
      await statisticsService.calculateDailyStats(industry, new Date(date))
      
      return {
        industry,
        date,
        success: true
      }
    } else {
      // Calculate for all industries
      const categories = await categoriesService.getActiveCategories()
      const results = []
      
      for (const category of categories) {
        try {
          await statisticsService.calculateDailyStats(category.ourIndustry, new Date(date))
          results.push({
            industry: category.ourIndustry,
            success: true
          })
        } catch (error) {
          logger.error('Failed to calculate stats for industry', {
            industry: category.ourIndustry,
            error
          })
          results.push({
            industry: category.ourIndustry,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      
      return {
        date,
        totalIndustries: results.length,
        successCount,
        failedCount: results.length - successCount,
        results
      }
    }
  } catch (error) {
    logger.error('Statistics calculation failed', { industry, date, error })
    throw error
  }
}

// Export processor function for Bull
export const scrapingProcessor = processScrapingJob