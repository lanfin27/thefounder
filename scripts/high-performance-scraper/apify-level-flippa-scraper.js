// scripts/high-performance-scraper/apify-level-flippa-scraper.js
// Apify-Level Performance Flippa Scraper - 5000+ listings in 5 minutes

const FlippaDirectAPIClient = require('./flippa-direct-api-client');
const DistributedProcessor = require('./distributed-processor');
const DataQualityValidator = require('./data-quality-validator');
const { Worker } = require('worker_threads');
const os = require('os');

class ApifyLevelFlippaScraper {
  constructor(config = {}) {
    this.config = {
      targetListings: 5000,
      targetMinutes: 5,
      maxWorkers: 32,
      batchSize: 500,
      parallelStreams: 10,
      ...config
    };
    
    this.stats = {
      startTime: null,
      totalExtracted: 0,
      validListings: 0,
      apiCalls: 0,
      errors: 0
    };
    
    // Initialize components
    this.apiClients = [];
    this.validator = new DataQualityValidator({
      strictMode: false,
      autoCorrect: true
    });
  }

  async execute() {
    console.log('🚀 APIFY-LEVEL FLIPPA SCRAPER');
    console.log('==============================');
    console.log(`Target: ${this.config.targetListings} listings in ${this.config.targetMinutes} minutes`);
    console.log(`Workers: ${this.config.maxWorkers}`);
    console.log(`Parallel Streams: ${this.config.parallelStreams}\n`);
    
    this.stats.startTime = Date.now();
    
    try {
      // Step 1: Initialize parallel API clients
      await this.initializeAPIClients();
      
      // Step 2: Execute parallel extraction
      const listings = await this.executeParallelExtraction();
      
      // Step 3: Validate and process results
      const validatedListings = await this.validateListings(listings);
      
      // Step 4: Generate performance report
      const report = this.generateReport(validatedListings);
      
      return {
        success: true,
        listings: validatedListings,
        report
      };
      
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async initializeAPIClients() {
    console.log('🔧 Initializing parallel API clients...');
    
    // Create multiple API client instances for parallel execution
    for (let i = 0; i < this.config.parallelStreams; i++) {
      const client = new FlippaDirectAPIClient({
        pageSize: 100,
        maxConcurrent: 5,
        rateLimitDelay: 100 + (i * 50) // Stagger delays
      });
      
      this.apiClients.push(client);
    }
    
    console.log(`✅ Initialized ${this.apiClients.length} API clients\n`);
  }

  async executeParallelExtraction() {
    console.log('⚡ Starting parallel extraction...\n');
    
    const allListings = [];
    const listingsPerClient = Math.ceil(this.config.targetListings / this.config.parallelStreams);
    
    // Strategy 1: Price range distribution
    const priceRanges = this.generatePriceRanges();
    
    // Strategy 2: Category distribution
    const categories = [
      'Advertising', 'Content', 'eCommerce', 'SaaS',
      'Apps', 'Services', 'Community', 'Other'
    ];
    
    // Strategy 3: Time-based distribution (newest, oldest, etc.)
    const sortOptions = ['-created_at', 'created_at', '-price', 'price', '-revenue'];
    
    // Create extraction tasks
    const extractionTasks = [];
    
    // Distribute work across clients
    this.apiClients.forEach((client, index) => {
      const task = this.createExtractionTask(client, {
        priceRange: priceRanges[index % priceRanges.length],
        category: categories[index % categories.length],
        sort: sortOptions[index % sortOptions.length],
        limit: listingsPerClient
      });
      
      extractionTasks.push(task);
    });
    
    // Execute all tasks in parallel
    const results = await Promise.all(extractionTasks);
    
    // Combine results
    results.forEach(clientListings => {
      allListings.push(...clientListings);
    });
    
    // Remove duplicates
    const uniqueListings = this.deduplicateListings(allListings);
    
    console.log(`\n✅ Extracted ${uniqueListings.length} unique listings`);
    
    return uniqueListings;
  }

  async createExtractionTask(client, options) {
    return new Promise(async (resolve) => {
      const listings = [];
      const { priceRange, category, sort, limit } = options;
      
      console.log(`📡 Client starting: ${category}, $${priceRange.min}-${priceRange.max}`);
      
      try {
        // Configure client for specific segment
        client.defaultParams = {
          ...client.defaultParams,
          'filter[price][min]': priceRange.min,
          'filter[price][max]': priceRange.max,
          'filter[category][]': category,
          'sort': sort
        };
        
        // Extract listings
        const extracted = await client.extractAllListings(limit);
        listings.push(...extracted);
        
        console.log(`✅ Client completed: ${extracted.length} listings from ${category}`);
        
      } catch (error) {
        console.error(`❌ Client error: ${error.message}`);
        this.stats.errors++;
      }
      
      resolve(listings);
    });
  }

  generatePriceRanges() {
    return [
      { min: 0, max: 500 },
      { min: 500, max: 1000 },
      { min: 1000, max: 2500 },
      { min: 2500, max: 5000 },
      { min: 5000, max: 10000 },
      { min: 10000, max: 25000 },
      { min: 25000, max: 50000 },
      { min: 50000, max: 100000 },
      { min: 100000, max: 500000 },
      { min: 500000, max: 10000000 }
    ];
  }

  deduplicateListings(listings) {
    const seen = new Set();
    const unique = [];
    
    listings.forEach(listing => {
      const id = listing.id || listing.listing_url;
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(listing);
      }
    });
    
    return unique;
  }

  async validateListings(listings) {
    console.log('\n🔍 Validating listings...');
    
    const validatedListings = [];
    const batchSize = 100;
    
    // Process in batches for efficiency
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      
      const validationPromises = batch.map(listing => 
        this.validator.validateListing(listing, 'flippa')
      );
      
      const validations = await Promise.all(validationPromises);
      
      validations.forEach((validation, index) => {
        if (validation.isValid && validation.qualityScore > 50) {
          validatedListings.push(batch[index]);
          this.stats.validListings++;
        }
      });
      
      // Progress update
      if (i % 500 === 0) {
        console.log(`  Validated: ${i + batch.length}/${listings.length}`);
      }
    }
    
    console.log(`✅ Valid listings: ${validatedListings.length}/${listings.length}`);
    
    return validatedListings;
  }

