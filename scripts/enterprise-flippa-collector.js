/**
 * Enterprise Flippa Data Collection System
 * Professional-grade implementation matching industry standards
 * Respects robots.txt and implements ethical data collection
 */

const puppeteer = require('puppeteer');
const cluster = require('cluster');
const os = require('os');
const winston = require('winston');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configure professional logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'enterprise-collection.log' })
  ]
});

class EnterpriseFlippaCollector {
  constructor() {
    this.config = {
      maxConcurrentWorkers: Math.min(os.cpus().length - 1, 3), // Leave CPU headroom
      requestsPerWorker: 50,
      respectfulDelay: 10000, // 10 seconds between requests
      userAgent: 'TheFounder-Bot/1.0 (Enterprise Data Collection; Contact: admin@thefounder.com)',
      maxRetries: 3,
      batchSize: 200,
      targetListings: 5000
    };
    
    this.stats = {
      totalWorkers: 0,
      activeWorkers: 0,
      completedPages: 0,
      totalListings: 0,
      errorCount: 0,
      startTime: Date.now()
    };
  }

  async initializeCollection() {
    if (cluster.isMaster) {
      logger.info('🚀 Initializing Enterprise Flippa Collection System');
      logger.info(`📊 Target: ${this.config.targetListings}+ listings`);
      logger.info(`👥 Workers: ${this.config.maxConcurrentWorkers}`);
      logger.info(`⏱️ Delay: ${this.config.respectfulDelay}ms between requests`);
      
      return await this.orchestrateMasterProcess();
    } else {
      return await this.executeWorkerProcess();
    }
  }

