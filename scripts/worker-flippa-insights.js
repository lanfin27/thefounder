// Insight-driven worker for scheduled Flippa scraping
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const InsightDrivenFlippaScraper = require('./flippa-scraper-insight-driven');
const winston = require('winston');
const Redis = require('ioredis');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/worker-insights.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create Redis clients
const redis = new Redis(redisConfig);
const subscriber = new Redis(redisConfig);

// Create Bull queue
const scrapingQueue = new Bull('flippa-insights-queue', {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return redis;
      case 'subscriber':
        return subscriber;
      default:
        return new Redis(redisConfig);
    }
  }
});

// Job processor
async function processScrapingJob(job) {
  const { type, options } = job.data;
  logger.info(`🔄 Processing job: ${type}`, { jobId: job.id, options });
  
  const scraper = new InsightDrivenFlippaScraper({
    headless: true,
    insightMode: true,
    ...options.scraperOptions
  });
  
  try {
    await scraper.initialize();
    
    let results;
    switch (type) {
      case 'full-scan':
        results = await performFullScan(scraper, options);
        break;
        
      case 'incremental':
        results = await performIncrementalScan(scraper, options);
        break;
        
      case 'quality-check':
        results = await performQualityCheck(scraper, options);
        break;
        
      case 'category-focus':
        results = await performCategoryFocus(scraper, options);
        break;
        
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    
    // Save results to database
    await scraper.saveToDatabase(results.listings);
    
    logger.info(`✅ Job completed successfully`, {
      jobId: job.id,
      listings: results.listings.length,
      quality: results.avgQuality
    });
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    logger.error(`❌ Job failed`, { jobId: job.id, error: error.message });
    throw error;
  } finally {
    await scraper.close();
  }
}

async function performFullScan(scraper, options) {
  logger.info('🔍 Performing full scan with insights');
  
  const listings = await scraper.scrapeWithInsights('https://flippa.com/search', {
    maxPages: options.maxPages || 20,
    filterRecentlySold: true,
    sortBy: 'newest'
  });
  
  const avgQuality = listings.reduce((sum, l) => sum + l._quality_score, 0) / listings.length;
  
  return {
    listings,
    avgQuality,
    type: 'full-scan',
    timestamp: new Date().toISOString()
  };
}

async function performIncrementalScan(scraper, options) {
  logger.info('📈 Performing incremental scan');
  
  // Focus on newest listings only
  const listings = await scraper.scrapeWithInsights('https://flippa.com/search', {
    maxPages: options.maxPages || 5,
    filterRecentlySold: true,
    sortBy: 'newest'
  });
  
  // Filter out listings we've seen recently
  const newListings = await filterNewListings(listings);
  
  return {
    listings: newListings,
    avgQuality: newListings.reduce((sum, l) => sum + l._quality_score, 0) / newListings.length,
    type: 'incremental',
    totalFound: listings.length,
    newFound: newListings.length
  };
}

async function performQualityCheck(scraper, options) {
  logger.info('🔍 Performing quality check scan');
  
  // Sample different pages to check quality
  const allListings = [];
  
  for (let i = 0; i < 3; i++) {
    const pageOffset = i * 5;
    const listings = await scraper.scrapeWithInsights(
      `https://flippa.com/search?page=${pageOffset + 1}`, 
      {
        maxPages: 1,
        filterRecentlySold: false
      }
    );
    allListings.push(...listings);
  }
  
  // Analyze quality distribution
  const qualityAnalysis = {
    high: allListings.filter(l => l._quality_score >= 70).length,
    medium: allListings.filter(l => l._quality_score >= 40 && l._quality_score < 70).length,
    low: allListings.filter(l => l._quality_score < 40).length
  };
  
  return {
    listings: allListings,
    avgQuality: allListings.reduce((sum, l) => sum + l._quality_score, 0) / allListings.length,
    type: 'quality-check',
    qualityAnalysis
  };
}

async function performCategoryFocus(scraper, options) {
  const category = options.category || 'SaaS';
  logger.info(`🎯 Performing category-focused scan: ${category}`);
  
  // Search with category filter
  const searchUrl = `https://flippa.com/search?filter[property_type]=${encodeURIComponent(category)}`;
  
  const listings = await scraper.scrapeWithInsights(searchUrl, {
    maxPages: options.maxPages || 10,
    filterRecentlySold: true,
    targetCategories: [category]
  });
  
  return {
    listings,
    avgQuality: listings.reduce((sum, l) => sum + l._quality_score, 0) / listings.length,
    type: 'category-focus',
    category
  };
}

async function filterNewListings(listings) {
  // Check against recent scraped listings in database
  const listingIds = listings.map(l => l.id).filter(Boolean);
  
  // Initialize Supabase client for this function
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const { data: existingListings } = await supabase
      .from('scraped_listings')
      .select('listing_id')
      .in('listing_id', listingIds)
      .gte('scraped_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const existingIds = new Set(existingListings?.map(l => l.listing_id) || []);
    
    return listings.filter(l => l.id && !existingIds.has(l.id));
  } catch (error) {
    logger.error('Failed to filter new listings:', error);
    return listings; // Return all if filtering fails
  }
}

// Schedule jobs
async function scheduleJobs() {
  logger.info('📅 Scheduling insight-driven scraping jobs');
  
  // Full scan twice daily
  await scrapingQueue.add('full-scan', 
    { type: 'full-scan', options: { maxPages: 20 } },
    { 
      repeat: { cron: '0 2,14 * * *' }, // 2 AM and 2 PM
      removeOnComplete: { age: 24 * 60 * 60 }, // Keep for 24 hours
      removeOnFail: { age: 7 * 24 * 60 * 60 } // Keep failures for 7 days
    }
  );
  
  // Incremental scan every 2 hours
  await scrapingQueue.add('incremental',
    { type: 'incremental', options: { maxPages: 5 } },
    {
      repeat: { cron: '0 */2 * * *' },
      removeOnComplete: { age: 12 * 60 * 60 }
    }
  );
  
  // Quality check daily
  await scrapingQueue.add('quality-check',
    { type: 'quality-check', options: {} },
    {
      repeat: { cron: '0 6 * * *' }, // 6 AM daily
      removeOnComplete: { age: 48 * 60 * 60 }
    }
  );
  
  // Category focus rotation
  const categories = ['SaaS', 'Ecommerce', 'Content', 'Service'];
  categories.forEach((category, index) => {
    scrapingQueue.add('category-focus',
      { type: 'category-focus', options: { category, maxPages: 10 } },
      {
        repeat: { cron: `0 ${8 + index * 3} * * *` }, // Staggered throughout the day
        removeOnComplete: { age: 48 * 60 * 60 }
      }
    );
  });
  
  logger.info('✅ Jobs scheduled successfully');
}

// Process queue
scrapingQueue.process(5, processScrapingJob);

// Queue event handlers
scrapingQueue.on('completed', (job, result) => {
  logger.info(`✅ Job completed`, {
    jobId: job.id,
    type: job.data.type,
    listings: result.listings?.length || 0
  });
});

scrapingQueue.on('failed', (job, err) => {
  logger.error(`❌ Job failed`, {
    jobId: job.id,
    type: job.data.type,
    error: err.message
  });
});

scrapingQueue.on('stalled', (job) => {
  logger.warn(`⚠️ Job stalled`, {
    jobId: job.id,
    type: job.data.type
  });
});

// Health check endpoint
async function getQueueHealth() {
  const [waiting, active, completed, failed] = await Promise.all([
    scrapingQueue.getWaitingCount(),
    scrapingQueue.getActiveCount(),
    scrapingQueue.getCompletedCount(),
    scrapingQueue.getFailedCount()
  ]);
  
  return {
    queue: 'flippa-insights',
    status: 'active',
    counts: { waiting, active, completed, failed },
    timestamp: new Date().toISOString()
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down worker...');
  await scrapingQueue.close();
  await redis.quit();
  await subscriber.quit();
  process.exit(0);
});

// Start worker
async function startWorker() {
  logger.info('🚀 Starting insight-driven Flippa worker');
  
  try {
    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');
    
    // Schedule jobs
    await scheduleJobs();
    
    // Log initial status
    const health = await getQueueHealth();
    logger.info('📊 Worker status', health);
    
    logger.info('✅ Worker started successfully');
    
  } catch (error) {
    logger.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Export for monitoring
module.exports = {
  scrapingQueue,
  getQueueHealth
};

// Start if run directly
if (require.main === module) {
  startWorker();
}