// Scheduled worker for automated Flippa scraping
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const { chromium } = require('playwright');
const FlippaDatabase = require('../src/lib/database/flippa-integration');

// Create queue for scheduled jobs
const schedulerQueue = new Bull('flippa-scheduler', process.env.REDIS_URL);
const scrapingQueue = new Bull('flippa-scraping', process.env.REDIS_URL);

// Configuration
const SCHEDULE_CONFIG = {
  dailyScrape: '0 2 * * *', // 2 AM daily
  weeklyScrape: '0 3 * * 0', // 3 AM Sunday
  retryAttempts: 3,
  retryDelay: 300000, // 5 minutes
  maxConcurrency: 1
};

// Health monitoring
class HealthMonitor {
  constructor() {
    this.stats = {
      lastRun: null,
      successfulRuns: 0,
      failedRuns: 0,
      totalListingsScraped: 0,
      averageRunTime: 0
    };
  }
  
  recordStart() {
    this.currentRun = {
      startTime: Date.now(),
      listings: 0
    };
  }
  
  recordComplete(listingsCount) {
    const runTime = Date.now() - this.currentRun.startTime;
    this.stats.lastRun = new Date().toISOString();
    this.stats.successfulRuns++;
    this.stats.totalListingsScraped += listingsCount;
    
    // Update average run time
    const totalRuns = this.stats.successfulRuns + this.stats.failedRuns;
    this.stats.averageRunTime = 
      (this.stats.averageRunTime * (totalRuns - 1) + runTime) / totalRuns;
    
    console.log(`✅ Scraping completed in ${Math.round(runTime / 1000)}s`);
    console.log(`📊 Total runs: ${totalRuns}, Success rate: ${Math.round(this.stats.successfulRuns / totalRuns * 100)}%`);
  }
  
  recordFailure(error) {
    this.stats.failedRuns++;
    this.stats.lastError = error.message;
    console.error(`❌ Scraping failed: ${error.message}`);
  }
  
  async checkHealth() {
    // Check if scraping hasn't run in 48 hours
    if (this.stats.lastRun) {
      const lastRunTime = new Date(this.stats.lastRun).getTime();
      const hoursSinceLastRun = (Date.now() - lastRunTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun > 48) {
        console.warn(`⚠️  WARNING: No successful scrape in ${Math.round(hoursSinceLastRun)} hours`);
        // Send alert (implement your notification system)
        await this.sendAlert('Scraping has not run successfully in 48+ hours');
      }
    }
  }
  
  async sendAlert(message) {
    // Implement your notification system here
    // Examples: Email, Slack, Discord, SMS
    console.log(`🚨 ALERT: ${message}`);
  }
}

const healthMonitor = new HealthMonitor();

// Main scraping function with error recovery
async function runScheduledScrape(job) {
  console.log(`\n🕐 Starting scheduled scrape at ${new Date().toISOString()}`);
  healthMonitor.recordStart();
  
  let browser;
  let retryCount = 0;
  
  while (retryCount < SCHEDULE_CONFIG.retryAttempts) {
    try {
      // Initialize browser with optimizations
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
      });
      
      const page = await context.newPage();
      
      // Load the complete scraper logic
      const { scrapeWithSetup } = require('./scrape-flippa-complete-worker');
      const results = await scrapeWithSetup(page);
      
      // Record success
      healthMonitor.recordComplete(results.totalListings);
      
      // Clean up
      await browser.close();
      
      // Database maintenance
      const db = new FlippaDatabase();
      const duplicatesRemoved = await db.cleanDuplicates();
      if (duplicatesRemoved > 0) {
        console.log(`🧹 Cleaned ${duplicatesRemoved} duplicate listings`);
      }
      
      return results;
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Attempt ${retryCount} failed:`, error.message);
      
      if (browser) {
        await browser.close();
      }
      
      if (retryCount < SCHEDULE_CONFIG.retryAttempts) {
        console.log(`⏳ Retrying in ${SCHEDULE_CONFIG.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, SCHEDULE_CONFIG.retryDelay));
      } else {
        healthMonitor.recordFailure(error);
        throw error;
      }
    }
  }
}

