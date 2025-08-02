// Flippa Complete System - Production Entry Point

require('dotenv').config({ path: '.env.local' });
const FlippaScraperEngine = require('./flippa-scraper-engine');
const FlippaDataProcessor = require('./flippa-data-processor');
const FlippaDatabaseManager = require('../lib/database/flippa-db-manager');
const FlippaScheduler = require('./flippa-scheduler');

class FlippaCompleteSystem {
  constructor() {
    this.components = {
      scraper: new FlippaScraperEngine(),
      processor: new FlippaDataProcessor(),
      database: new FlippaDatabaseManager(),
      scheduler: new FlippaScheduler()
    };
  }

  async initialize() {
    console.log('🚀 Initializing Flippa Complete System');
    console.log('📊 Target: 95%+ success rate (Apify standard)');
    console.log('='.repeat(60));

    // Verify environment
    this.verifyEnvironment();

    // Initialize scheduler
    this.components.scheduler.initialize();

    // Run initial test
    await this.runSystemTest();

    console.log('\n✅ System initialized and ready');
  }

  verifyEnvironment() {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'REDIS_URL'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ Environment verified');
  }

  async runSystemTest() {
    console.log('\n🧪 Running system test...');

    try {
      // Test scraping
      const testUrl = 'https://flippa.com/search?filter[status]=sold';
      const listings = await this.components.scraper.scrapeWithApifyMethodology(testUrl, {
        maxPages: 1
      });

      console.log(`✅ Scraping test: ${listings.length} listings extracted`);

      // Test processing
      const { processed, stats } = await this.components.processor.processListings(listings);
      console.log(`✅ Processing test: ${processed.length} listings validated`);
      console.log(`   Success rate: ${stats.successRate}%`);
      console.log(`   Avg quality: ${stats.avgQualityScore}`);

      // Test database
      await this.components.database.saveListings(processed.slice(0, 5));
      console.log('✅ Database test: Sample listings saved');

      // Get performance report
      const performance = this.components.scraper.getPerformanceReport();
      console.log('\n📊 Performance Report:');
      console.log(`   Success Rate: ${performance.successRate}`);
      console.log(`   Average Quality: ${performance.averageQuality}`);
      console.log(`   Meets Apify Standard: ${performance.meetsApifyStandard ? 'YES' : 'NO'}`);

    } catch (error) {
      console.error('❌ System test failed:', error.message);
      throw error;
    }
  }

  async executeScraping(options = {}) {
    const defaultOptions = {
      url: 'https://flippa.com/search',
      maxPages: 10,
      filterRecentlySold: true,
      sortBy: 'newest'
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Execute full pipeline
    const listings = await this.components.scraper.scrapeWithApifyMethodology(
      finalOptions.url,
      finalOptions
    );

    const { processed, errors, stats } = await this.components.processor.processListings(listings);

    await this.components.database.saveListings(processed);

    return {
      processed: processed.length,
      errors: errors.length,
      stats,
      performance: this.components.scraper.getPerformanceReport()
    };
  }
}

// Export for use
module.exports = FlippaCompleteSystem;

// Run if called directly
if (require.main === module) {
  const system = new FlippaCompleteSystem();
  
  system.initialize()
    .then(() => {
      console.log('\n🎉 Flippa scraping system is running!');
      console.log('📊 Monitor at: http://localhost:3000/admin/scraping');
    })
    .catch(error => {
      console.error('❌ System initialization failed:', error);
      process.exit(1);
    });
}
