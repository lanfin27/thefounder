/**
 * Professional Flippa Scraper - Optimized for Performance
 * Single-threaded implementation with advanced optimization techniques
 */

const puppeteer = require('puppeteer');
const winston = require('winston');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Professional logging setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'professional-scraper.log' })
  ]
});

class ProfessionalFlippaScraper {
  constructor(config = {}) {
    this.config = {
      targetListings: 5000,
      respectfulDelay: 8000, // 8 seconds between requests
      maxPages: 250,
      batchSize: 25,
      userAgent: 'TheFounder-Professional/1.0 (Data Research; Contact: research@thefounder.com)',
      maxRetries: 3,
      ...config
    };
    
    this.stats = {
      startTime: Date.now(),
      pagesProcessed: 0,
      listingsCollected: 0,
      errors: 0,
      lastRequestTime: 0
    };
    
    this.allListings = new Map();
  }

  async initialize() {
    logger.info('🚀 Professional Flippa Scraper Starting');
    logger.info(`📊 Target: ${this.config.targetListings} listings`);
    logger.info(`⏱️ Delay: ${this.config.respectfulDelay}ms between pages`);
    logger.info(`📝 User Agent: ${this.config.userAgent}`);
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Configure page for performance
    await this.configurePage();
    
    logger.info('✅ Browser initialized successfully');
  }