// Job handlers for different job types
const jobHandlers = {
  'manual-quick-scrape': async (job) => {
    console.log('⚡ Running quick scrape (1 page)...');
    const options = {
      ...job.data.options,
      maxPages: 1
    };
    return await runScheduledScrape({ ...job, data: { ...job.data, options } });
  },
  
  'manual-complete-scrape': async (job) => {
    console.log('🚀 Running complete scrape...');
    return await runScheduledScrape(job);
  },
  
  'manual-incremental': async (job) => {
    console.log('🔄 Running incremental update...');
    const options = {
      ...job.data.options,
      onlyNew: true
    };
    return await runScheduledScrape({ ...job, data: { ...job.data, options } });
  },
  
  'daily-scrape': async (job) => {
    console.log('📅 Running daily scheduled scrape...');
    const options = {
      clearFilters: true,
      enableRecentlySold: true,
      sortBy: 'most_recent',
      itemsPerPage: 100,
      maxPages: 5
    };
    return await runScheduledScrape({ ...job, data: { ...job.data, options } });
  },
  
  'weekly-deep-scrape': async (job) => {
    console.log('📅 Running weekly deep scrape...');
    const options = {
      clearFilters: true,
      enableRecentlySold: true,
      sortBy: 'most_recent',
      itemsPerPage: 100,
      maxPages: job.data.maxPages || 20
    };
    return await runScheduledScrape({ ...job, data: { ...job.data, options } });
  },
  
  'manual-scrape': async (job) => {
    console.log('🔧 Running manual scrape...');
    return await runScheduledScrape(job);
  }
};

// Process scheduled jobs with proper type handling
schedulerQueue.process(SCHEDULE_CONFIG.maxConcurrency, async (job) => {
  console.log(`📅 Processing job: ${job.data.type || job.name}`);
  
  try {
    // Determine job type
    const jobType = job.data.type || job.name;
    const handler = jobHandlers[jobType];
    
    if (!handler) {
      throw new Error(`No handler found for job type: ${jobType}`);
    }
    
    // Execute appropriate handler
    const results = await handler(job);
    
    // Store results
    await job.update({
      ...job.data,
      lastRun: new Date().toISOString(),
      results: results
    });
    
    return results;
    
  } catch (error) {
    console.error(`❌ Job failed:`, error);
    throw error;
  }
});

// Set up recurring jobs
async function setupSchedules() {
  console.log('📅 Setting up scheduled jobs...');
  
  // Daily scrape
  await schedulerQueue.add(
    'daily-scrape',
    { 
      type: 'daily',
      description: 'Daily complete Flippa scrape'
    },
    {
      repeat: {
        cron: SCHEDULE_CONFIG.dailyScrape
      },
      removeOnComplete: false,
      removeOnFail: false
    }
  );
  
  // Weekly deep scrape (with more pages)
  await schedulerQueue.add(
    'weekly-deep-scrape',
    { 
      type: 'weekly',
      description: 'Weekly deep Flippa scrape',
      maxPages: 20 // Scrape more pages weekly
    },
    {
      repeat: {
        cron: SCHEDULE_CONFIG.weeklyScrape
      },
      removeOnComplete: false,
      removeOnFail: false
    }
  );
  
  console.log('✅ Scheduled jobs configured');
}

// Manual trigger endpoint
async function triggerManualScrape() {
  console.log('🔧 Manual scrape triggered');
  
  const job = await schedulerQueue.add(
    'manual-scrape',
    {
      type: 'manual',
      triggeredAt: new Date().toISOString()
    },
    {
      removeOnComplete: true,
      removeOnFail: false
    }
  );
  
  return job.id;
}

// Health check endpoint
async function getHealthStatus() {
  await healthMonitor.checkHealth();
  
  const queueStats = await schedulerQueue.getJobCounts();
  
  return {
    health: healthMonitor.stats,
    queue: queueStats,
    isHealthy: healthMonitor.stats.failedRuns < 3
  };
}

// Event handlers
schedulerQueue.on('completed', (job, result) => {
  console.log(`✅ Scheduled job ${job.id} completed`);
  console.log(`📊 Scraped ${result.totalListings} listings`);
});

schedulerQueue.on('failed', (job, err) => {
  console.log(`❌ Scheduled job ${job.id} failed:`, err.message);
  healthMonitor.sendAlert(`Scheduled scraping job failed: ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down scheduler...');
  await schedulerQueue.close();
  process.exit(0);
});

// Initialize
(async () => {
  console.log('🚀 Flippa Scheduler Worker Started');
  console.log('=' .repeat(50));
  
  // Set up schedules
  await setupSchedules();
  
  // Get health status
  const health = await getHealthStatus();
  console.log('📊 Current health:', health);
  
  console.log('\n⏰ Waiting for scheduled jobs...');
  console.log(`   Daily: ${SCHEDULE_CONFIG.dailyScrape}`);
  console.log(`   Weekly: ${SCHEDULE_CONFIG.weeklyScrape}`);
})();

// Export for API usage
module.exports = {
  triggerManualScrape,
  getHealthStatus
};