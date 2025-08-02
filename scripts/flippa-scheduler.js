// Flippa Automated Scheduler

const cron = require('node-cron');
const Bull = require('bull');
const FlippaScraperEngine = require('./flippa-scraper-engine');
const FlippaDataProcessor = require('./flippa-data-processor');
const FlippaDatabaseManager = require('../lib/database/flippa-db-manager');

class FlippaScheduler {
  constructor() {
    this.queue = new Bull('flippa-scraping', process.env.REDIS_URL);
    this.scraper = new FlippaScraperEngine();
    this.processor = new FlippaDataProcessor();
    this.dbManager = new FlippaDatabaseManager();
  }

  initialize() {
    // Process queue jobs
    this.queue.process(async (job) => {
      return await this.executeScrapingJob(job.data);
    });

    // Schedule regular scraping
    this.scheduleJobs();

    console.log('✅ Flippa scheduler initialized');
  }

  scheduleJobs() {
    // Full scan twice daily
    cron.schedule('0 2,14 * * *', async () => {
      await this.queue.add('full-scan', {
        type: 'scheduled-full',
        maxPages: 20
      });
    });

    // Quick scan every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      await this.queue.add('quick-scan', {
        type: 'scheduled-quick',
        maxPages: 5,
        filterRecentlySold: true
      });
    });

    // Category-specific scans
    const categories = ['SaaS', 'Ecommerce', 'Content'];
    categories.forEach((category, index) => {
      cron.schedule(`0 ${6 + index * 2} * * *`, async () => {
        await this.queue.add('category-scan', {
          type: 'scheduled-category',
          category,
          maxPages: 10
        });
      });
    });
  }

  async executeScrapingJob(jobData) {
    const job = await this.dbManager.createScrapingJob(jobData);

    try {
      const url = this.buildUrl(jobData);
      const listings = await this.scraper.scrapeWithApifyMethodology(url, jobData);
      
      const { processed, errors, stats } = await this.processor.processListings(listings);
      
      await this.dbManager.saveListings(processed);
      
      await this.dbManager.updateScrapingJob(job.id, {
        status: 'completed',
        results_count: processed.length,
        error_count: errors.length,
        stats,
        completed_at: new Date().toISOString()
      });

      return { success: true, processed: processed.length };

    } catch (error) {
      await this.dbManager.updateScrapingJob(job.id, {
        status: 'failed',
        error_message: error.message
      });
      
      throw error;
    }
  }

  buildUrl(jobData) {
    let url = 'https://flippa.com/search';
    const params = new URLSearchParams();

    if (jobData.category) {
      params.append('filter[property_type]', jobData.category);
    }
    
    if (jobData.filterRecentlySold) {
      params.append('filter[status]', 'sold');
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }
}

module.exports = FlippaScheduler;

// Start scheduler if run directly
if (require.main === module) {
  const scheduler = new FlippaScheduler();
  scheduler.initialize();
}