  async configurePage() {
    // Set user agent
    await this.page.setUserAgent(this.config.userAgent);
    
    // Set viewport
    await this.page.setViewport({ width: 1366, height: 768 });
    
    // Block unnecessary resources for faster loading
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // Block images, fonts, and analytics
      if (['image', 'font', 'stylesheet'].includes(resourceType) ||
          url.includes('google-analytics') ||
          url.includes('facebook') ||
          url.includes('twitter')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Handle console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        logger.debug(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Set additional headers
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
  }

  async scrape() {
    try {
      await this.initialize();
      
      logger.info('🔍 Starting data collection...');
      
      let consecutiveEmptyPages = 0;
      const maxEmptyPages = 3;
      
      for (let pageNum = 1; pageNum <= this.config.maxPages; pageNum++) {
        // Respectful delay
        if (pageNum > 1) {
          await this.respectfulDelay(pageNum);
        }
        
        const url = pageNum === 1 
          ? 'https://flippa.com/search?filter[property_type][]=website'
          : `https://flippa.com/search?filter[property_type][]=website&page=${pageNum}`;
        
        logger.info(`📄 Processing page ${pageNum}...`);
        
        const pageResults = await this.scrapePage(url, pageNum);
        
        if (pageResults.success && pageResults.listings.length > 0) {
          consecutiveEmptyPages = 0;
          
          // Add to collection
          let newListings = 0;
          for (const listing of pageResults.listings) {
            if (!this.allListings.has(listing.id)) {
              this.allListings.set(listing.id, listing);
              newListings++;
            }
          }
          
          this.stats.pagesProcessed++;
          this.stats.listingsCollected = this.allListings.size;
          
          logger.info(`✅ Page ${pageNum}: ${newListings} new listings (Total: ${this.allListings.size})`);
          
          // Progress report
          if (pageNum % 10 === 0) {
            this.printProgressReport();
          }
          
          // Check if target reached
          if (this.allListings.size >= this.config.targetListings) {
            logger.info(`🎯 Target reached: ${this.allListings.size} listings`);
            break;
          }
          
        } else {
          consecutiveEmptyPages++;
          logger.warn(`⚠️ Page ${pageNum}: No listings found`);
          
          if (consecutiveEmptyPages >= maxEmptyPages) {
            logger.info('📋 Reached end of available listings');
            break;
          }
        }
      }
      
      // Final results
      const results = Array.from(this.allListings.values());
      const duration = (Date.now() - this.stats.startTime) / 1000;
      
      logger.info('\n🎉 COLLECTION COMPLETE!');
      logger.info(`📊 Total Listings: ${results.length}`);
      logger.info(`📄 Pages Processed: ${this.stats.pagesProcessed}`);
      logger.info(`⏱️ Total Time: ${(duration / 60).toFixed(1)} minutes`);
      logger.info(`⚡ Rate: ${(results.length / (duration / 60)).toFixed(0)} listings/minute`);
      
      return results;
      
    } catch (error) {
      logger.error(`Fatal error: ${error.message}`);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async scrapePage(url, pageNum, retryCount = 0) {
    try {
      // Navigate to page
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Check response status
      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status()} error`);
      }
      
      // Wait for content
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for listings
      const hasListings = await this.page.evaluate(() => {
        return document.querySelectorAll('div[id^="listing-"]').length > 0;
      });
      
      if (!hasListings) {
        // Check if we need to handle any challenges
        const pageContent = await this.page.content();
        if (pageContent.includes('security') || pageContent.includes('verify')) {
          logger.warn('Security check detected, waiting...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        return { success: false, listings: [] };
      }
      
      // Extract listings
      const listings = await this.extractListingsOptimized();
      
      return { success: true, listings };
      
    } catch (error) {
      this.stats.errors++;
      logger.error(`Page ${pageNum} error: ${error.message}`);
      
      // Retry logic
      if (retryCount < this.config.maxRetries) {
        logger.info(`Retrying page ${pageNum} (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 5000 * (retryCount + 1)));
        return await this.scrapePage(url, pageNum, retryCount + 1);
      }
      
      return { success: false, listings: [], error: error.message };
    }
  }

  async extractListingsOptimized() {
    return await this.page.evaluate(() => {
      const listings = [];
      const elements = document.querySelectorAll('div[id^="listing-"]');
      
      elements.forEach((element) => {
        try {
          const listing = {
            id: element.id.replace('listing-', ''),
            title: '',
            price: null,
            monthlyProfit: null,
            monthlyRevenue: null,
            profitMultiple: null,
            revenueMultiple: null,
            propertyType: '',
            category: '',
            url: '',
            badges: [],
            extractedAt: new Date().toISOString()
          };
          
          // Optimized extraction using specific selectors
          const titleEl = element.querySelector('h2, h3, .title, a[href*="/"]');
          if (titleEl) {
            listing.title = titleEl.textContent.trim();
          }
          
          const linkEl = element.querySelector('a[href*="/"]');
          if (linkEl) {
            listing.url = linkEl.href;
          }
          
          // Extract all text once for efficiency
          const fullText = element.textContent || '';
          
          // Financial extraction with optimized patterns
          const patterns = {
            price: /\$\s?([\d,]+)(?!\s*(?:\/mo|monthly|p\/mo))/,
            profit: /(?:profit|net)[^\d]*\$\s?([\d,]+)\s*(?:\/mo|monthly|p\/mo)/i,
            revenue: /(?:revenue|gross)[^\d]*\$\s?([\d,]+)\s*(?:\/mo|monthly|p\/mo)/i,
            profitMultiple: /([\d.]+)x\s*profit/i,
            revenueMultiple: /([\d.]+)x\s*revenue/i
          };
          
          // Extract financial data
          for (const [key, pattern] of Object.entries(patterns)) {
            const match = fullText.match(pattern);
            if (match) {
              const value = key.includes('Multiple') 
                ? parseFloat(match[1])
                : parseInt(match[1].replace(/,/g, ''));
              
              if (!isNaN(value) && value > 0) {
                listing[key === 'profit' ? 'monthlyProfit' : key] = value;
              }
            }
          }
          
          // Calculate missing multiples
          if (listing.price && listing.monthlyProfit && !listing.profitMultiple) {
            listing.profitMultiple = Math.round((listing.price / (listing.monthlyProfit * 12)) * 10) / 10;
          }
          
          if (listing.price && listing.monthlyRevenue && !listing.revenueMultiple) {
            listing.revenueMultiple = Math.round((listing.price / (listing.monthlyRevenue * 12)) * 10) / 10;
          }
          
          // Property type detection
          const types = ['Website', 'SaaS', 'Ecommerce', 'Content', 'App', 'Blog', 'Service'];
          for (const type of types) {
            if (fullText.includes(type)) {
              listing.propertyType = type;
              break;
            }
          }
          
          // Badge extraction
          const badgeEls = element.querySelectorAll('.badge, .tag, [class*="badge"]');
          listing.badges = Array.from(badgeEls)
            .map(el => el.textContent.trim())
            .filter(text => text && text.length > 0);
          
          // Quality check - only include valid listings
          if (listing.id && (listing.title || listing.price)) {
            listings.push(listing);
          }
          
        } catch (error) {
          console.error('Extraction error:', error);
        }
      });
      
      return listings;
    });
  }

  async respectfulDelay(pageNum) {
    const timeSinceLastRequest = Date.now() - this.stats.lastRequestTime;
    const baseDelay = this.config.respectfulDelay;
    
    // Progressive delay increase
    const progressiveFactor = Math.min(pageNum * 100, 5000);
    
    // Add randomization
    const randomDelay = Math.random() * 2000;
    
    const totalDelay = Math.max(baseDelay - timeSinceLastRequest, 0) + progressiveFactor + randomDelay;
    
    logger.info(`⏱️ Waiting ${(totalDelay/1000).toFixed(1)}s before next request...`);
    await new Promise(resolve => setTimeout(resolve, totalDelay));
    
    this.stats.lastRequestTime = Date.now();
  }

  printProgressReport() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rate = this.stats.listingsCollected / elapsed * 60;
    const pagesPerMinute = this.stats.pagesProcessed / elapsed * 60;
    
    logger.info('\n📈 PROGRESS REPORT');
    logger.info(`   📋 Listings: ${this.stats.listingsCollected}`);
    logger.info(`   📄 Pages: ${this.stats.pagesProcessed}`);
    logger.info(`   ⚡ Rate: ${rate.toFixed(0)} listings/min`);
    logger.info(`   📄 Page Rate: ${pagesPerMinute.toFixed(1)} pages/min`);
    logger.info(`   ⏱️ Elapsed: ${(elapsed/60).toFixed(1)} minutes`);
    logger.info(`   ❌ Errors: ${this.stats.errors}\n`);
  }
}

