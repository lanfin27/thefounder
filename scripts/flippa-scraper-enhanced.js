/**
 * Enhanced Flippa Scraper - Complete marketplace coverage with profit/revenue separation
 * Targets 5,904+ listings with accurate financial data extraction
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const MarketplaceTracker = require('./marketplace-tracker');

class EnhancedFlippaScraper {
  constructor(options = {}) {
    this.config = {
      timeout: 120000,
      headless: true,
      adaptiveMode: true,
      recheckInterval: 25,
      maxRetries: 3,
      completenessTarget: 0.95,
      expectedTotal: 5904, // Updated based on current market size
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
    this.allListings = new Map();
    this.pagesSeen = new Set();
    this.stats = {
      startTime: Date.now(),
      pagesProcessed: 0,
      listingsFound: 0,
      duplicatesSkipped: 0,
      errorsRecovered: 0,
      marketplaceChecks: 0,
      withProfit: 0,
      withRevenue: 0,
      withBothMultiples: 0
    };
  }

  /**
   * Enhanced marketplace detection for complete coverage
   */
  async detectCompleteMarketplaceState(page, recheckReason = 'initial') {
    try {
      this.logger.info(`🔍 ${recheckReason === 'initial' ? 'Detecting' : 'Rechecking'} complete marketplace state...`);
      
      // Navigate to search page
      const searchUrl = 'https://flippa.com/search?filter[property_type][]=website';
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for dynamic content
      await page.waitForSelector('body', { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Enhanced total detection with multiple strategies
      const detectionResult = await page.evaluate(() => {
        const strategies = [];
        
        // Strategy 1: Enhanced pagination analysis
        const paginationSelectors = [
          '.pagination',
          '[data-testid="pagination"]',
          '.pagination-container',
          '.page-navigation',
          'nav[aria-label*="pagination"]'
        ];
        
        for (const selector of paginationSelectors) {
          const paginationContainer = document.querySelector(selector);
          if (paginationContainer) {
            // Look for "X-Y of Z results" pattern
            const resultText = paginationContainer.textContent || '';
            const totalMatch = resultText.match(/of\s+([\d,]+)\s+results?/i);
            if (totalMatch) {
              const total = parseInt(totalMatch[1].replace(/,/g, ''));
              strategies.push({
                method: 'pagination_total_results',
                count: total,
                confidence: 'high',
                source: totalMatch[0]
              });
            }
            
            // Find highest page number
            const pageLinks = paginationContainer.querySelectorAll('a, button, .page-item');
            const pageNumbers = Array.from(pageLinks)
              .map(link => {
                const text = link.textContent || link.getAttribute('aria-label') || '';
                return parseInt(text.replace(/\D/g, ''));
              })
              .filter(num => !isNaN(num) && num > 0);
            
            if (pageNumbers.length > 0) {
              const maxPage = Math.max(...pageNumbers);
              const estimatedTotal = maxPage * 25;
              strategies.push({
                method: 'pagination_max_page',
                count: estimatedTotal,
                confidence: 'medium',
                source: `Max page: ${maxPage}`
              });
            }
          }
        }
        
        // Strategy 2: Enhanced text pattern search
        const textPatterns = [
          /(\d{1,3}(?:,\d{3})*)\s*results?\s*found/i,
          /showing[\s\d-]*of\s*(\d{1,3}(?:,\d{3})*)/i,
          /(\d{1,3}(?:,\d{3})*)\s*total\s*listings?/i,
          /(\d{1,3}(?:,\d{3})*)\s*websites?\s*available/i,
          /all\s*(\d{1,3}(?:,\d{3})*)\s*results?/i
        ];
        
        const pageText = document.body.textContent || '';
        for (const pattern of textPatterns) {
          const match = pageText.match(pattern);
          if (match) {
            const count = parseInt(match[1].replace(/,/g, ''));
            if (count > 1000 && count < 50000) {
              strategies.push({
                method: 'text_pattern_search',
                count,
                confidence: 'high',
                source: match[0]
              });
            }
          }
        }
        
        // Strategy 3: API data extraction
        if (window.__INITIAL_STATE__ || window.__DATA__) {
          const data = window.__INITIAL_STATE__ || window.__DATA__;
          if (data.search?.totalResults) {
            strategies.push({
              method: 'window_api_data',
              count: data.search.totalResults,
              confidence: 'very_high',
              source: 'window.__INITIAL_STATE__'
            });
          }
        }
        
        return {
          strategies,
          timestamp: new Date().toISOString(),
          url: window.location.href
        };
      });
      
      // Select best estimate
      let bestEstimate = null;
      if (detectionResult.strategies.length > 0) {
        const confidenceOrder = { very_high: 4, high: 3, medium: 2, low: 1 };
        const sorted = detectionResult.strategies.sort((a, b) => {
          const confDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
          if (confDiff !== 0) return confDiff;
          
          // Prefer counts closer to expected range (5000-7000)
          const aDistance = Math.abs(a.count - 6000);
          const bDistance = Math.abs(b.count - 6000);
          return aDistance - bDistance;
        });
        
        bestEstimate = sorted[0];
        
        this.logger.info(`📊 Detection Results: ${detectionResult.strategies.length} strategies`);
        detectionResult.strategies.forEach((strategy, index) => {
          const marker = index === 0 ? '✅' : '  ';
          this.logger.info(`   ${marker} ${strategy.method}: ${strategy.count.toLocaleString()} (${strategy.confidence})`);
        });
      }
      
      // Validate and set final estimate
      let finalEstimate = bestEstimate ? bestEstimate.count : this.config.expectedTotal;
      
      // Bounds checking
      if (finalEstimate < 2000) {
        this.logger.warn(`⚠️ Estimate too low (${finalEstimate}), using minimum`);
        finalEstimate = this.config.expectedTotal;
      }
      
      if (finalEstimate > 15000) {
        this.logger.warn(`⚠️ Estimate too high (${finalEstimate}), capping`);
        finalEstimate = 15000;
      }
      
      const requiredPages = Math.ceil(finalEstimate / 25);
      const bufferPages = Math.max(5, Math.ceil(requiredPages * 0.05));
      const totalPages = requiredPages + bufferPages;
      
      this.logger.info(`📊 Complete Marketplace State:`);
      this.logger.info(`   📈 Total Listings: ${finalEstimate.toLocaleString()}`);
      this.logger.info(`   📄 Required Pages: ${requiredPages} + ${bufferPages} buffer = ${totalPages}`);
      this.logger.info(`   ⏱️ Estimated Time: ${Math.round(totalPages * 5 / 60)} minutes`);
      
      return {
        totalListings: finalEstimate,
        requiredPages: totalPages,
        estimatedTimeMinutes: Math.round(totalPages * 5 / 60),
        detectionMethod: bestEstimate ? bestEstimate.method : 'fallback',
        confidence: bestEstimate ? bestEstimate.confidence : 'low'
      };
      
    } catch (error) {
      this.logger.error(`⚠️ Marketplace detection failed: ${error.message}`);
      return {
        totalListings: this.config.expectedTotal,
        requiredPages: Math.ceil(this.config.expectedTotal / 25) + 10,
        estimatedTimeMinutes: Math.round((this.config.expectedTotal / 25 + 10) * 5 / 60),
        detectionMethod: 'error_fallback',
        confidence: 'low'
      };
    }
  }

  /**
   * Enhanced extraction with profit/revenue separation
   */
  async extractEnhancedListings(page, pageNumber) {
    const listings = await page.evaluate((pageNum) => {
      const results = [];
      const elements = document.querySelectorAll('div[id^="listing-"]');
      
      elements.forEach((element) => {
        try {
          const listing = {
            pageNumber: pageNum,
            scraped_at: new Date().toISOString()
          };
          
          // Extract ID
          listing.id = element.id.replace('listing-', '');
          
          // Extract URL
          const link = element.querySelector('a[href^="/"]');
          if (link) {
            listing.url = `https://flippa.com${link.getAttribute('href')}`;
          }
          
          // Extract title
          let title = null;
          const titleSelectors = [
            'p.tw-text-gray-900',
            'h3, h4',
            '[class*="title"]',
            '[class*="heading"]'
          ];
          
          for (const selector of titleSelectors) {
            const elem = element.querySelector(selector);
            if (elem) {
              const text = elem.textContent.trim();
              if (text && text.length > 3) {
                title = text.split(/[,.]/)[0].trim();
                break;
              }
            }
          }
          
          listing.title = title || `Business #${listing.id}`;
          
          // Enhanced financial data extraction
          const financialData = {
            price: null,
            monthlyProfit: null,
            monthlyRevenue: null,
            profitMultiple: null,
            revenueMultiple: null
          };
          
          // Extract price
          const pricePatterns = [
            /\$\s?([\d,]+)(?!\s*(?:p\/mo|\/mo|monthly))/i,
            /USD\s*\$?\s?([\d,]+)(?!\s*(?:p\/mo|\/mo|monthly))/i,
            /Price:\s*\$?\s?([\d,]+)/i
          ];
          
          const fullText = element.textContent;
          for (const pattern of pricePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              financialData.price = parseInt(match[1].replace(/,/g, ''));
              break;
            }
          }
          
          // Extract profit - SPECIFIC patterns
          const profitPatterns = [
            /Net\s+Profit[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo|monthly)/i,
            /Monthly\s+Profit[^\d]*\$?\s?([\d,]+)/i,
            /Profit[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo)/i,
            /\$?\s?([\d,]+)\s*profit\s*(?:p\/mo|\/mo|monthly)/i
          ];
          
          for (const pattern of profitPatterns) {
            const match = fullText.match(pattern);
            if (match) {
              financialData.monthlyProfit = parseInt(match[1].replace(/,/g, ''));
              break;
            }
          }
          
          // Extract revenue - SPECIFIC patterns
          const revenuePatterns = [
            /Monthly\s+Revenue[^\d]*\$?\s?([\d,]+)/i,
            /Gross\s+Revenue[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo|monthly)/i,
            /Revenue[^\d]*\$?\s?([\d,]+)\s*(?:p\/mo|\/mo)/i,
            /\$?\s?([\d,]+)\s*revenue\s*(?:p\/mo|\/mo|monthly)/i
          ];
          
          for (const pattern of revenuePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              financialData.monthlyRevenue = parseInt(match[1].replace(/,/g, ''));
              break;
            }
          }
          
          // Fallback: If only one monthly value found, determine if profit or revenue
          if (!financialData.monthlyProfit && !financialData.monthlyRevenue) {
            const genericMonthlyPattern = /\$?\s?([\d,]+)\s*(?:p\/mo|\/mo|monthly)/i;
            const monthlyMatch = fullText.match(genericMonthlyPattern);
            if (monthlyMatch) {
              const value = parseInt(monthlyMatch[1].replace(/,/g, ''));
              // Default to profit as it's more common on Flippa
              financialData.monthlyProfit = value;
            }
          }
          
          // Extract multiples - BOTH types
          const multiplePatterns = [
            /([\d.]+)x\s+profit\s*[|\/]?\s*([\d.]+)x\s+revenue/i,
            /([\d.]+)x\s+revenue\s*[|\/]?\s*([\d.]+)x\s+profit/i,
            /([\d.]+)x\s+(profit|revenue)/i
          ];
          
          for (const pattern of multiplePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              if (match[3]) {
                // Single multiple found
                const value = parseFloat(match[1]);
                const type = match[2].toLowerCase();
                if (type === 'profit') {
                  financialData.profitMultiple = value;
                } else {
                  financialData.revenueMultiple = value;
                }
              } else {
                // Both multiples found
                if (match[0].toLowerCase().indexOf('profit') < match[0].toLowerCase().indexOf('revenue')) {
                  financialData.profitMultiple = parseFloat(match[1]);
                  financialData.revenueMultiple = parseFloat(match[2]);
                } else {
                  financialData.revenueMultiple = parseFloat(match[1]);
                  financialData.profitMultiple = parseFloat(match[2]);
                }
              }
            }
          }
          
          // Calculate missing multiples if possible
          if (financialData.price && financialData.monthlyProfit && !financialData.profitMultiple) {
            const annualProfit = financialData.monthlyProfit * 12;
            if (annualProfit > 0) {
              financialData.profitMultiple = Math.round((financialData.price / annualProfit) * 10) / 10;
            }
          }
          
          if (financialData.price && financialData.monthlyRevenue && !financialData.revenueMultiple) {
            const annualRevenue = financialData.monthlyRevenue * 12;
            if (annualRevenue > 0) {
              financialData.revenueMultiple = Math.round((financialData.price / annualRevenue) * 10) / 10;
            }
          }
          
          // Set financial data
          listing.price = financialData.price;
          listing.monthlyProfit = financialData.monthlyProfit;
          listing.monthlyRevenue = financialData.monthlyRevenue;
          listing.profitMultiple = financialData.profitMultiple;
          listing.revenueMultiple = financialData.revenueMultiple;
          
          // Create multiple text
          let multipleText = '';
          if (financialData.profitMultiple && financialData.revenueMultiple) {
            multipleText = `${financialData.profitMultiple}x profit | ${financialData.revenueMultiple}x revenue`;
          } else if (financialData.profitMultiple) {
            multipleText = `${financialData.profitMultiple}x profit`;
          } else if (financialData.revenueMultiple) {
            multipleText = `${financialData.revenueMultiple}x revenue`;
          }
          listing.multipleText = multipleText;
          
          // Extract business type
          const typeKeywords = ['SaaS', 'Content', 'Ecommerce', 'App', 'Service', 'Blog', 'Subscription', 'Marketplace'];
          for (const keyword of typeKeywords) {
            if (fullText.includes(keyword)) {
              listing.type = keyword;
              break;
            }
          }
          
          // Extract badges
          listing.badges = [];
          const badgeKeywords = [
            'Verified', 'Managed by Flippa', 'Sponsored',
            "Editor's Choice", 'Super Seller', 'Broker',
            'Premium', 'Featured', 'Hot', 'Trusted'
          ];
          
          for (const badge of badgeKeywords) {
            if (fullText.includes(badge)) {
              listing.badges.push(badge);
            }
          }
          
          // Calculate quality score
          listing.qualityScore = 0;
          if (listing.title && listing.title !== `Business #${listing.id}`) listing.qualityScore += 20;
          if (listing.price) listing.qualityScore += 20;
          if (listing.monthlyProfit) listing.qualityScore += 20;
          if (listing.monthlyRevenue) listing.qualityScore += 10;
          if (listing.profitMultiple) listing.qualityScore += 10;
          if (listing.revenueMultiple) listing.qualityScore += 10;
          if (listing.type) listing.qualityScore += 5;
          if (listing.badges.length > 0) listing.qualityScore += 5;
          
          // Set extraction confidence
          listing.extractionConfidence = listing.qualityScore / 100;
          
          // Mark complete financials
          listing.hasCompleteFinancials = !!(
            listing.price && 
            (listing.monthlyProfit || listing.monthlyRevenue) &&
            (listing.profitMultiple || listing.revenueMultiple)
          );
          
          results.push(listing);
          
        } catch (error) {
          console.error('Error extracting listing:', error);
        }
      });
      
      return results;
    }, pageNumber);
    
    return listings;
  }

  /**
   * Main scraping method with complete coverage
   */
  async scrapeComplete(baseUrl) {
    this.logger.info('🚀 Starting enhanced complete marketplace scraping...');
    
    const browser = await chromium.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Initial marketplace detection
      const marketplaceState = await this.detectCompleteMarketplaceState(page);
      
      // Start scraping
      let currentPage = 1;
      let consecutiveEmptyPages = 0;
      let lastRecheckPage = 0;
      const targetPages = marketplaceState.requiredPages;
      
      while (currentPage <= targetPages && consecutiveEmptyPages < 5) {
        // Periodic marketplace recheck
        if (currentPage - lastRecheckPage >= this.config.recheckInterval) {
          await this.detectCompleteMarketplaceState(page, 'periodic');
          lastRecheckPage = currentPage;
          this.stats.marketplaceChecks++;
        }
        
        // Scrape current page
        this.logger.info(`\n📄 Processing page ${currentPage}/${targetPages}...`);
        const pageUrl = currentPage === 1 ? baseUrl : `${baseUrl}&page=${currentPage}`;
        
        try {
          // Navigate to page
          await page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
          });
          
          // Wait for listings
          await page.waitForSelector('div[id^="listing-"]', {
            timeout: 30000,
            state: 'visible'
          });
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Extract enhanced listings
          const listings = await this.extractEnhancedListings(page, currentPage);
          
          if (listings.length > 0) {
            consecutiveEmptyPages = 0;
            
            // Process results
            let newListings = 0;
            let duplicates = 0;
            
            for (const listing of listings) {
              if (!this.allListings.has(listing.id)) {
                this.allListings.set(listing.id, listing);
                newListings++;
                
                // Update stats
                if (listing.monthlyProfit) this.stats.withProfit++;
                if (listing.monthlyRevenue) this.stats.withRevenue++;
                if (listing.profitMultiple && listing.revenueMultiple) this.stats.withBothMultiples++;
              } else {
                duplicates++;
              }
            }
            
            this.stats.pagesProcessed++;
            this.stats.listingsFound += newListings;
            this.stats.duplicatesSkipped += duplicates;
            
            this.logger.info(`   ✅ Page ${currentPage}: ${newListings} new, ${duplicates} duplicates`);
            this.logger.info(`   📊 Total unique: ${this.allListings.size}`);
            this.logger.info(`   💰 With profit: ${this.stats.withProfit}, With revenue: ${this.stats.withRevenue}`);
            
            // Adaptive delay
            const delay = 2000 + Math.random() * 2000 + (currentPage > 50 ? 1000 : 0);
            await new Promise(resolve => setTimeout(resolve, delay));
            
          } else {
            consecutiveEmptyPages++;
            this.logger.warn(`   ⚠️ Page ${currentPage}: No listings found`);
          }
          
        } catch (error) {
          this.logger.error(`   ❌ Page ${currentPage} error: ${error.message}`);
          consecutiveEmptyPages++;
          this.stats.errorsRecovered++;
        }
        
        currentPage++;
        
        // Check if we've reached sufficient coverage
        const coverage = (this.allListings.size / marketplaceState.totalListings) * 100;
        if (coverage >= this.config.completenessTarget * 100) {
          this.logger.info(`\n🎯 Target coverage reached: ${coverage.toFixed(1)}%`);
          break;
        }
      }
      
      // Final report
      const duration = (Date.now() - this.stats.startTime) / 1000;
      this.logger.info(`\n✅ Enhanced scraping completed!`);
      this.logger.info(`📊 Final Results:`);
      this.logger.info(`   - Total unique listings: ${this.allListings.size}`);
      this.logger.info(`   - Pages processed: ${this.stats.pagesProcessed}`);
      this.logger.info(`   - With profit data: ${this.stats.withProfit} (${(this.stats.withProfit/this.allListings.size*100).toFixed(1)}%)`);
      this.logger.info(`   - With revenue data: ${this.stats.withRevenue} (${(this.stats.withRevenue/this.allListings.size*100).toFixed(1)}%)`);
      this.logger.info(`   - With both multiples: ${this.stats.withBothMultiples} (${(this.stats.withBothMultiples/this.allListings.size*100).toFixed(1)}%)`);
      this.logger.info(`   - Time elapsed: ${duration.toFixed(1)}s`);
      this.logger.info(`   - Coverage: ${((this.allListings.size / marketplaceState.totalListings) * 100).toFixed(1)}%`);
      
      return {
        success: true,
        listings: Array.from(this.allListings.values()),
        stats: this.stats,
        coverage: (this.allListings.size / marketplaceState.totalListings) * 100,
        duration: duration
      };
      
    } catch (error) {
      this.logger.error(`❌ Fatal error: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

// Database save function with new schema
async function saveToDatabase(listings, metadata) {
  console.log('\n💾 Saving to Supabase with enhanced schema...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Clear previous data
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .neq('id', 0);
    
    if (!deleteError) {
      console.log('   ✅ Previous data cleared');
    }
    
    // Transform listings for new schema
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `temp_${Date.now()}_${index}`,
      title: listing.title || '',
      price: listing.price || null,
      monthly_profit: listing.monthlyProfit || null,
      monthly_revenue: listing.monthlyRevenue || null,
      profit_multiple: listing.profitMultiple || null,
      revenue_multiple: listing.revenueMultiple || null,
      multiple_text: listing.multipleText || '',
      property_type: listing.type || '',
      category: listing.category || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: listing.qualityScore || 0,
      extraction_confidence: listing.extractionConfidence || 0,
      has_complete_financials: listing.hasCompleteFinancials || false,
      page_number: listing.pageNumber || 1,
      source: 'flippa',
      raw_data: listing
    }));
    
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
        session_id: metadata.sessionId || Date.now().toString(),
        total_listings: listings.length,
        pages_processed: metadata.pagesProcessed || 0,
        success_rate: metadata.successRate || 0,
        processing_time: metadata.duration || 0,
        started_at: new Date(Date.now() - (metadata.duration || 0) * 1000).toISOString(),
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

// Parse arguments
function parseArguments(args) {
  const config = {
    headless: false,
    saveData: true,
    target: 95
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--headless':
        config.headless = true;
        break;
      case '--no-save':
        config.saveData = false;
        break;
      case '--target':
        if (args[i + 1]) {
          config.target = parseInt(args[i + 1]);
          i++;
        }
        break;
    }
  }

  return config;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const config = parseArguments(args);
  
  console.log(`\n🎯 Enhanced Flippa Scraper Configuration:`);
  console.log(`   Target Coverage: ${config.target}%`);
  console.log(`   Expected Total: 5,904+ listings`);
  console.log(`   Headless: ${config.headless ? 'Yes' : 'No'}`);
  console.log(`   Save to Database: ${config.saveData ? 'Yes' : 'No'}\n`);
  
  const scraper = new EnhancedFlippaScraper({
    headless: config.headless,
    completenessTarget: config.target / 100
  });
  
  const baseUrl = 'https://flippa.com/search?filter[property_type][]=website';
  
  try {
    const results = await scraper.scrapeComplete(baseUrl);
    
    if (results.success && config.saveData) {
      // Save to file
      const timestamp = Date.now();
      const filename = `data/enhanced-scrape-${timestamp}.json`;
      
      await fs.mkdir('data', { recursive: true });
      await fs.writeFile(filename, JSON.stringify({
        timestamp: new Date().toISOString(),
        config,
        results
      }, null, 2));
      
      console.log(`\n💾 Results saved to: ${filename}`);
      
      // Save to database
      const dbResult = await saveToDatabase(results.listings, {
        sessionId: timestamp.toString(),
        ...results.stats,
        duration: results.duration,
        successRate: results.coverage,
        config
      });
      
      if (dbResult.success) {
        console.log(`\n🎉 Enhanced scraping complete!`);
        console.log(`📊 ${dbResult.saved} listings with profit/revenue data saved`);
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EnhancedFlippaScraper;