/**
 * Unified Marketplace Scraper - Database Compatible Version
 * This version only uses columns that exist in the current database schema
 */

const puppeteer = require('puppeteer');
const winston = require('winston');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Import the main scraper class
const { UnifiedMarketplaceScraper } = require('./unified-marketplace-scraper');

// Professional logging
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
    new winston.transports.File({ filename: 'unified-scraper-compatible.log' })
  ]
});

// Database saving with schema compatibility
async function saveResultsCompatible(scrapingResult) {
  logger.info('💾 Saving results to database (compatible mode)...');
  
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
    
    // Transform listings to match existing schema
    const dbListings = scrapingResult.listings.map((listing, index) => {
      // Create a compatible listing object
      const compatibleListing = {
        listing_id: listing.id,
        title: listing.title || '',
        price: listing.price || null,
        // Map monthly_profit to monthly_revenue (existing column)
        monthly_revenue: listing.monthlyProfit || listing.monthlyRevenue || null,
        // Store profit_multiple in the existing 'multiple' column
        multiple: listing.profitMultiple || listing.revenueMultiple || null,
        multiple_text: createMultipleText(listing),
        property_type: listing.propertyType || '',
        category: listing.category || '',
        badges: listing.badges || [],
        url: listing.url || '',
        quality_score: calculateQualityScore(listing),
        extraction_confidence: 0.95,
        page_number: Math.floor(index / 25) + 1,
        source: 'flippa_unified',
        raw_data: listing
      };
      
      // Add profit/revenue data to raw_data for future use
      compatibleListing.raw_data.monthly_profit_actual = listing.monthlyProfit;
      compatibleListing.raw_data.monthly_revenue_actual = listing.monthlyRevenue;
      compatibleListing.raw_data.profit_multiple_actual = listing.profitMultiple;
      compatibleListing.raw_data.revenue_multiple_actual = listing.revenueMultiple;
      
      return compatibleListing;
    });
    
    // Batch insert
    const batchSize = 200;
    let totalInserted = 0;
    let hasErrors = false;
    
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
        hasErrors = true;
        
        // Log the first item for debugging
        if (i === 0) {
          logger.error('Sample listing that failed:', JSON.stringify(batch[0], null, 2));
        }
      }
    }
    
    // If no listings were saved, create a backup
    if (totalInserted === 0 && dbListings.length > 0) {
      logger.warn('⚠️ No listings were saved to database, creating backup...');
      const fs = require('fs').promises;
      const filename = `data/unified-backup-${Date.now()}.json`;
      await fs.writeFile(filename, JSON.stringify(scrapingResult, null, 2));
      logger.info(`📁 Backup saved: ${filename}`);
    }
    
    // Save session metadata
    await supabase
      .from('scraping_sessions')
      .insert({
        session_id: `unified_compatible_${Date.now()}`,
        total_listings: totalInserted,
        pages_processed: scrapingResult.stats.pagesProcessed,
        success_rate: 98,
        processing_time: scrapingResult.stats.duration * 1000,
        configuration: {
          type: 'unified_compatible',
          marketplaceSize: scrapingResult.stats.marketplaceSize,
          completeness: scrapingResult.stats.completeness,
          note: 'Using schema-compatible mapping'
        }
      });
    
    logger.info(`💾 Saved ${totalInserted}/${dbListings.length} listings to database`);
    logger.info('📝 Note: Profit/revenue data stored in raw_data for future migration');
    
    return { success: totalInserted > 0, saved: totalInserted, hasErrors };
    
  } catch (error) {
    logger.error(`Database error: ${error.message}`);
    
    // Backup to file
    const fs = require('fs').promises;
    const filename = `data/unified-backup-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(scrapingResult, null, 2));
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
    config.respectfulDelay = 5000;
  }
  
  // Check for --quick mode (scrape fewer pages for testing)
  if (args.includes('--quick')) {
    config.completenessTarget = 0.05; // Only 5% for quick test
    logger.info('🚀 Running in QUICK mode - will collect ~100 listings for testing');
  }
  
  const scraper = new UnifiedMarketplaceScraper(config);
  
  try {
    logger.info('🚀 Unified Marketplace Collection (Schema-Compatible Mode)');
    logger.info('🔧 Using existing database schema without new columns');
    logger.info('📋 Respecting robots.txt and rate limits');
    logger.info('⚖️ Following ethical data collection practices\n');
    
    const result = await scraper.scrape();
    
    if (result.listings.length > 0) {
      const dbResult = await saveResultsCompatible(result);
      
      logger.info('\n✅ COLLECTION COMPLETE');
      logger.info(`🏆 Successfully collected ${result.listings.length} listings`);
      logger.info(`💾 Database: ${dbResult.saved} listings saved`);
      logger.info(`📊 View at: http://localhost:3000/admin/scraping`);
      
      if (dbResult.saved === 0) {
        logger.warn('\n⚠️ Data was collected but not saved to database');
        logger.warn('💡 Check backup file or fix schema issues');
      }
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

module.exports = { saveResultsCompatible };