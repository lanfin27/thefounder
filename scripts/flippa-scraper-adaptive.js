/**
 * Adaptive Flippa Scraper - Handles dynamic marketplace changes
 * Automatically detects and adapts to real-time listing count fluctuations
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const MarketplaceTracker = require('./marketplace-tracker');

class AdaptiveFlippaScraper {
  constructor(options = {}) {
    this.config = {
      timeout: 120000,
      headless: true,
      adaptiveMode: true,
      recheckInterval: 25, // Pages between marketplace rechecks
      maxRetries: 3,
      completenessTarget: 0.95, // 95% target
      ...options
    };
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
      ),
      transports: [new winston.transports.Console()]
    });
    
    this.marketplaceTracker = new MarketplaceTracker(this.logger);
    this.allListings = new Map(); // Use Map to prevent duplicates
    this.pagesSeen = new Set();
    this.stats = {
      startTime: Date.now(),
      pagesProcessed: 0,
      listingsFound: 0,
      duplicatesSkipped: 0,
      errorsRecovered: 0,
      marketplaceChecks: 0
    };
  }

  /**
   * Main adaptive scraping method
   */
  async scrapeAdaptive(baseUrl, targetPages = null) {
    this.logger.info('🚀 Starting adaptive marketplace scraping...');
    
    const browser = await chromium.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Initial marketplace detection
      await page.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });
      
      const initialState = await this.marketplaceTracker.detectCurrentMarketplaceState(page);
      this.logger.info(`📊 Initial marketplace size: ${initialState.totalListings || 'Unknown'} listings`);
      
      // Determine scraping strategy
      const strategy = this.determineStrategy(initialState, targetPages);
      this.logger.info(`📋 Strategy: ${strategy.description}`);
      
      // Execute adaptive scraping
      await this.executeAdaptiveScraping(page, baseUrl, strategy);
      
      // Final completeness check
      const completeness = this.marketplaceTracker.analyzeCompleteness(
        Array.from(this.allListings.values())
      );
      
      this.logger.info(`\n✅ Scraping completed!`);
      this.logger.info(`📊 Final stats:`);
      this.logger.info(`   - Total unique listings: ${this.allListings.size}`);
      this.logger.info(`   - Completeness: ${completeness.percentage}%`);
      this.logger.info(`   - Pages processed: ${this.stats.pagesProcessed}`);
      this.logger.info(`   - Duplicates skipped: ${this.stats.duplicatesSkipped}`);
      this.logger.info(`   - Marketplace checks: ${this.stats.marketplaceChecks}`);
      this.logger.info(`   - Time elapsed: ${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`);
      
      return {
        success: true,
        listings: Array.from(this.allListings.values()),
        stats: this.stats,
        completeness,
        marketplaceReport: this.marketplaceTracker.getReport()
      };
      
    } catch (error) {
      this.logger.error(`❌ Fatal error: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Determine optimal scraping strategy
   */
  determineStrategy(marketplaceState, targetPages) {
    const totalListings = marketplaceState.totalListings;
    const confidence = marketplaceState.confidence;
    
    if (targetPages) {
      return {
        type: 'fixed_pages',
        pages: targetPages,
        description: `Fixed ${targetPages} pages as requested`
      };
    }
    
    if (!totalListings || confidence < 0.5) {
      return {
        type: 'exploratory',
        pages: 100, // Explore up to 100 pages
        description: 'Exploratory mode - marketplace size unknown'
      };
    }
    
    const estimatedPages = Math.ceil(totalListings / 25);
    const velocity = this.marketplaceTracker.getMarketplaceVelocity();
    
    if (Math.abs(velocity) > 20) {
      return {
        type: 'aggressive',
        pages: estimatedPages + 10, // Add buffer
        recheckInterval: 10, // Check more frequently
        description: 'Aggressive mode - high marketplace volatility'
      };
    }
    
    return {
      type: 'standard',
      pages: estimatedPages + 2, // Small buffer
      recheckInterval: 25,
      description: 'Standard mode - stable marketplace'
    };
  }

  /**
   * Execute adaptive scraping with dynamic adjustments
   */
  async executeAdaptiveScraping(page, baseUrl, strategy) {
    let currentPage = 1;
    let consecutiveEmptyPages = 0;
    let lastRecheckPage = 0;
    
    while (true) {
      // Check if we should stop
      if (this.shouldStopScraping(currentPage, strategy, consecutiveEmptyPages)) {
        this.logger.info(`🛑 Stopping at page ${currentPage} - ${this.getStopReason()}`);
        break;
      }
      
      // Periodic marketplace recheck
      if (currentPage - lastRecheckPage >= this.config.recheckInterval) {
        await this.recheckMarketplace(page);
        lastRecheckPage = currentPage;
      }
      
      // Scrape current page
      this.logger.info(`\n📄 Processing page ${currentPage}...`);
      const pageUrl = currentPage === 1 ? baseUrl : `${baseUrl}&page=${currentPage}`;
      
      try {
        const pageResults = await this.scrapePage(page, pageUrl, currentPage);
        
        if (pageResults.success && pageResults.listings.length > 0) {
          consecutiveEmptyPages = 0;
          this.processPageResults(pageResults, currentPage);
          
          // Adaptive delay
          const delay = this.calculateAdaptiveDelay(currentPage, pageResults.duration);
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } else {
          consecutiveEmptyPages++;
          this.logger.warn(`⚠️  Page ${currentPage}: No listings found`);
          
          // Try recovery strategies
          if (consecutiveEmptyPages === 1) {
            await this.tryRecoveryStrategies(page, pageUrl);
          }
        }
        
        currentPage++;
        
      } catch (error) {
        this.logger.error(`❌ Page ${currentPage} error: ${error.message}`);
        
        // Try to recover
        const recovered = await this.tryErrorRecovery(page, error, pageUrl);
        if (recovered) {
          this.stats.errorsRecovered++;
        } else {
          consecutiveEmptyPages++;
        }
        
        currentPage++;
      }
    }
  }

  /**
   * Scrape a single page with comprehensive extraction
   */
  async scrapePage(page, url, pageNumber) {
    const startTime = Date.now();
    
    try {
      // Navigate with retry logic
      let navigationSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
          });
          
          // Wait for listings to load
          await page.waitForSelector('div[id^="listing-"]', { 
            timeout: 30000,
            state: 'visible' 
          });
          
          navigationSuccess = true;
          break;
        } catch (navError) {
          this.logger.warn(`Navigation attempt ${attempt} failed: ${navError.message}`);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
      }
      
      if (!navigationSuccess) {
        throw new Error('Failed to navigate after 3 attempts');
      }
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract listings with enhanced precision
      const listings = await this.extractListingsWithPrecision(page, pageNumber);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        listings,
        duration,
        pageNumber
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        pageNumber
      };
    }
  }

  /**
   * Extract listings with high precision
   */
  async extractListingsWithPrecision(page, pageNumber) {
    const listings = await page.evaluate((pageNum) => {
      const results = [];
      const elements = document.querySelectorAll('div[id^="listing-"]');
      
      elements.forEach((element) => {
        const listing = {
          pageNumber: pageNum,
          scraped_at: new Date().toISOString()
        };
        
        // Extract ID (critical for deduplication)
        listing.id = element.id.replace('listing-', '');
        
        // Extract URL
        const link = element.querySelector('a[href^="/"]');
        if (link) {
          listing.url = `https://flippa.com${link.getAttribute('href')}`;
        }
        
        // Extract title with multiple strategies
        let title = null;
        
        // Strategy 1: From description paragraph
        const desc = element.querySelector('p.tw-text-gray-900');
        if (desc) {
          const text = desc.textContent.trim();
          title = text.split(/[,.]/)[0].trim();
          listing.description = text;
        }
        
        // Strategy 2: From link text
        if (!title && link) {
          const linkText = link.textContent.trim();
          if (linkText && !linkText.includes('View Listing')) {
            title = linkText;
          }
        }
        
        // Strategy 3: From heading elements
        if (!title) {
          const heading = element.querySelector('h3, h4, [class*="heading"]');
          if (heading) {
            title = heading.textContent.trim();
          }
        }
        
        listing.title = title || `Business #${listing.id}`;
        
        // Extract price with comprehensive search
        let price = null;
        let priceSource = null;
        
        // Check multiple price locations
        const priceSelectors = [
          'span.tw-text-xl',
          'span[class*="price"]',
          'div[class*="price"]',
          'p[class*="price"]'
        ];
        
        for (const selector of priceSelectors) {
          const priceElement = element.querySelector(selector);
          if (priceElement && priceElement.textContent.includes('$')) {
            const match = priceElement.textContent.match(/\$?([\d,]+)(?!.*p\/mo)/);
            if (match) {
              price = parseFloat(match[1].replace(/,/g, ''));
              priceSource = selector;
              break;
            }
          }
        }
        
        // Fallback: Search in full text
        if (!price) {
          const text = element.textContent;
          const patterns = [
            /USD\s*\$?([\d,]+)(?!.*p\/mo)/,
            /Price:\s*\$?([\d,]+)/i,
            /\$?([\d,]+)\s*USD(?!.*p\/mo)/
          ];
          
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              price = parseFloat(match[1].replace(/,/g, ''));
              priceSource = 'text_pattern';
              break;
            }
          }
        }
        
        listing.price = price;
        listing.priceSource = priceSource;
        
        // Extract monthly revenue/profit
        let monthlyRevenue = null;
        const monthlyPatterns = [
          /\$?([\d,]+)\s*p\/mo/i,
          /\$?([\d,]+)\s*\/\s*month/i,
          /monthly.*\$?([\d,]+)/i
        ];
        
        const monthlyElements = element.querySelectorAll('div, span, p');
        for (const elem of monthlyElements) {
          const text = elem.textContent;
          for (const pattern of monthlyPatterns) {
            const match = text.match(pattern);
            if (match) {
              monthlyRevenue = parseFloat(match[1].replace(/,/g, ''));
              break;
            }
          }
          if (monthlyRevenue) break;
        }
        
        listing.monthlyRevenue = monthlyRevenue;
        
        // Extract business type and category
        const typeKeywords = ['SaaS', 'Content', 'Ecommerce', 'App', 'Service', 'Blog', 'Subscription'];
        const typeElements = element.querySelectorAll('div.tw-text-gray-800, span[class*="type"], div[class*="category"]');
        
        for (const elem of typeElements) {
          const text = elem.textContent.trim();
          for (const keyword of typeKeywords) {
            if (text.includes(keyword)) {
              listing.type = keyword;
              break;
            }
          }
          
          // Category detection
          if (!listing.category && text.length < 50 && !text.includes('$')) {
            listing.category = text;
          }
        }
        
        // Extract multiple
        const multiplePattern = /([\d.]+)x\s*(profit|revenue|monthly)/i;
        const multipleMatch = element.textContent.match(multiplePattern);
        if (multipleMatch) {
          listing.multiple = parseFloat(multipleMatch[1]);
          listing.multipleType = multipleMatch[2].toLowerCase();
        }
        
        // Extract badges
        listing.badges = [];
        const badgeKeywords = [
          'Verified', 'Managed by Flippa', 'Sponsored', 
          "Editor's Choice", 'Super Seller', 'Broker',
          'Premium', 'Featured', 'Hot'
        ];
        
        const elementText = element.textContent;
        for (const badge of badgeKeywords) {
          if (elementText.includes(badge)) {
            listing.badges.push(badge);
          }
        }
        
        // Quality score
        listing.qualityScore = 0;
        if (listing.title && listing.title !== `Business #${listing.id}`) listing.qualityScore += 25;
        if (listing.price) listing.qualityScore += 25;
        if (listing.monthlyRevenue) listing.qualityScore += 25;
        if (listing.type) listing.qualityScore += 15;
        if (listing.badges.length > 0) listing.qualityScore += 10;
        
        results.push(listing);
      });
      
      return results;
    }, pageNumber);
    
    return listings;
  }

  /**
   * Process page results and update statistics
   */
  processPageResults(pageResults, pageNumber) {
    let newListings = 0;
    let duplicates = 0;
    
    for (const listing of pageResults.listings) {
      if (!this.allListings.has(listing.id)) {
        this.allListings.set(listing.id, listing);
        newListings++;
      } else {
        duplicates++;
      }
    }
    
    this.stats.pagesProcessed++;
    this.stats.listingsFound += newListings;
    this.stats.duplicatesSkipped += duplicates;
    this.pagesSeen.add(pageNumber);
    
    this.logger.info(`   ✅ Page ${pageNumber}: ${newListings} new, ${duplicates} duplicates`);
    this.logger.info(`   📊 Total unique: ${this.allListings.size}`);
  }

  /**
   * Recheck marketplace state periodically
   */
  async recheckMarketplace(page) {
    this.logger.info('\n🔄 Rechecking marketplace state...');
    this.stats.marketplaceChecks++;
    
    const currentUrl = page.url();
    const baseUrl = currentUrl.split('&page=')[0];
    
    // Navigate to page 1 for accurate detection
    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    const newState = await this.marketplaceTracker.detectCurrentMarketplaceState(page);
    
    if (this.marketplaceTracker.hasMarketplaceChanged()) {
      this.logger.warn(`⚠️  Marketplace has changed significantly!`);
      this.logger.info(`   Previous: ${this.marketplaceTracker.history[0].totalListings}`);
      this.logger.info(`   Current: ${newState.totalListings}`);
    }
    
    // Return to current page
    await page.goto(currentUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
  }

  /**
   * Calculate adaptive delay between pages
   */
  calculateAdaptiveDelay(pageNumber, processingTime) {
    const baseDelay = 2000 + Math.random() * 2000; // 2-4 seconds
    
    // Increase delay for later pages
    const pageDelay = pageNumber > 10 ? (pageNumber - 10) * 100 : 0;
    
    // Adjust based on processing speed
    const speedAdjustment = processingTime < 3000 ? 1000 : 0;
    
    // Add randomness to appear more human-like
    const randomFactor = Math.random() * 1000;
    
    const totalDelay = baseDelay + pageDelay + speedAdjustment + randomFactor;
    
    this.logger.debug(`Delay: ${(totalDelay/1000).toFixed(1)}s`);
    return totalDelay;
  }

  /**
   * Determine if scraping should stop
   */
  shouldStopScraping(currentPage, strategy, consecutiveEmptyPages) {
    // Hard limits
    if (currentPage > 500) {
      this.stopReason = 'Reached maximum page limit (500)';
      return true;
    }
    
    if (consecutiveEmptyPages >= 5) {
      this.stopReason = 'Too many consecutive empty pages';
      return true;
    }
    
    // Strategy-based limits
    if (strategy.pages && currentPage > strategy.pages) {
      this.stopReason = `Reached strategy page limit (${strategy.pages})`;
      return true;
    }
    
    // Completeness check
    const completeness = this.marketplaceTracker.analyzeCompleteness(
      Array.from(this.allListings.values())
    );
    
    if (completeness.percentage >= this.config.completenessTarget * 100) {
      this.stopReason = `Reached completeness target (${completeness.percentage}%)`;
      return true;
    }
    
    // Natural end detection
    const naturalEnd = this.marketplaceTracker.predictNaturalEnd(currentPage, 25);
    if (naturalEnd && currentPage > naturalEnd.recommendedStopPage) {
      this.stopReason = 'Reached natural marketplace end';
      return true;
    }
    
    return false;
  }

  /**
   * Get stop reason
   */
  getStopReason() {
    return this.stopReason || 'Unknown reason';
  }

  /**
   * Try recovery strategies for empty pages
   */
  async tryRecoveryStrategies(page, url) {
    this.logger.info('🔧 Attempting recovery strategies...');
    
    // Strategy 1: Refresh page
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const hasListings = await page.$('div[id^="listing-"]');
      if (hasListings) {
        this.logger.info('   ✅ Recovery successful: Page reload');
        return true;
      }
    } catch (e) {}
    
    // Strategy 2: Navigate via pagination
    try {
      const pageNumber = parseInt(url.match(/page=(\d+)/)?.[1] || '1');
      const prevButton = await page.$(`a[href*="page=${pageNumber-1}"]`);
      
      if (prevButton && pageNumber > 1) {
        await prevButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const nextButton = await page.$(`a[href*="page=${pageNumber}"]`);
        if (nextButton) {
          await nextButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          this.logger.info('   ✅ Recovery successful: Navigation via pagination');
          return true;
        }
      }
    } catch (e) {}
    
    this.logger.warn('   ❌ Recovery strategies failed');
    return false;
  }

  /**
   * Try to recover from errors
   */
  async tryErrorRecovery(page, error, url) {
    this.logger.info('🚨 Attempting error recovery...');
    
    if (error.message.includes('timeout')) {
      // For timeout errors, try with reduced wait time
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        return true;
      } catch (e) {}
    }
    
    if (error.message.includes('Navigation')) {
      // For navigation errors, wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        return true;
      } catch (e) {}
    }
    
    return false;
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const config = parseArguments(args);
  
  console.log(`\n🎯 Adaptive Flippa Scraper Configuration:`);
  console.log(`   Mode: ${config.adaptiveMode ? 'ADAPTIVE' : 'Standard'}`);
  console.log(`   Pages: ${config.pages || 'Dynamic (based on marketplace)'}`);
  console.log(`   Headless: ${config.headless ? 'Yes' : 'No'}`);
  console.log(`   Completeness Target: ${config.completenessTarget * 100}%`);
  console.log(`   Save to Database: ${config.saveData ? 'Yes' : 'No'}\n`);
  
  const scraper = new AdaptiveFlippaScraper(config);
  const baseUrl = 'https://flippa.com/search?filter[property_type][]=website';
  
  try {
    const results = await scraper.scrapeAdaptive(baseUrl, config.pages);
    
    if (results.success && config.saveData) {
      // Save results to file
      const timestamp = Date.now();
      const filename = `data/adaptive-scrape-${timestamp}.json`;
      
      await saveResults(filename, {
        timestamp: new Date().toISOString(),
        config,
        results: {
          listings: results.listings,
          stats: results.stats,
          completeness: results.completeness,
          marketplaceReport: results.marketplaceReport
        }
      });
      
      console.log(`\n💾 Results saved to: ${filename}`);
      
      // Save to database
      if (config.saveToDatabase !== false) {
        const dbResult = await saveToDatabase(results.listings, {
          sessionId: timestamp.toString(),
          ...results.stats,
          completeness: results.completeness,
          config
        });
        
        if (dbResult.success) {
          console.log(`\n🎉 Database integration complete!`);
          console.log(`📊 ${dbResult.saved} listings saved to database`);
        }
      }
    }
    
    // Print final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 MARKETPLACE ANALYSIS REPORT');
    console.log('='.repeat(60));
    const report = results.marketplaceReport;
    console.log(`Current Total: ${report.currentTotal || 'Unknown'}`);
    console.log(`Confidence: ${(report.confidence * 100).toFixed(1)}%`);
    console.log(`Marketplace Velocity: ${report.marketplaceVelocity}`);
    console.log(`Stability: ${report.isStable ? 'Stable' : 'Volatile'}`);
    console.log(`\nRecommendation: ${report.recommendation}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArguments(args) {
  const config = {
    pages: null, // null means adaptive
    adaptiveMode: true,
    headless: false,
    saveData: true,
    completenessTarget: 0.95
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.includes('=')) {
      const [key, value] = arg.split('=');
      switch (key) {
        case '--pages':
          config.pages = parseInt(value);
          config.adaptiveMode = false; // Fixed pages disables adaptive
          break;
        case '--target':
          config.completenessTarget = parseFloat(value) / 100;
          break;
      }
    } else {
      switch (arg) {
        case '--pages':
          if (args[i + 1] && !isNaN(parseInt(args[i + 1]))) {
            config.pages = parseInt(args[i + 1]);
            config.adaptiveMode = false;
            i++;
          }
          break;
        case '--headless':
          config.headless = true;
          break;
        case '--no-save':
          config.saveData = false;
          break;
        case '--adaptive':
          config.adaptiveMode = true;
          config.pages = null;
          break;
      }
    }
  }

  return config;
}

// Save results helper
async function saveResults(filename, data) {
  const dir = path.dirname(filename);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
}

// Database save helper (reuse from original scraper)
async function saveToDatabase(listings, metadata) {
  console.log('\n💾 Saving to Supabase database...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Transform and save listings
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `temp_${Date.now()}_${index}`,
      title: listing.title || '',
      price: listing.price || null,
      monthly_revenue: listing.monthlyRevenue || null,
      multiple: listing.multiple || null,
      multiple_text: listing.multipleType ? `${listing.multiple || ''}x ${listing.multipleType}` : '',
      property_type: listing.type || '',
      category: listing.category || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: listing.qualityScore || 0,
      extraction_confidence: 0.95,
      page_number: listing.pageNumber || 1,
      source: 'flippa',
      raw_data: listing
    }));
    
    // Clear previous data
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .neq('id', 0);
    
    if (!deleteError) {
      console.log('   ✅ Previous data cleared');
    }
    
    // Batch insert
    const batchSize = 200;
    let insertedCount = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      const { error } = await supabase
        .from('flippa_listings')
        .insert(batch);
        
      if (error) {
        console.error(`   ❌ Batch failed:`, error.message);
      } else {
        insertedCount += batch.length;
        console.log(`   ✅ Batch saved: ${batch.length} listings`);
      }
    }
    
    // Save session metadata
    const { error: metaError } = await supabase
      .from('scraping_sessions')
      .insert({
        session_id: metadata.sessionId,
        total_listings: listings.length,
        pages_processed: metadata.pagesProcessed || 0,
        success_rate: metadata.completeness?.percentage || 0,
        processing_time: metadata.processingTime || 0,
        started_at: new Date(Date.now() - (metadata.processingTime || 0)).toISOString(),
        completed_at: new Date().toISOString(),
        configuration: metadata.config || {}
      });
    
    console.log(`\n✅ Database save complete: ${insertedCount}/${listings.length} listings`);
    return { success: true, saved: insertedCount };
    
  } catch (error) {
    console.error('❌ Database save failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AdaptiveFlippaScraper;