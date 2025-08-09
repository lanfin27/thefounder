// scripts/high-performance-scraper/index.js
// High-Performance Scraping System - Main Entry Point

const APIDiscoveryEngine = require('./api-discovery-engine');
const HybridScrapingStrategy = require('./hybrid-scraping-strategy');
const DistributedProcessor = require('./distributed-processor');
const RealtimeOptimizer = require('./realtime-optimizer');
const DataQualityValidator = require('./data-quality-validator');
const MultiMarketplaceValidator = require('./multi-marketplace-validator');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class HighPerformanceScraper {
  constructor(config = {}) {
    this.config = {
      targetUrl: 'https://flippa.com/search?filter[property_type][]=website',
      targetListings: 5000,
      targetCompletionTime: 5, // minutes
      batchSize: 100,
      enableAPIDiscovery: true,
      enableDistributed: true,
      enableCaching: true,
      ...config
    };
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.startTime = null;
    this.extractedListings = [];
    this.performanceMetrics = {
      apiCalls: 0,
      staticExtractions: 0,
      browserExtractions: 0,
      totalTime: 0,
      successRate: 0
    };
    
    // Initialize real-time optimizer
    this.optimizer = new RealtimeOptimizer();
    
    // Initialize data quality validator
    this.validator = new DataQualityValidator({
      strictMode: false,
      autoCorrect: true,
      mlValidation: true,
      businessRules: true,
      crossValidation: true
    });
    
    // Initialize multi-marketplace validator
    this.multiValidator = new MultiMarketplaceValidator();
  }

  async execute() {
    console.log('🚀 HIGH-PERFORMANCE SCRAPING SYSTEM v2.0');
    console.log('=====================================');
    console.log(`🎯 Target: ${this.config.targetListings} listings in ${this.config.targetCompletionTime} minutes`);
    console.log(`📍 URL: ${this.config.targetUrl}`);
    console.log('');
    
    this.startTime = Date.now();
    
    // Start real-time optimization
    this.optimizer.startOptimization();
    
    // Set up optimizer event handlers
    this.setupOptimizerHandlers();
    
    try {
      // Phase 1: API Discovery (if enabled)
      let apiEndpoints = [];
      if (this.config.enableAPIDiscovery) {
        apiEndpoints = await this.discoverAPIs();
      }
      
      // Phase 2: Generate scraping targets
      const targets = await this.generateTargets();
      
      // Phase 3: Execute high-performance scraping
      const results = await this.executeScraping(targets, apiEndpoints);
      
      // Phase 4: Process and save results
      await this.processResults(results);
      
      // Phase 5: Generate performance report
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    } finally {
      // Stop optimization
      this.optimizer.stopOptimization();
      
      // Generate optimization report
      const optimizationReport = this.optimizer.generatePerformanceReport();
      console.log('\n📊 Optimization Report:', JSON.stringify(optimizationReport, null, 2));
    }
  }
  
  setupOptimizerHandlers() {
    // Handle configuration changes from optimizer
    this.optimizer.on('config_change', (config) => {
      console.log('⚙️ Optimizer config change:', config);
      
      // Apply configuration changes
      if (config.workers) {
        this.config.maxWorkers = config.workers;
      }
      if (config.batchSize) {
        this.config.batchSize = config.batchSize;
      }
      if (config.strategy) {
        this.config.strategy = config.strategy;
      }
    });
    
    // Handle critical alerts
    this.optimizer.on('critical_alert', (alert) => {
      console.error('🚨 CRITICAL ALERT:', alert);
      
      // Take immediate action
      if (alert.type === 'memory' && alert.severity === 'critical') {
        this.config.batchSize = Math.max(10, Math.floor(this.config.batchSize * 0.5));
        console.log(`🔧 Emergency batch size reduction to ${this.config.batchSize}`);
      }
    });
    
    // Handle performance alerts
    this.optimizer.on('performance_alert', (alert) => {
      console.warn('⚠️ Performance Alert:', alert);
    });
    
    // Handle predictions
    this.optimizer.on('predictions', (predictions) => {
      console.log('🔮 Performance Predictions:', {
        cpuSpike: predictions.cpuSpike?.probability > 0.7 ? 'High risk' : 'Low risk',
        throughput: predictions.throughput?.value,
        bottlenecks: predictions.bottlenecks?.length || 0
      });
    });
  }

  async discoverAPIs() {
    console.log('\n📡 PHASE 1: API DISCOVERY');
    console.log('========================');
    
    const discoveryEngine = new APIDiscoveryEngine();
    const report = await discoveryEngine.discoverAPIs(this.config.targetUrl);
    
    if (report.successfulAPIs.length > 0) {
      console.log(`✅ Found ${report.successfulAPIs.length} working API endpoints!`);
      
      // Save API configuration for future use
      await this.saveAPIConfiguration(report.endpoints);
      
      return report.endpoints;
    } else {
      console.log('⚠️ No API endpoints found, will use hybrid scraping');
      return [];
    }
  }

  async generateTargets() {
    console.log('\n🎯 PHASE 2: TARGET GENERATION');
    console.log('============================');
    
    const targets = [];
    const baseUrl = 'https://flippa.com/search?filter[property_type][]=website';
    
    // First, determine total available listings
    const totalAvailable = await this.getTotalListingsCount();
    console.log(`📊 Total available listings: ${totalAvailable}`);
    
    const targetCount = Math.min(this.config.targetListings, totalAvailable);
    const pagesNeeded = Math.ceil(targetCount / 30); // 30 listings per page
    
    // Generate page targets
    for (let page = 1; page <= pagesNeeded; page++) {
      targets.push({
        url: `${baseUrl}&page=${page}`,
        type: 'listing_page',
        page,
        priority: 1,
        selectors: this.getOptimizedSelectors()
      });
    }
    
    console.log(`✅ Generated ${targets.length} page targets`);
    return targets;
  }

  async getTotalListingsCount() {
    // Quick check to get total listing count
    try {
      const response = await require('axios').get(
        'https://flippa.com/search?filter[property_type][]=website&page=1',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36'
          }
        }
      );
      
      // Extract total count from response
      const match = response.data.match(/(\d+)\s*(?:results?|listings?)/i);
      return match ? parseInt(match[1]) : 5000;
    } catch (error) {
      return 5000; // Default fallback
    }
  }

  async executeScraping(targets, apiEndpoints) {
    console.log('\n⚡ PHASE 3: HIGH-PERFORMANCE SCRAPING');
    console.log('====================================');
    
    let results = [];
    
    if (this.config.enableDistributed) {
      // Use distributed processing with increased workers
      const processor = new DistributedProcessor({
        maxWorkers: this.config.maxWorkers || 32,
        maxConcurrencyPerWorker: 15,
        adaptiveConcurrency: true,
        memoryThreshold: 0.85,
        cpuThreshold: 0.9
      });
      
      await processor.initialize();
      
      // Set up progress monitoring
      processor.on('progress', (progress) => {
        const elapsed = (Date.now() - this.startTime) / 1000 / 60;
        const rate = progress.completed / elapsed;
        const eta = (this.config.targetListings - progress.completed) / rate;
        
        console.log(`\n📊 Progress: ${progress.completed}/${this.config.targetListings} listings`);
        console.log(`   Success Rate: ${progress.progress}%`);
        console.log(`   Rate: ${rate.toFixed(0)} listings/minute`);
        console.log(`   ETA: ${eta.toFixed(1)} minutes`);
      });
      
      // Process in batches
      const batches = this.createBatches(targets, this.config.batchSize);
      
      for (const batch of batches) {
        const batchResults = await processor.processBatch(batch);
        results.push(...batchResults);
        
        // Check if we've reached target
        if (results.length >= this.config.targetListings) {
          break;
        }
      }
      
      await processor.shutdown();
      
    } else {
      // Use single-threaded hybrid strategy
      const scraper = new HybridScrapingStrategy({
        maxConcurrency: 20,
        apiEndpoints
      });
      
      results = await scraper.scrapeOptimal(targets);
    }
    
    return results;
  }

  async processResults(results) {
    console.log('\n💾 PHASE 4: PROCESSING RESULTS');
    console.log('=============================');
    
    // Extract listings from page results
    const rawListings = [];
    
    for (const result of results) {
      if (result.success && result.data) {
        if (Array.isArray(result.data.listings)) {
          rawListings.push(...result.data.listings);
        } else if (result.data.title) {
          // Single listing
          rawListings.push(result.data);
        }
      }
    }
    
    console.log(`✅ Extracted ${rawListings.length} raw listings`);
    
    // Phase 4.1: Data Quality Validation
    console.log('\n🔍 Validating data quality...');
    
    const validatedListings = [];
    const validationStats = {
      total: rawListings.length,
      passed: 0,
      failed: 0,
      corrected: 0,
      enriched: 0
    };
    
    // Train anomaly model if we have enough data
    if (rawListings.length > 50) {
      await this.validator.trainAnomalyModel(rawListings.slice(0, 100));
    }
    
    // Validate each listing
    for (const listing of rawListings) {
      const marketplace = this.detectMarketplace(listing.url || this.config.targetUrl);
      
      // Use multi-marketplace validator for enrichment
      if (marketplace && this.multiValidator.extractors[marketplace]) {
        try {
          const enrichedResult = await this.multiValidator.validateAndEnrich(listing, marketplace);
          
          if (enrichedResult.validation.isValid && enrichedResult.validation.qualityScore > 60) {
            validatedListings.push(enrichedResult.enriched);
            validationStats.passed++;
            
            if (Object.keys(enrichedResult.validation.corrections).length > 0) {
              validationStats.corrected++;
            }
            if (enrichedResult.enriched.qualityMetrics) {
              validationStats.enriched++;
            }
          } else {
            validationStats.failed++;
            console.warn(`❌ Listing failed validation: ${listing.title || 'Unknown'} (Score: ${enrichedResult.validation.qualityScore})`);
          }
        } catch (error) {
          validationStats.failed++;
          console.error(`❌ Validation error: ${error.message}`);
        }
      } else {
        // Fallback to basic validation
        const validation = await this.validator.validateListing(listing, marketplace || 'flippa');
        
        if (validation.isValid && validation.qualityScore > 60) {
          validatedListings.push(listing);
          validationStats.passed++;
        } else {
          validationStats.failed++;
        }
      }
    }
    
    console.log(`\n📊 Validation Results:`);
    console.log(`   Total: ${validationStats.total}`);
    console.log(`   Passed: ${validationStats.passed} (${(validationStats.passed / validationStats.total * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${validationStats.failed}`);
    console.log(`   Corrected: ${validationStats.corrected}`);
    console.log(`   Enriched: ${validationStats.enriched}`);
    
    const listings = validatedListings;
    
    // Update performance metrics
    this.performanceMetrics.totalTime = Date.now() - this.startTime;
    this.performanceMetrics.successRate = (listings.length / this.config.targetListings) * 100;
    
    // Save to database
    await this.saveToDatabase(listings);
    
    // Save backup
    await this.saveBackup(listings);
    
    this.extractedListings = listings;
  }

  async saveToDatabase(listings) {
    console.log('\n💾 Saving to Supabase...');
    
    // Clear existing data
    await this.supabase
      .from('flippa_listings')
      .delete()
      .neq('listing_id', '');
    
    // Transform listings for database
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `hp_${Date.now()}_${index}`,
      title: listing.title || '',
      price: this.parsePrice(listing.price),
      monthly_revenue: this.parsePrice(listing.revenue),
      monthly_profit: this.parsePrice(listing.profit),
      multiple: this.parseMultiple(listing.multiple),
      category: listing.category || 'Website',
      url: listing.url || '',
      created_at: new Date().toISOString(),
      raw_data: {
        source: 'high_performance_scraper',
        extractionMethod: listing.extractionMethod || 'unknown',
        originalData: listing
      }
    }));
    
    // Insert in batches
    const batchSize = 100;
    let saved = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      const { error } = await this.supabase
        .from('flippa_listings')
        .insert(batch);
      
      if (!error) {
        saved += batch.length;
        console.log(`   Progress: ${saved}/${dbListings.length}`);
      } else {
        console.error('   Save error:', error.message);
      }
    }
    
    console.log(`✅ Saved ${saved} listings to database`);
  }

  async saveBackup(listings) {
    const backup = {
      timestamp: new Date().toISOString(),
      totalListings: listings.length,
      executionTime: this.performanceMetrics.totalTime,
      performanceMetrics: this.performanceMetrics,
      sampleListings: listings.slice(0, 10)
    };
    
    await fs.writeFile(
      path.join(__dirname, `backup-${Date.now()}.json`),
      JSON.stringify(backup, null, 2)
    );
  }

  generateReport() {
    const executionTime = (Date.now() - this.startTime) / 1000 / 60; // minutes
    const listingsPerMinute = this.extractedListings.length / executionTime;
    const targetAchieved = executionTime <= this.config.targetCompletionTime;
    
    console.log('\n📊 FINAL PERFORMANCE REPORT');
    console.log('==========================');
    console.log(`✅ Total Listings Extracted: ${this.extractedListings.length}`);
    console.log(`⏱️ Execution Time: ${executionTime.toFixed(2)} minutes`);
    console.log(`🚀 Performance: ${listingsPerMinute.toFixed(0)} listings/minute`);
    console.log(`🎯 Target Achieved: ${targetAchieved ? 'YES ✅' : 'NO ❌'}`);
    console.log(`📈 Success Rate: ${this.performanceMetrics.successRate.toFixed(1)}%`);
    
    // Get cache metrics if using hybrid strategy
    if (this.hybridScraper && this.hybridScraper.cache) {
      const cacheMetrics = this.hybridScraper.cache.getMetrics();
      console.log('\n💾 CACHE PERFORMANCE:');
      console.log(`   Hit Rate: ${cacheMetrics.hitRate}`);
      console.log(`   Avg Hit Time: ${cacheMetrics.avgHitTime}`);
      console.log(`   Compression Ratio: ${cacheMetrics.compressionRatio}`);
      console.log(`   Prefetch Efficiency: ${cacheMetrics.prefetchEfficiency}`);
    }
    
    // Calculate improvement over baseline
    const baselineRate = 5; // Current system: 5 listings/minute
    const improvement = listingsPerMinute / baselineRate;
    
    console.log(`\n⚡ Performance Improvement: ${improvement.toFixed(1)}x faster`);
    
    if (improvement >= 100) {
      console.log('🏆 ACHIEVED APIFY-LEVEL PERFORMANCE!');
    }
    
    // Field extraction rates
    const fieldRates = this.calculateFieldRates();
    console.log('\n📊 Field Extraction Rates:');
    console.log(`   Title: ${fieldRates.title.toFixed(1)}%`);
    console.log(`   Price: ${fieldRates.price.toFixed(1)}%`);
    console.log(`   Revenue: ${fieldRates.revenue.toFixed(1)}%`);
    console.log(`   Multiple: ${fieldRates.multiple.toFixed(1)}%`);
    
    // Data quality report
    const qualityReport = this.validator.generateValidationReport();
    console.log('\n📊 Data Quality Report:');
    console.log(`   Pass Rate: ${qualityReport.statistics.passRate}`);
    console.log(`   Avg Quality Score: ${qualityReport.statistics.avgQualityScore}`);
    console.log(`   Auto-Corrected: ${qualityReport.statistics.corrected}`);
    
    return {
      success: true,
      listings: this.extractedListings.length,
      executionTime,
      listingsPerMinute,
      improvement,
      targetAchieved,
      fieldRates
    };
  }

  calculateFieldRates() {
    if (this.extractedListings.length === 0) {
      return { title: 0, price: 0, revenue: 0, multiple: 0 };
    }
    
    const counts = {
      title: this.extractedListings.filter(l => l.title).length,
      price: this.extractedListings.filter(l => l.price).length,
      revenue: this.extractedListings.filter(l => l.revenue || l.monthly_revenue).length,
      multiple: this.extractedListings.filter(l => l.multiple).length
    };
    
    const total = this.extractedListings.length;
    
    return {
      title: (counts.title / total) * 100,
      price: (counts.price / total) * 100,
      revenue: (counts.revenue / total) * 100,
      multiple: (counts.multiple / total) * 100
    };
  }

  parsePrice(value) {
    if (!value) return null;
    
    const cleaned = String(value).replace(/[^0-9.,]/g, '');
    const number = parseFloat(cleaned.replace(/,/g, ''));
    
    if (String(value).toLowerCase().includes('k')) {
      return number * 1000;
    } else if (String(value).toLowerCase().includes('m')) {
      return number * 1000000;
    }
    
    return number || null;
  }

  parseMultiple(value) {
    if (!value) return null;
    
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || null;
  }

  createBatches(items, size) {
    const batches = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  getOptimizedSelectors() {
    return {
      listingCard: '[data-testid="listing-card"], .listing-card, div[class*="listing"]',
      title: 'h3, h4, .title, [data-testid="title"]',
      price: '.price, [data-testid="price"], span:contains("$")',
      revenue: '.revenue, [data-testid="revenue"], [data-metric="revenue"]',
      profit: '.profit, [data-testid="profit"], [data-metric="profit"]',
      multiple: '.multiple, [data-testid="multiple"]',
      category: '.category, .type, [data-testid="category"]',
      url: 'a[href*="/businesses/"], a[href*="/websites/"]'
    };
  }

  async saveAPIConfiguration(endpoints) {
    const config = {
      timestamp: new Date().toISOString(),
      endpoints,
      selectors: this.getOptimizedSelectors()
    };
    
    await fs.writeFile(
      path.join(__dirname, 'api-config.json'),
      JSON.stringify(config, null, 2)
    );
  }
  
  detectMarketplace(url) {
    if (!url) return null;
    
    const marketplaces = {
      'flippa.com': 'flippa',
      'empireflippers.com': 'empire_flippers',
      'motioninvest.com': 'motion_invest',
      'microacquire.com': 'microacquire',
      'feinternational.com': 'fe_international',
      'investors.club': 'investors_club'
    };
    
    for (const [domain, marketplace] of Object.entries(marketplaces)) {
      if (url.includes(domain)) {
        return marketplace;
      }
    }
    
    return 'flippa'; // Default
  }
}

// Execute if run directly
if (require.main === module) {
  const scraper = new HighPerformanceScraper({
    targetListings: 5000,
    targetCompletionTime: 5,
    enableAPIDiscovery: true,
    enableDistributed: true
  });
  
  scraper.execute()
    .then(report => {
      console.log('\n✅ High-Performance Scraping Complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = HighPerformanceScraper;