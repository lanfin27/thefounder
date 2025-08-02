// Flippa Database Manager - Supabase Integration

const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class FlippaDatabaseManager {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'logs/database.log' })
      ]
    });
  }

  async saveListings(listings) {
    const startTime = Date.now();
    
    try {
      // Prepare listings for database
      const dbListings = listings.map(listing => ({
        listing_id: listing.id,
        title: listing.title,
        asking_price: listing.price,
        listing_url: listing.listing_url,
        
        // Financial data
        profit_multiple: listing.multiple,
        revenue_multiple: listing.revenue_multiple,
        monthly_profit: listing.profit_average,
        monthly_revenue: listing.revenue_average,
        ttm_revenue: listing.ttm_revenue,
        
        // Business data
        business_type: listing.property_type,
        industry: listing.category,
        monetization_method: listing.monetization,
        business_age_years: listing.established_at,
        location: listing.country_name,
        
        // Verification data
        traffic_verified: listing.has_verified_traffic || false,
        revenue_verified: listing.has_verified_revenue || false,
        flippa_vetted: listing.manually_vetted || false,
        
        // Quality data
        quality_score: listing._qualityScore,
        extraction_confidence: listing._extractionConfidence,
        
        // Metadata
        raw_data: listing,
        source: 'flippa',
        scraped_at: new Date().toISOString()
      }));
      
      // Upsert listings (update if exists, insert if new)
      const { data, error } = await this.supabase
        .from('scraped_listings')
        .upsert(dbListings, {
          onConflict: 'listing_id',
          returning: 'minimal'
        });
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      this.logger.info('Listings saved successfully', {
        count: dbListings.length,
        duration,
        avgDuration: duration / dbListings.length
      });
      
      return { success: true, count: dbListings.length };
      
    } catch (error) {
      this.logger.error('Failed to save listings', { error: error.message });
      throw error;
    }
  }

  async getExistingListings(listingIds) {
    try {
      const { data, error } = await this.supabase
        .from('scraped_listings')
        .select('listing_id, scraped_at')
        .in('listing_id', listingIds);
      
      if (error) throw error;
      
      return data || [];
      
    } catch (error) {
      this.logger.error('Failed to get existing listings', { error: error.message });
      return [];
    }
  }

  async createScrapingJob(jobData) {
    try {
      const { data, error } = await this.supabase
        .from('scraping_jobs')
        .insert({
          job_type: jobData.type,
          status: 'running',
          started_at: new Date().toISOString(),
          parameters: jobData.parameters || {}
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
      
    } catch (error) {
      this.logger.error('Failed to create scraping job', { error: error.message });
      throw error;
    }
  }

  async updateScrapingJob(jobId, updates) {
    try {
      const { error } = await this.supabase
        .from('scraping_jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (error) throw error;
      
    } catch (error) {
      this.logger.error('Failed to update scraping job', { error: error.message });
    }
  }

  async saveScrapingLog(logData) {
    try {
      await this.supabase
        .from('scraping_logs')
        .insert({
          job_id: logData.jobId,
          level: logData.level,
          message: logData.message,
          metadata: logData.metadata || {},
          created_at: new Date().toISOString()
        });
      
    } catch (error) {
      this.logger.error('Failed to save scraping log', { error: error.message });
    }
  }

  async getScrapingStats(timeframe = '24h') {
    const since = new Date();
    if (timeframe === '24h') since.setHours(since.getHours() - 24);
    else if (timeframe === '7d') since.setDate(since.getDate() - 7);
    else if (timeframe === '30d') since.setDate(since.getDate() - 30);
    
    try {
      const { data: listings, error: listingsError } = await this.supabase
        .from('scraped_listings')
        .select('quality_score, extraction_confidence, scraped_at')
        .gte('scraped_at', since.toISOString());
      
      const { data: jobs, error: jobsError } = await this.supabase
        .from('scraping_jobs')
        .select('status, duration_seconds')
        .gte('started_at', since.toISOString());
      
      if (listingsError || jobsError) throw listingsError || jobsError;
      
      return {
        listings: {
          total: listings?.length || 0,
          avgQuality: listings?.reduce((sum, l) => sum + l.quality_score, 0) / listings?.length || 0,
          avgConfidence: listings?.reduce((sum, l) => sum + l.extraction_confidence, 0) / listings?.length || 0
        },
        jobs: {
          total: jobs?.length || 0,
          successful: jobs?.filter(j => j.status === 'completed').length || 0,
          avgDuration: jobs?.reduce((sum, j) => sum + (j.duration_seconds || 0), 0) / jobs?.length || 0
        }
      };
      
    } catch (error) {
      this.logger.error('Failed to get scraping stats', { error: error.message });
      return null;
    }
  }
}

module.exports = FlippaDatabaseManager;