  generateReport(listings) {
    const duration = (Date.now() - this.stats.startTime) / 1000 / 60; // minutes
    const listingsPerMinute = listings.length / duration;
    
    const report = {
      success: listings.length >= this.config.targetListings * 0.9,
      metrics: {
        totalListings: listings.length,
        validListings: this.stats.validListings,
        duration: duration.toFixed(2) + ' minutes',
        rate: Math.round(listingsPerMinute) + ' listings/minute',
        targetAchieved: listings.length >= this.config.targetListings
      },
      performance: {
        vsTarget: `${(listings.length / this.config.targetListings * 100).toFixed(1)}%`,
        vsApify: `${(listingsPerMinute / 1000 * 100).toFixed(1)}%`,
        improvement: `${(listingsPerMinute / 5).toFixed(0)}x faster than basic scraping`
      },
      breakdown: this.analyzeListings(listings)
    };
    
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('====================');
    console.log(`Total Listings: ${report.metrics.totalListings}`);
    console.log(`Valid Listings: ${report.metrics.validListings}`);
    console.log(`Duration: ${report.metrics.duration}`);
    console.log(`Rate: ${report.metrics.rate}`);
    console.log(`Target Achievement: ${report.performance.vsTarget}`);
    console.log(`Apify Comparison: ${report.performance.vsApify}`);
    
    return report;
  }

  analyzeListings(listings) {
    const analysis = {
      byCategory: {},
      byPriceRange: {},
      byMonetization: {},
      avgPrice: 0,
      avgRevenue: 0,
      avgMultiple: 0
    };
    
    let totalPrice = 0;
    let totalRevenue = 0;
    let totalMultiple = 0;
    let countWithRevenue = 0;
    let countWithMultiple = 0;
    
    listings.forEach(listing => {
      // Category breakdown
      const category = listing.category || 'Unknown';
      analysis.byCategory[category] = (analysis.byCategory[category] || 0) + 1;
      
      // Price range breakdown
      const price = listing.price || 0;
      const priceRange = this.getPriceRangeName(price);
      analysis.byPriceRange[priceRange] = (analysis.byPriceRange[priceRange] || 0) + 1;
      
      // Monetization breakdown
      const monetization = listing.monetization || 'Unknown';
      analysis.byMonetization[monetization] = (analysis.byMonetization[monetization] || 0) + 1;
      
      // Averages
      totalPrice += price;
      if (listing.monthly_revenue) {
        totalRevenue += listing.monthly_revenue;
        countWithRevenue++;
      }
      if (listing.multiple) {
        totalMultiple += listing.multiple;
        countWithMultiple++;
      }
    });
    
    analysis.avgPrice = Math.round(totalPrice / listings.length);
    analysis.avgRevenue = countWithRevenue > 0 ? Math.round(totalRevenue / countWithRevenue) : 0;
    analysis.avgMultiple = countWithMultiple > 0 ? (totalMultiple / countWithMultiple).toFixed(1) : 0;
    
    return analysis;
  }

  getPriceRangeName(price) {
    if (price < 1000) return 'Under $1K';
    if (price < 5000) return '$1K-$5K';
    if (price < 10000) return '$5K-$10K';
    if (price < 50000) return '$10K-$50K';
    if (price < 100000) return '$50K-$100K';
    if (price < 500000) return '$100K-$500K';
    return 'Over $500K';
  }
}

// Export for use
module.exports = ApifyLevelFlippaScraper;

// Run if executed directly
if (require.main === module) {
  const scraper = new ApifyLevelFlippaScraper({
    targetListings: 5000,
    targetMinutes: 5,
    maxWorkers: 32,
    parallelStreams: 10
  });
  
  scraper.execute()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Scraping completed successfully!');
        console.log(`Achieved ${result.report.performance.vsApify} of Apify performance`);
      } else {
        console.log('\n❌ Scraping failed:', result.error);
      }
    })
    .catch(console.error);
}