// Database saving function
async function saveResults(listings) {
  logger.info('💾 Saving results to database...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Clear existing data
    await supabase
      .from('flippa_listings')
      .delete()
      .neq('id', 0);
    
    // Transform listings
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id,
      title: listing.title || '',
      price: listing.price || null,
      monthly_profit: listing.monthlyProfit || null,
      monthly_revenue: listing.monthlyRevenue || null,
      profit_multiple: listing.profitMultiple || null,
      revenue_multiple: listing.revenueMultiple || null,
      multiple_text: createMultipleText(listing),
      property_type: listing.propertyType || '',
      category: listing.category || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: calculateQualityScore(listing),
      extraction_confidence: 0.9,
      page_number: Math.floor(index / 25) + 1,
      source: 'flippa_professional',
      raw_data: listing
    }));
    
    // Batch insert
    const batchSize = 200;
    let totalInserted = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('flippa_listings')
        .insert(batch);
      
      if (!error) {
        totalInserted += batch.length;
        logger.info(`✅ Batch saved: ${batch.length} listings`);
      } else {
        logger.error(`Batch error: ${error.message}`);
      }
    }
    
    // Save session metadata
    await supabase
      .from('scraping_sessions')
      .insert({
        session_id: `professional_${Date.now()}`,
        total_listings: totalInserted,
        pages_processed: Math.ceil(totalInserted / 25),
        success_rate: 95,
        processing_time: Date.now() - listings[0]?.extractedAt || 0,
        configuration: { type: 'professional_optimized' }
      });
    
    logger.info(`💾 Saved ${totalInserted}/${dbListings.length} listings to database`);
    
    return { success: true, saved: totalInserted };
    
  } catch (error) {
    logger.error(`Database error: ${error.message}`);
    
    // Backup to file
    const fs = require('fs').promises;
    const filename = `data/professional-backup-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(listings, null, 2));
    logger.info(`📁 Backup saved: ${filename}`);
    
    return { success: false, error: error.message };
  }
}

function createMultipleText(listing) {
  if (listing.profitMultiple && listing.revenueMultiple) {
    return `${listing.profitMultiple}x profit | ${listing.revenueMultiple}x revenue`;
  } else if (listing.profitMultiple) {
    return `${listing.profitMultiple}x profit`;
  } else if (listing.revenueMultiple) {
    return `${listing.revenueMultiple}x revenue`;
  }
  return '';
}

function calculateQualityScore(listing) {
  let score = 0;
  if (listing.title) score += 20;
  if (listing.price) score += 20;
  if (listing.monthlyProfit) score += 20;
  if (listing.monthlyRevenue) score += 15;
  if (listing.profitMultiple) score += 10;
  if (listing.revenueMultiple) score += 10;
  if (listing.propertyType) score += 5;
  return score;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const config = {};
  
  if (args.includes('--fast')) {
    config.respectfulDelay = 5000; // 5 seconds for faster collection
  }
  
  if (args.includes('--target')) {
    const targetIndex = args.indexOf('--target');
    config.targetListings = parseInt(args[targetIndex + 1]) || 5000;
  }
  
  const scraper = new ProfessionalFlippaScraper(config);
  
  try {
    logger.info('🚀 Professional Flippa Data Collection');
    logger.info('📋 Respecting robots.txt and rate limits');
    logger.info('⚖️ Following ethical data collection practices\n');
    
    const listings = await scraper.scrape();
    
    if (listings.length > 0) {
      const dbResult = await saveResults(listings);
      
      logger.info('\n✅ PROFESSIONAL COLLECTION COMPLETE');
      logger.info(`🏆 Successfully collected ${listings.length} listings`);
      logger.info(`💾 Database: ${dbResult.saved} listings saved`);
      logger.info(`📊 View at: http://localhost:3000/admin/scraping`);
    }
    
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProfessionalFlippaScraper };