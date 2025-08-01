// Bull queue worker for processing Flippa scraping jobs with adaptive scraping
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');
const { redisConnection } = require('../src/lib/redis/connection');
const AdaptiveScraper = require('../src/lib/scraping/adaptive-scraper');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Worker configuration
const WORKER_CONFIG = {
  concurrency: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '3'),
  rateLimitPerMinute: parseInt(process.env.REQUESTS_PER_MINUTE || '20'),
  retryAttempts: 3,
  retryDelay: 5000,
  useAdaptiveScraper: process.env.USE_ADAPTIVE_SCRAPER !== 'false' // Default to true
};

// Debug logging
console.log('🔧 Worker Configuration:');
console.log(`   USE_ADAPTIVE_SCRAPER env: ${process.env.USE_ADAPTIVE_SCRAPER}`);
console.log(`   useAdaptiveScraper: ${WORKER_CONFIG.useAdaptiveScraper}`);
console.log(`   Concurrency: ${WORKER_CONFIG.concurrency}`);
console.log(`   Rate limit: ${WORKER_CONFIG.rateLimitPerMinute} req/min`);

// Initialize adaptive scraper
const adaptiveScraper = WORKER_CONFIG.useAdaptiveScraper ? new AdaptiveScraper({
  headless: true,
  adaptationLevel: process.env.ADAPTATION_LEVEL || 'aggressive',
  learningEnabled: true,
  timeout: 30000
}) : null;

// Create queue instance
const scrapingQueue = new Bull('flippa-scraping', process.env.REDIS_URL, {
  defaultJobOptions: {
    attempts: WORKER_CONFIG.retryAttempts,
    backoff: {
      type: 'exponential',
      delay: WORKER_CONFIG.retryDelay
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Rate limiting
let requestCount = 0;
let lastResetTime = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - lastResetTime > 60000) { // Reset every minute
    requestCount = 0;
    lastResetTime = now;
  }
  return requestCount < WORKER_CONFIG.rateLimitPerMinute;
}

// Process scraping jobs
scrapingQueue.process(WORKER_CONFIG.concurrency, async (job) => {
  const { jobType, category, page, listingId, useAdaptive = WORKER_CONFIG.useAdaptiveScraper } = job.data;
  
  console.log(`📥 Processing job ${job.id}: ${jobType} - ${category || listingId}`);
  console.log(`🤖 Using ${useAdaptive ? 'adaptive' : 'legacy'} scraper`);
  
  try {
    switch (jobType) {
      case 'listing_scan':
      case 'scrape-listings':
        return useAdaptive && adaptiveScraper
          ? await scrapeListingsAdaptive(category, page || 1)
          : await scrapeListings(category, page || 1);
      case 'detail_fetch':
      case 'scrape-detail':
        return useAdaptive && adaptiveScraper
          ? await scrapeListingDetailAdaptive(listingId)
          : await scrapeListingDetail(listingId);
      case 'category_scan':
        // Handle category scanning
        return useAdaptive && adaptiveScraper
          ? await scrapeListingsAdaptive(category, 1)
          : await scrapeListings(category, 1);
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    
    // If adaptive failed, retry with legacy
    if (useAdaptive && job.attemptsMade === 1) {
      console.log('🔄 Retrying with legacy scraper...');
      return await scrapingQueue.add(job.name, { ...job.data, useAdaptive: false });
    }
    
    throw error;
  }
});

// Scrape listings for a category
async function scrapeListings(category, page = 1) {
  // Check rate limit
  if (!checkRateLimit()) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  requestCount++;
  
  const url = `https://flippa.com/search?filter[property_type]=${category}&page=${page}`;
  console.log(`🔍 Scraping ${category} listings (page ${page})`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const listings = [];
    
    $('.ListingResults__listingCard').each((i, elem) => {
      const monthlyRevenue = parsePrice($(elem).find('[data-metric="revenue"]').text());
      const monthlyProfit = parsePrice($(elem).find('[data-metric="profit"]').text());
      const askingPrice = parsePrice($(elem).find('.ListingCard__price').text());
      
      const listing = {
        listing_id: $(elem).attr('data-listing-id') || `scraped_${Date.now()}_${i}`,
        title: $(elem).find('.ListingCard__title').text().trim(),
        url: 'https://flippa.com' + $(elem).find('a').attr('href'),
        asking_price: askingPrice,
        primary_category: category,
        monthly_revenue: monthlyRevenue || null,
        annual_revenue: monthlyRevenue ? monthlyRevenue * 12 : null,
        monthly_profit: monthlyProfit || null,
        annual_profit: monthlyProfit ? monthlyProfit * 12 : null,
        revenue_multiple: monthlyRevenue > 0 ? (askingPrice / (monthlyRevenue * 12)) : null,
        profit_multiple: monthlyProfit > 0 ? (askingPrice / (monthlyProfit * 12)) : null,
        is_verified: false
        // Removed scraped_at - it's auto-generated by database
      };
      
      if (listing.listing_id && listing.asking_price > 0) {
        listings.push(listing);
      }
    });
    
    // Save to database
    if (listings.length > 0) {
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(listings, { onConflict: 'listing_id' });
      
      if (error) throw error;
      
      console.log(`✅ Saved ${listings.length} listings for ${category}`);
    }
    
    return {
      category,
      page,
      count: listings.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Error scraping ${category}:`, error.message);
    throw error;
  }
}

// Scrape individual listing details
async function scrapeListingDetail(listingId) {
  // Check rate limit
  if (!checkRateLimit()) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  requestCount++;
  
  const url = `https://flippa.com/listings/${listingId}`;
  console.log(`🔍 Scraping listing detail: ${listingId}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract detailed information
    const yearEstablished = parseInt($('[data-field="year-established"]').text());
    const currentYear = new Date().getFullYear();
    const siteAgeMonths = yearEstablished ? (currentYear - yearEstablished) * 12 : null;
    
    const details = {
      is_verified: $('.ListingDetail__verified').length > 0,
      site_age_months: siteAgeMonths,
      monthly_visitors: parseInt($('[data-metric="visitors"]').text().replace(/,/g, '')) || null,
      updated_at: new Date().toISOString()
    };
    
    // Update in database
    const { data, error } = await supabase
      .from('flippa_listings')
      .update(details)
      .eq('listing_id', listingId);
    
    if (error) throw error;
    
    console.log(`✅ Updated details for listing ${listingId}`);
    
    return {
      listingId,
      updated: true,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Error scraping listing ${listingId}:`, error.message);
    throw error;
  }
}

// Adaptive scraping functions
async function scrapeListingsAdaptive(category, page = 1) {
  const url = `https://flippa.com/search?filter[property_type]=${category}&page=${page}`;
  console.log(`🔍 Adaptive scraping ${category} listings (page ${page})`);
  console.log(`🌐 URL: ${url}`);
  console.log(`🧠 Adaptive scraper initialized: ${adaptiveScraper ? 'YES' : 'NO'}`);
  
  // Define target data to extract
  const targetData = {
    listings: {
      isArray: true,
      fields: {
        price: { min: 1000, max: 10000000 },
        title: { pattern: '.+' },
        revenue: { min: 0, max: 10000000 },
        profit: { min: 0, max: 10000000 },
        url: { pattern: '^https?://' }
      }
    }
  };
  
  try {
    console.log('📡 Starting adaptive scraping...');
    const result = await adaptiveScraper.scrapeWithAdaptation(url, targetData);
    console.log('📄 Scraping result received');
    console.log(`   Success: ${result.success}`);
    console.log(`   Data found: ${result.data ? 'YES' : 'NO'}`);
    console.log(`   Metadata: ${JSON.stringify(result.metadata)}`);
    
    const listings = [];
    
    // Process adaptive results
    if (result.data && result.data.listings) {
      const extractedListings = Array.isArray(result.data.listings) 
        ? result.data.listings 
        : [result.data];
      
      console.log(`🔍 Found ${extractedListings.length} raw listings`);
      
      for (const item of extractedListings) {
        const listing = {
          listing_id: item.listingId || `adaptive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: item.title?.value || item.title || 'Untitled Listing',
          url: item.url?.value || item.url || url,
          asking_price: item.price?.value || parsePrice(item.price),
          primary_category: category,
          monthly_revenue: item.revenue?.value || null,
          annual_revenue: item.revenue?.value ? item.revenue.value * 12 : null,
          monthly_profit: item.profit?.value || null,
          annual_profit: item.profit?.value ? item.profit.value * 12 : null,
          revenue_multiple: null,
          profit_multiple: null,
          is_verified: false,
          data_quality_score: Math.round(result.metadata?.confidence || 0)
          // Removed scraped_at and non-existent fields
        };
        
        // Calculate multiples
        if (listing.asking_price > 0 && listing.annual_revenue > 0) {
          listing.revenue_multiple = listing.asking_price / listing.annual_revenue;
        }
        if (listing.asking_price > 0 && listing.annual_profit > 0) {
          listing.profit_multiple = listing.asking_price / listing.annual_profit;
        }
        
        if (listing.asking_price > 0) {
          listings.push(listing);
        }
      }
    }
    
    // Save to database
    if (listings.length > 0) {
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(listings, { onConflict: 'listing_id' });
      
      if (error) throw error;
      
      console.log(`✅ Saved ${listings.length} listings for ${category} (adaptive)`);
      console.log(`📊 Extraction confidence: ${result.metadata?.confidence?.toFixed(1)}%`);
    }
    
    return {
      category,
      page,
      count: listings.length,
      method: 'adaptive',
      confidence: result.metadata?.confidence,
      strategies: result.metadata?.strategiesUsed,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Adaptive scraping error for ${category}:`, error.message);
    throw error;
  }
}

async function scrapeListingDetailAdaptive(listingId) {
  const url = `https://flippa.com/listings/${listingId}`;
  console.log(`🔍 Adaptive scraping listing detail: ${listingId}`);
  
  const targetData = {
    verified: { pattern: 'verified|proven' },
    established: { pattern: '\\d{4}' },
    visitors: { min: 0, max: 10000000 },
    price: { min: 1000, max: 10000000 },
    revenue: { min: 0, max: 10000000 }
  };
  
  try {
    const result = await adaptiveScraper.scrapeWithAdaptation(url, targetData);
    
    if (result.data && Object.keys(result.data).length > 0) {
      const yearEstablished = result.data.established?.value 
        ? parseInt(result.data.established.value) 
        : null;
      const currentYear = new Date().getFullYear();
      const siteAgeMonths = yearEstablished ? (currentYear - yearEstablished) * 12 : null;
      
      const details = {
        is_verified: result.data.verified?.value ? true : false,
        site_age_months: siteAgeMonths,
        monthly_visitors: result.data.visitors?.value || null,
        updated_at: new Date().toISOString(),
        extraction_confidence: result.metadata?.confidence || 0
      };
      
      // Update asking price and revenue if found
      if (result.data.price?.value) {
        details.asking_price = result.data.price.value;
      }
      if (result.data.revenue?.value) {
        details.monthly_revenue = result.data.revenue.value;
        details.annual_revenue = result.data.revenue.value * 12;
      }
      
      // Update in database
      const { data, error } = await supabase
        .from('flippa_listings')
        .update(details)
        .eq('listing_id', listingId);
      
      if (error) throw error;
      
      console.log(`✅ Updated details for listing ${listingId} (adaptive)`);
      console.log(`📊 Extraction confidence: ${result.metadata?.confidence?.toFixed(1)}%`);
      
      return {
        listingId,
        updated: true,
        method: 'adaptive',
        confidence: result.metadata?.confidence,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      listingId,
      updated: false,
      method: 'adaptive',
      message: 'No data extracted',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Adaptive detail scraping error for ${listingId}:`, error.message);
    throw error;
  }
}

// Helper function to parse price strings
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

// Queue event handlers
scrapingQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

scrapingQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

scrapingQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

scrapingQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} is waiting`);
});

scrapingQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} started`);
});

scrapingQueue.on('stalled', (job) => {
  console.log(`⚠️ Job ${job.id} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 SIGTERM received, closing queue...');
  await scrapingQueue.close();
  await redisConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📛 SIGINT received, closing queue...');
  await scrapingQueue.close();
  await redisConnection.disconnect();
  process.exit(0);
});

// Worker status display
async function displayWorkerStatus() {
  const counts = await scrapingQueue.getJobCounts();
  console.log('\n📊 Worker Status:');
  console.log(`   Waiting: ${counts.waiting}`);
  console.log(`   Active: ${counts.active}`);
  console.log(`   Completed: ${counts.completed}`);
  console.log(`   Failed: ${counts.failed}`);
  console.log(`   Delayed: ${counts.delayed}`);
  console.log(`   Rate: ${requestCount} requests in last minute`);
  
  // Display adaptive scraper stats if enabled
  if (WORKER_CONFIG.useAdaptiveScraper && adaptiveScraper) {
    const scraperStats = adaptiveScraper.getStats();
    console.log('\n🤖 Adaptive Scraper Stats:');
    console.log(`   Total Scrapes: ${scraperStats.totalScrapes}`);
    console.log(`   Success Rate: ${scraperStats.successRate}`);
    console.log(`   Avg Confidence: ${scraperStats.averageConfidence?.toFixed(1)}%`);
    console.log(`   Adaptations: ${scraperStats.adaptationTriggered}`);
  }
}

// Start worker
async function startWorker() {
  console.log('🤖 Flippa Scraping Worker Starting...');
  console.log('=' .repeat(50));
  console.log(`Concurrency: ${WORKER_CONFIG.concurrency}`);
  console.log(`Rate Limit: ${WORKER_CONFIG.rateLimitPerMinute} req/min`);
  console.log(`Retry Attempts: ${WORKER_CONFIG.retryAttempts}`);
  console.log(`Adaptive Scraper: ${WORKER_CONFIG.useAdaptiveScraper ? 'ENABLED' : 'DISABLED'}`);
  if (WORKER_CONFIG.useAdaptiveScraper) {
    console.log(`Adaptation Level: ${adaptiveScraper?.options.adaptationLevel || 'N/A'}`);
  }
  console.log('=' .repeat(50));
  
  try {
    // Connect to Redis
    await redisConnection.connect();
    console.log('✅ Connected to Redis');
    
    // Display status every 30 seconds
    setInterval(displayWorkerStatus, 30000);
    
    console.log('\n🚀 Worker is ready and processing jobs...\n');
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error.message);
    process.exit(1);
  }
}

// Start the worker
startWorker();