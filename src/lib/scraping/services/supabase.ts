// Supabase service for Flippa scraping data

import { createClient } from '@supabase/supabase-js'
import type { 
  FlippaListing, 
  FlippaCategory, 
  ScrapingJob, 
  IndustryStatistics,
  CategoryMapping 
} from '../flippa/types'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Flippa Listings
export const flippaListingsService = {
  // Insert or update listing
  async upsertListing(listing: Partial<FlippaListing>) {
    const { data, error } = await supabaseAdmin
      .from('flippa_listings')
      .upsert({
        listing_id: listing.listingId,
        title: listing.title,
        url: listing.url,
        asking_price: listing.askingPrice,
        monthly_revenue: listing.monthlyRevenue,
        annual_revenue: listing.annualRevenue,
        monthly_profit: listing.monthlyProfit,
        annual_profit: listing.annualProfit,
        revenue_multiple: listing.revenueMultiple,
        profit_multiple: listing.profitMultiple,
        primary_category: listing.primaryCategory,
        sub_category: listing.subCategory,
        industry: listing.industry,
        business_type: listing.businessType,
        monetization_model: listing.monetizationModel,
        site_age_months: listing.siteAgeMonths,
        monthly_visitors: listing.monthlyVisitors,
        page_views: listing.pageViews,
        traffic_sources: listing.trafficSources,
        listing_date: listing.listingDate,
        last_updated: listing.lastUpdated,
        view_count: listing.viewCount,
        watch_count: listing.watchCount,
        bid_count: listing.bidCount,
        is_verified: listing.isVerified,
        seller_rating: listing.sellerRating,
        scraped_at: new Date(),
        scraping_job_id: listing.scrapingJobId,
        data_quality_score: listing.dataQualityScore,
        // Removed is_active - column doesn't exist
        raw_data: listing.rawData
      }, {
        onConflict: 'listing_id'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Batch insert listings
  async upsertListings(listings: Partial<FlippaListing>[]) {
    const records = listings.map(listing => ({
      listing_id: listing.listingId,
      title: listing.title,
      url: listing.url,
      asking_price: listing.askingPrice,
      monthly_revenue: listing.monthlyRevenue,
      annual_revenue: listing.annualRevenue,
      monthly_profit: listing.monthlyProfit,
      annual_profit: listing.annualProfit,
      revenue_multiple: listing.revenueMultiple,
      profit_multiple: listing.profitMultiple,
      primary_category: listing.primaryCategory,
      sub_category: listing.subCategory,
      industry: listing.industry,
      business_type: listing.businessType,
      monetization_model: listing.monetizationModel,
      site_age_months: listing.siteAgeMonths,
      monthly_visitors: listing.monthlyVisitors,
      page_views: listing.pageViews,
      traffic_sources: listing.trafficSources,
      listing_date: listing.listingDate,
      last_updated: listing.lastUpdated,
      view_count: listing.viewCount,
      watch_count: listing.watchCount,
      bid_count: listing.bidCount,
      is_verified: listing.isVerified,
      seller_rating: listing.sellerRating,
      scraped_at: new Date(),
      scraping_job_id: listing.scrapingJobId,
      data_quality_score: listing.dataQualityScore,
      // Removed is_active - column doesn't exist
      raw_data: listing.rawData
    }))

    const { data, error } = await supabaseAdmin
      .from('flippa_listings')
      .upsert(records, { onConflict: 'listing_id' })
      .select()

    if (error) throw error
    return data
  },

  // Get listings by industry
  async getListingsByIndustry(industry: string, limit = 100) {
    const { data, error } = await supabaseAdmin
      .from('flippa_listings')
      .select('*')
      .eq('industry', industry)
      // Removed is_active filter - column doesn't exist
      .order('scraped_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  // Mark listings as unverified (instead of inactive)
  async deactivateListings(listingIds: string[]) {
    const { error } = await supabaseAdmin
      .from('flippa_listings')
      .update({ is_verified: false })
      .in('listing_id', listingIds)

    if (error) throw error
  }
}

// Categories
export const categoriesService = {
  // Get all active categories
  async getActiveCategories() {
    const { data, error } = await supabaseAdmin
      .from('flippa_categories')
      .select('*')
      // Removed is_active filter - check if column exists
      .order('listing_count', { ascending: false })

    if (error) throw error
    return data as FlippaCategory[]
  },

  // Update category listing count
  async updateCategoryCount(flippaSlug: string, count: number) {
    const { error } = await supabaseAdmin
      .from('flippa_categories')
      .update({ 
        listing_count: count,
        last_updated: new Date()
      })
      .eq('flippa_slug', flippaSlug)

    if (error) throw error
  },

  // Bulk insert categories
  async upsertCategories(categories: CategoryMapping[]) {
    const records = categories.map(cat => ({
      flippa_category: cat.flippaCategory,
      flippa_slug: cat.flippaSlug,
      our_industry: cat.ourIndustry,
      is_active: cat.isActive
    }))

    const { error } = await supabaseAdmin
      .from('flippa_categories')
      .upsert(records, { onConflict: 'flippa_slug' })

    if (error) throw error
  }
}

// Scraping Jobs
export const scrapingJobsService = {
  // Create new job
  async createJob(job: Partial<ScrapingJob>) {
    const { data, error } = await supabaseAdmin
      .from('scraping_jobs')
      .insert({
        job_type: job.type || 'listing_scan',
        status: 'pending',
        target: job.targetUrl,
        priority: 0,
        options: job.config || {},
        progress: 0,
        items_processed: 0,
        items_skipped: 0,
        error_count: 0,
        processing_time_ms: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update job status
  async updateJob(jobId: string, updates: Partial<ScrapingJob>) {
    const updateData: any = {
      updated_at: new Date()
    }
    
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.processedItems !== undefined) updateData.items_processed = updates.processedItems
    if (updates.errorCount !== undefined) updateData.error_count = updates.errorCount
    if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt
    if (updates.lastError !== undefined) updateData.error = updates.lastError
    if (updates.results !== undefined) updateData.result = updates.results
    
    // Calculate progress if items are being processed
    if (updates.processedItems !== undefined && updates.totalItems) {
      updateData.progress = Math.round((updates.processedItems / updates.totalItems) * 100)
    }
    
    const { error } = await supabaseAdmin
      .from('scraping_jobs')
      .update(updateData)
      .eq('id', jobId)

    if (error) throw error
  },

  // Get pending jobs
  async getPendingJobs(jobType?: string) {
    let query = supabaseAdmin
      .from('scraping_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (jobType) {
      query = query.eq('job_type', jobType)
    }

    const { data, error } = await query.limit(10)

    if (error) throw error
    return data as ScrapingJob[]
  },

  // Get job by ID
  async getJob(jobId: string) {
    const { data, error } = await supabaseAdmin
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) throw error
    return data as ScrapingJob
  }
}

// Industry Statistics
export const statisticsService = {
  // Calculate and store daily statistics
  async calculateDailyStats(industry: string, date: Date) {
    // Call the Supabase function to calculate statistics
    const { data, error } = await supabaseAdmin
      .rpc('update_industry_statistics', {
        target_date: date.toISOString().split('T')[0]
      })

    if (error) throw error
    return data
  },

  // Get statistics for industry
  async getIndustryStats(industry: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabaseAdmin
      .from('industry_statistics_daily')
      .select('*')
      .eq('industry', industry)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) throw error
    return data as IndustryStatistics[]
  },

  // Get latest statistics for all industries
  async getLatestStats() {
    const { data, error } = await supabaseAdmin
      .from('industry_statistics_daily')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])

    if (error) throw error
    return data as IndustryStatistics[]
  }
}

// Metrics tracking
export const metricsService = {
  // Record metric
  async recordMetric(
    metricType: string, 
    metricName: string, 
    metricValue: number, 
    tags?: Record<string, any>
  ) {
    const { error } = await supabaseAdmin
      .from('scraping_metrics')
      .insert({
        metric_type: metricType,
        metric_name: metricName,
        metric_value: metricValue,
        tags,
        recorded_at: new Date()
      })

    if (error) throw error
  },

  // Get metrics for period
  async getMetrics(metricType: string, hours = 24) {
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hours)

    const { data, error } = await supabaseAdmin
      .from('scraping_metrics')
      .select('*')
      .eq('metric_type', metricType)
      .gte('recorded_at', startTime.toISOString())
      .order('recorded_at', { ascending: false })

    if (error) throw error
    return data
  }
}