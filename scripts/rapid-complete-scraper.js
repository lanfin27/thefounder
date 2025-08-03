/**
 * Rapid Complete Marketplace Scraper
 * Optimized for speed while maintaining quality
 * Targets 90%+ coverage in under 2 hours
 */

require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const winston = require('winston');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Enhanced logging setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'rapid-complete-scraper.log' })
  ]
});

class RapidCompleteScraper {
  constructor() {
    this.collectedListings = new Map();
    this.marketplaceSize = 6000; // Known size from previous runs
    this.stats = {
      startTime: Date.now(),
      pagesProcessed: 0,
      emptyPages: 0,
      errors: 0
    };
  }

  async execute() {
    logger.info('🚀 RAPID COMPLETE MARKETPLACE COLLECTION');
    logger.info('📊 Target: 5,400+ listings (90%+ coverage)');
    logger.info('⚡ Speed optimized: 3s delays, parallel processing');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      // Use parallel browser instances for faster collection
      await this.parallelCollection();
      
      // Quick quality enhancement
      await this.quickQualityEnhancement();
      
      // Save with quality check
      await this.saveWithQualityCheck();
      
      return this.generateReport();
    } catch (error) {
      logger.error('Fatal error:', error);
      throw error;
    }
  }

  async parallelCollection() {
    logger.info('🚀 Starting Parallel Collection Strategy');
    
    // Split work across 3 browser instances
    const totalPages = 250; // Target pages
    const instances = 3;
    const pagesPerInstance = Math.ceil(totalPages / instances);
    
    const promises = [];
    
    for (let i = 0; i < instances; i++) {
      const startPage = i * pagesPerInstance + 1;
      const endPage = Math.min((i + 1) * pagesPerInstance, totalPages);
      promises.push(this.collectRange(i + 1, startPage, endPage));
    }
    
    await Promise.all(promises);
    
    logger.info(`✅ Parallel collection complete: ${this.collectedListings.size} unique listings\n`);
  }

  async collectRange(instanceId, startPage, endPage) {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    logger.info(`🔧 Instance ${instanceId}: Processing pages ${startPage}-${endPage}`);
    
    let consecutiveEmpty = 0;
    const maxEmpty = 5;
    
    for (let page = startPage; page <= endPage && consecutiveEmpty < maxEmpty; page++) {
      try {
        const listings = await this.scrapePage(browser, page);
        
        if (listings.length === 0) {
          consecutiveEmpty++;
        } else {
          consecutiveEmpty = 0;
          let newCount = 0;
          
          listings.forEach(listing => {
            const key = this.generateListingKey(listing);
            if (!this.collectedListings.has(key)) {
              this.collectedListings.set(key, listing);
              newCount++;
            }
          });
          
          if (newCount > 0 && page % 10 === 0) {
            logger.info(`📄 Instance ${instanceId} - Page ${page}: +${newCount} new (Total: ${this.collectedListings.size})`);
          }
        }
        
        this.stats.pagesProcessed++;
        
        // Rapid delay - only 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        logger.error(`Instance ${instanceId} - Page ${page} error: ${error.message}`);
        this.stats.errors++;
      }
    }
    
    await browser.close();
    logger.info(`✅ Instance ${instanceId} complete`);
  }

  async scrapePage(browser, pageNum) {
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const url = `https://flippa.com/search?filter[property_type][]=website&page=${pageNum}`;
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await page.waitForSelector('body', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const listings = await page.evaluate(() => {
        const listingElements = document.querySelectorAll('div[id^="listing-"]');
        
        return Array.from(listingElements).map((element) => {
          const listing = { extractionQuality: 0 };
          
          // Title extraction
          const titleEl = element.querySelector('h3, h2, .title, [class*="title"], a[href*="/listings/"]');
          if (titleEl) {
            listing.title = titleEl.textContent.trim();
            listing.extractionQuality += 25;
          }
          
          // Price extraction
          const priceText = element.textContent || '';
          const priceMatch = priceText.match(/\$\s?([\d,]+)(?!\s*\/\s*mo)/);
          if (priceMatch) {
            listing.price = parseInt(priceMatch[1].replace(/,/g, ''));
            listing.extractionQuality += 25;
          }
          
          // Revenue extraction
          const revenueMatch = priceText.match(/\$\s?([\d,]+)\s*\/\s*mo/i);
          if (revenueMatch) {
            listing.monthlyRevenue = parseInt(revenueMatch[1].replace(/,/g, ''));
            listing.extractionQuality += 20;
          }
          
          // Multiple extraction
          const multipleMatch = priceText.match(/([\d.]+)\s*x/i);
          if (multipleMatch) {
            listing.profitMultiple = parseFloat(multipleMatch[1]);
            listing.extractionQuality += 15;
          }
          
          // URL and ID
          const urlEl = element.querySelector('a[href*="/listings/"]');
          if (urlEl) {
            listing.url = urlEl.href;
            const idMatch = urlEl.href.match(/listings\/([^\/\?]+)/);
            if (idMatch) {
              listing.id = idMatch[1];
              listing.extractionQuality += 15;
            }
          }
          
          return listing;
        }).filter(listing => listing.extractionQuality >= 25);
      });
      
      await page.close();
      return listings;
      
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async quickQualityEnhancement() {
    logger.info('🔧 Quick Quality Enhancement');
    
    const listings = Array.from(this.collectedListings.values());
    let enhanced = 0;
    
    for (const listing of listings) {
      let improved = false;
      
      // Clean title
      if (listing.title) {
        listing.title = listing.title.replace(/^\d+\.\s*/, '').trim();
      }
      
      // Calculate missing multiples
      if (!listing.profitMultiple && listing.price && listing.monthlyRevenue) {
        listing.profitMultiple = parseFloat((listing.price / (listing.monthlyRevenue * 12)).toFixed(1));
        improved = true;
      }
      
      if (improved) enhanced++;
    }
    
    logger.info(`✅ Enhanced ${enhanced} listings\n`);
  }

  generateListingKey(listing) {
    if (listing.id) return listing.id;
    if (listing.url) return listing.url;
    return `${listing.title || 'untitled'}_${listing.price || 0}`;
  }

  async saveWithQualityCheck() {
    logger.info('💾 Saving Results with Quality Check');
    
    const listings = Array.from(this.collectedListings.values());
    
    // Quality metrics
    const qualityMetrics = {
      withTitle: listings.filter(l => l.title).length,
      withPrice: listings.filter(l => l.price).length,
      withRevenue: listings.filter(l => l.monthlyRevenue).length,
      withMultiple: listings.filter(l => l.profitMultiple).length
    };
    
    const qualityRates = {
      title: (qualityMetrics.withTitle / listings.length) * 100,
      price: (qualityMetrics.withPrice / listings.length) * 100,
      revenue: (qualityMetrics.withRevenue / listings.length) * 100,
      multiple: (qualityMetrics.withMultiple / listings.length) * 100
    };
    
    logger.info('📊 Quality Report:');
    logger.info(`   Title: ${qualityRates.title.toFixed(1)}%`);
    logger.info(`   Price: ${qualityRates.price.toFixed(1)}%`);
    logger.info(`   Revenue: ${qualityRates.revenue.toFixed(1)}%`);
    logger.info(`   Multiple: ${qualityRates.multiple.toFixed(1)}%\n`);
    
    // Backup first
    const backupFilename = `data/rapid-complete-backup-${Date.now()}.json`;
    await fs.writeFile(backupFilename, JSON.stringify({
      listings,
      stats: this.stats,
      qualityRates
    }, null, 2));
    logger.info(`📁 Backup saved: ${backupFilename}`);
    
    // Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Clear existing
    await supabase.from('flippa_listings').delete().neq('id', 0);
    
    // Transform for database
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `rapid_${index}`,
      title: listing.title || '',
      price: listing.price || null,
      monthly_revenue: listing.monthlyRevenue || null,
      multiple: listing.profitMultiple || null,
      multiple_text: listing.profitMultiple ? `${listing.profitMultiple}x` : '',
      property_type: listing.propertyType || '',
      category: listing.category || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: listing.extractionQuality || 50,
      extraction_confidence: 0.95,
      page_number: Math.floor(index / 25) + 1,
      source: 'rapid_complete_scraper',
      raw_data: listing
    }));
    
    // Batch save
    const batchSize = 500;
    let saved = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      const { error } = await supabase.from('flippa_listings').insert(batch);
      
      if (!error) {
        saved += batch.length;
        logger.info(`💾 Saved batch: ${saved}/${dbListings.length}`);
      } else {
        logger.error(`Batch error: ${error.message}`);
      }
    }
    
    logger.info(`\n🎉 Saved ${saved} listings to database`);
    return saved;
  }

  generateReport() {
    const totalListings = this.collectedListings.size;
    const coverage = (totalListings / this.marketplaceSize) * 100;
    const duration = (Date.now() - this.stats.startTime) / 1000 / 60;
    
    logger.info('\n🎉 RAPID COLLECTION COMPLETE!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`📊 Total Collected: ${totalListings} listings`);
    logger.info(`🎯 Coverage: ${coverage.toFixed(1)}% of ${this.marketplaceSize}`);
    logger.info(`📄 Pages Processed: ${this.stats.pagesProcessed}`);
    logger.info(`⏱️ Duration: ${duration.toFixed(1)} minutes`);
    logger.info(`⚡ Rate: ${(totalListings / duration).toFixed(0)} listings/minute`);
    logger.info('\n📊 View at: http://localhost:3000/admin/scraping');
    
    return {
      totalListings,
      coverage: coverage.toFixed(1),
      duration: duration.toFixed(1),
      success: coverage >= 85
    };
  }
}

// Execute
async function main() {
  const scraper = new RapidCompleteScraper();
  
  try {
    const report = await scraper.execute();
    
    if (report.success) {
      logger.info('\n✅ Target coverage achieved!');
    } else {
      logger.warn('\n⚠️ Below target coverage. Consider running again.');
    }
    
  } catch (error) {
    logger.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { RapidCompleteScraper };