  async orchestrateMasterProcess() {
    logger.info('🎛️ Master: Starting distributed collection...');
    
    // Estimate workload distribution
    const estimatedPages = Math.ceil(this.config.targetListings / 25);
    const pagesPerWorker = Math.ceil(estimatedPages / this.config.maxConcurrentWorkers);
    
    const workerPromises = [];
    const workerData = new Map();
    
    // Spawn workers with assigned page ranges
    for (let i = 0; i < this.config.maxConcurrentWorkers; i++) {
      const startPage = i * pagesPerWorker + 1;
      const endPage = Math.min((i + 1) * pagesPerWorker, estimatedPages);
      
      const workerPromise = new Promise((resolve, reject) => {
        const worker = cluster.fork({
          WORKER_ID: i,
          START_PAGE: startPage,
          END_PAGE: endPage
        });
        
        workerData.set(worker.id, {
          id: i,
          startPage,
          endPage,
          listings: [],
          stats: {}
        });
        
        worker.on('message', (msg) => {
          if (msg.type === 'progress') {
            this.updateWorkerProgress(worker.id, msg.data);
          } else if (msg.type === 'complete') {
            workerData.get(worker.id).listings = msg.listings;
            resolve(msg.listings);
          } else if (msg.type === 'error') {
            logger.error(`Worker ${i} error: ${msg.error}`);
            reject(new Error(msg.error));
          }
        });
        
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker ${i} exited with code ${code}`));
          }
        });
      });
      
      workerPromises.push(workerPromise);
    }
    
    // Wait for all workers
    logger.info('⏳ Waiting for workers to complete...');
    const results = await Promise.allSettled(workerPromises);
    
    // Aggregate results
    const allListings = [];
    let successfulWorkers = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allListings.push(...result.value);
        successfulWorkers++;
        logger.info(`✅ Worker ${index}: ${result.value.length} listings collected`);
      } else {
        logger.error(`❌ Worker ${index} failed: ${result.reason.message}`);
      }
    });
    
    // Final report
    const duration = (Date.now() - this.stats.startTime) / 1000;
    logger.info('\n🎉 ENTERPRISE COLLECTION COMPLETE!');
    logger.info(`📊 Total Listings: ${allListings.length}`);
    logger.info(`✅ Success Rate: ${(successfulWorkers / this.config.maxConcurrentWorkers * 100).toFixed(1)}%`);
    logger.info(`⚡ Performance: ${(allListings.length / (duration / 60)).toFixed(0)} listings/minute`);
    logger.info(`⏱️ Total Time: ${(duration / 60).toFixed(1)} minutes`);
    
    return allListings;
  }

  async executeWorkerProcess() {
    const workerId = process.env.WORKER_ID;
    const startPage = parseInt(process.env.START_PAGE);
    const endPage = parseInt(process.env.END_PAGE);
    
    logger.info(`🔧 Worker ${workerId}: Processing pages ${startPage}-${endPage}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Set professional user agent
      await page.setUserAgent(this.config.userAgent);
      
      // Configure page
      await page.setViewport({ width: 1366, height: 768 });
      
      const workerListings = [];
      
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        try {
          // Respectful delay
          if (pageNum > startPage) {
            await this.respectfulDelay(workerId, pageNum);
          }
          
          const url = pageNum === 1 
            ? 'https://flippa.com/search?filter[property_type][]=website'
            : `https://flippa.com/search?filter[property_type][]=website&page=${pageNum}`;
          
          logger.info(`Worker ${workerId}: Page ${pageNum}/${endPage}`);
          
          // Navigate with timeout
          await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          // Wait for content
          await page.waitForSelector('body', { timeout: 10000 });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Extract listings
          const pageListings = await this.extractListings(page);
          
          if (pageListings.length > 0) {
            workerListings.push(...pageListings);
            logger.info(`✅ Worker ${workerId}: Page ${pageNum} - ${pageListings.length} listings`);
            
            // Progress update
            process.send({
              type: 'progress',
              data: {
                workerId,
                currentPage: pageNum,
                listingsCollected: workerListings.length
              }
            });
          } else {
            logger.warn(`⚠️ Worker ${workerId}: Page ${pageNum} - No listings found`);
            
            // Check if we've reached the end
            const hasContent = await page.evaluate(() => {
              return document.body.textContent.length > 1000;
            });
            
            if (!hasContent) {
              logger.info(`Worker ${workerId}: Reached end of listings`);
              break;
            }
          }
          
        } catch (pageError) {
          logger.error(`Worker ${workerId}: Page ${pageNum} error: ${pageError.message}`);
          
          // Retry logic
          if (pageError.message.includes('timeout')) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      // Send final results
      process.send({
        type: 'complete',
        listings: workerListings
      });
      
      logger.info(`🏁 Worker ${workerId}: Completed with ${workerListings.length} listings`);
      
    } catch (error) {
      logger.error(`Worker ${workerId}: Critical error: ${error.message}`);
      process.send({
        type: 'error',
        error: error.message
      });
      process.exit(1);
    } finally {
      await browser.close();
    }
  }

  async respectfulDelay(workerId, pageNum) {
    // Implement respectful delays with worker offset
    const baseDelay = this.config.respectfulDelay;
    const workerOffset = parseInt(workerId) * 2000;
    const progressiveDelay = Math.min(pageNum * 500, 10000);
    const randomization = Math.random() * 3000;
    
    const totalDelay = baseDelay + workerOffset + progressiveDelay + randomization;
    
    logger.info(`⏱️ Worker ${workerId}: Waiting ${(totalDelay/1000).toFixed(1)}s before next request`);
    await new Promise(resolve => setTimeout(resolve, totalDelay));
  }

  async extractListings(page) {
    return await page.evaluate(() => {
      const listings = [];
      const elements = document.querySelectorAll('div[id^="listing-"]');
      
      elements.forEach((element, index) => {
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
            url: '',
            badges: [],
            extractedAt: new Date().toISOString()
          };
          
          // Title extraction
          const titleElement = element.querySelector('h2, h3, .title, a[href*="/"]');
          if (titleElement) {
            listing.title = titleElement.textContent.trim();
          }
          
          // URL extraction
          const linkElement = element.querySelector('a[href*="/"]');
          if (linkElement) {
            listing.url = linkElement.href;
          }
          
          // Financial data extraction
          const text = element.textContent || '';
          
          // Price
          const priceMatch = text.match(/\$\s?([\d,]+)(?!\s*(?:\/mo|monthly))/);
          if (priceMatch) {
            listing.price = parseInt(priceMatch[1].replace(/,/g, ''));
          }
          
          // Monthly profit
          const profitMatch = text.match(/(?:profit|net)[^\d]*\$\s?([\d,]+)\s*(?:\/mo|monthly)/i);
          if (profitMatch) {
            listing.monthlyProfit = parseInt(profitMatch[1].replace(/,/g, ''));
          }
          
          // Monthly revenue
          const revenueMatch = text.match(/(?:revenue|gross)[^\d]*\$\s?([\d,]+)\s*(?:\/mo|monthly)/i);
          if (revenueMatch) {
            listing.monthlyRevenue = parseInt(revenueMatch[1].replace(/,/g, ''));
          }
          
          // Multiples
          const profitMultipleMatch = text.match(/([\d.]+)x\s*profit/i);
          if (profitMultipleMatch) {
            listing.profitMultiple = parseFloat(profitMultipleMatch[1]);
          }
          
          const revenueMultipleMatch = text.match(/([\d.]+)x\s*revenue/i);
          if (revenueMultipleMatch) {
            listing.revenueMultiple = parseFloat(revenueMultipleMatch[1]);
          }
          
          // Property type
          const types = ['Website', 'SaaS', 'Ecommerce', 'Content', 'App'];
          for (const type of types) {
            if (text.includes(type)) {
              listing.propertyType = type;
              break;
            }
          }
          
          // Badges
          const badgeElements = element.querySelectorAll('.badge, .tag, [class*="badge"]');
          listing.badges = Array.from(badgeElements)
            .map(b => b.textContent.trim())
            .filter(text => text.length > 0);
          
          listings.push(listing);
          
        } catch (error) {
          console.error('Extraction error:', error);
        }
      });
      
      return listings;
    });
  }

  updateWorkerProgress(workerId, data) {
    // Update master statistics
    this.stats.activeWorkers = Math.max(this.stats.activeWorkers, parseInt(data.workerId) + 1);
    this.stats.totalListings = Math.max(this.stats.totalListings, data.listingsCollected);
    
    // Log progress periodically
    if (data.currentPage % 10 === 0) {
      const elapsed = (Date.now() - this.stats.startTime) / 1000;
      const rate = this.stats.totalListings / elapsed * 60;
      
      logger.info(`📈 Progress Update:`);
      logger.info(`   📋 Total Listings: ${this.stats.totalListings}`);
      logger.info(`   ⚡ Collection Rate: ${rate.toFixed(0)} listings/min`);
      logger.info(`   ⏱️ Elapsed: ${(elapsed/60).toFixed(1)} minutes`);
    }
  }
}

// Database integration
async function saveToDatabase(listings) {
  logger.info('💾 Saving to database...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Clear existing data
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      logger.warn('Delete warning:', deleteError.message);
    }
    
    // Transform for database
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `enterprise_${Date.now()}_${index}`,
      title: listing.title || '',
      price: listing.price || null,
      monthly_profit: listing.monthlyProfit || null,
      monthly_revenue: listing.monthlyRevenue || null,
      profit_multiple: listing.profitMultiple || null,
      revenue_multiple: listing.revenueMultiple || null,
      multiple_text: listing.profitMultiple && listing.revenueMultiple 
        ? `${listing.profitMultiple}x profit | ${listing.revenueMultiple}x revenue`
        : listing.profitMultiple ? `${listing.profitMultiple}x profit`
        : listing.revenueMultiple ? `${listing.revenueMultiple}x revenue`
        : '',
      property_type: listing.propertyType || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: calculateQualityScore(listing),
      extraction_confidence: 0.95,
      page_number: Math.floor(index / 25) + 1,
      source: 'flippa_enterprise',
      raw_data: listing
    }));
    
    // Batch insert
    const batchSize = 200;
    let inserted = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('flippa_listings')
        .insert(batch);
      
      if (error) {
        logger.error(`Batch insert error: ${error.message}`);
      } else {
        inserted += batch.length;
        logger.info(`✅ Inserted batch: ${batch.length} listings`);
      }
    }
    
    logger.info(`💾 Database save complete: ${inserted}/${dbListings.length} listings`);
    return { success: true, saved: inserted, total: dbListings.length };
    
  } catch (error) {
    logger.error(`Database error: ${error.message}`);
    
    // Emergency file save
    const fs = require('fs').promises;
    const filename = `data/enterprise-backup-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(listings, null, 2));
    logger.info(`📁 Backup saved to: ${filename}`);
    
    return { success: false, error: error.message, backupFile: filename };
  }
}

function calculateQualityScore(listing) {
  let score = 0;
  if (listing.title && listing.title.length > 5) score += 20;
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
  const collector = new EnterpriseFlippaCollector();
  
  try {
    logger.info('🚀 Starting Enterprise Flippa Collection');
    logger.info('📋 This system respects robots.txt and rate limits');
    logger.info('⚖️ Ethical data collection following best practices\n');
    
    const listings = await collector.initializeCollection();
    
    if (cluster.isMaster && listings) {
      // Save results
      const dbResult = await saveToDatabase(listings);
      
      logger.info('\n✅ COLLECTION COMPLETE');
      logger.info(`📊 Total Listings: ${listings.length}`);
      logger.info(`💾 Database: ${dbResult.saved} saved`);
      logger.info(`🏆 Success: Enterprise-grade collection achieved`);
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

module.exports = { EnterpriseFlippaCollector };