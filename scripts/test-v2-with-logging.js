// Test V2 with console logging enabled
require('dotenv').config({ path: '.env.local' });
const FlippaScraperEngineV2 = require('./flippa-scraper-engine-v2');

async function testV2WithLogging() {
  console.log('🔍 Testing V2 with Console Logging');
  console.log('='.repeat(60));
  
  const scraper = new FlippaScraperEngineV2({
    headless: false,
    maxRetries: 3,
    timeout: 120000,
    qualityThreshold: 30 // Lower threshold
  });
  
  try {
    const testUrl = 'https://flippa.com/search?filter[property_type][]=website';
    
    console.log('Starting extraction...');
    
    // Override extractListingsV2 to add logging
    const originalExtract = scraper.extractListingsV2.bind(scraper);
    scraper.extractListingsV2 = async function(page) {
      console.log('📍 extractListingsV2 called');
      
      // Check if page is ready
      const hasListings = await page.locator('div[id^="listing-"]').count();
      console.log(`📊 Page has ${hasListings} listings before extraction`);
      
      const result = await originalExtract(page);
      console.log(`📊 extractListingsV2 returned ${result.length} listings`);
      
      if (result.length === 0) {
        // Log what happened in browser
        const debugInfo = await page.evaluate(() => {
          const listings = document.querySelectorAll('div[id^="listing-"]');
          return {
            domListings: listings.length,
            firstListingId: listings[0]?.id,
            consoleErrors: window.__consoleErrors || []
          };
        });
        console.log('Debug info:', debugInfo);
      }
      
      return result;
    };
    
    const listings = await scraper.scrapeWithOptimizedApproach(testUrl, {
      applyFilters: false
    });
    
    console.log(`\n✅ Final result: ${listings.length} listings`);
    
    if (listings.length > 0) {
      console.log('\nFirst listing:');
      console.log(JSON.stringify(listings[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testV2WithLogging().catch(console.error);