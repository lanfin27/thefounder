// Test the adaptive scraper directly
require('dotenv').config({ path: '.env.local' });
const AdaptiveScraper = require('../src/lib/scraping/adaptive-scraper');

async function testAdaptiveScraper() {
  console.log('🧪 Testing Adaptive Scraper Directly');
  console.log('=' .repeat(60));
  
  console.log('Environment check:');
  console.log(`USE_ADAPTIVE_SCRAPER: ${process.env.USE_ADAPTIVE_SCRAPER}`);
  console.log(`SCRAPING_HEADLESS: ${process.env.SCRAPING_HEADLESS}`);
  
  try {
    console.log('\n🚀 Initializing adaptive scraper...');
    const scraper = new AdaptiveScraper({
      headless: process.env.SCRAPING_HEADLESS !== 'false',
      adaptationLevel: 'aggressive',
      learningEnabled: true,
      timeout: 60000, // 60 seconds
      waitUntil: 'domcontentloaded'
    });
    
    console.log('✅ Scraper initialized');
    
    const testUrl = 'https://flippa.com/search?filter[property_type]=saas';
    console.log(`\n🌐 Testing URL: ${testUrl}`);
    
    // Define what we're looking for
    const targetData = {
      listings: {
        isArray: true,
        fields: {
          price: { min: 1000, max: 10000000 },
          title: { pattern: '.+' },
          revenue: { min: 0, max: 10000000 }
        }
      }
    };
    
    console.log('\n📡 Starting scrape...');
    const startTime = Date.now();
    
    try {
      const result = await scraper.scrapeWithAdaptation(testUrl, targetData);
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Scraping completed in ${duration}ms`);
      console.log('\nResult summary:');
      console.log(`Success: ${result.success}`);
      console.log(`Confidence: ${result.metadata?.confidence}%`);
      console.log(`Strategies used: ${result.metadata?.strategiesUsed?.join(', ')}`);
      
      if (result.data && result.data.listings) {
        const listings = Array.isArray(result.data.listings) 
          ? result.data.listings 
          : [result.data];
        
        console.log(`\n📋 Found ${listings.length} listings:`);
        
        listings.slice(0, 5).forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.title || 'No title'}`);
          console.log(`   Price: ${item.price?.value || item.price || 'N/A'}`);
          console.log(`   Revenue: ${item.revenue?.value || item.revenue || 'N/A'}`);
          console.log(`   URL: ${item.url?.value || item.url || 'N/A'}`);
        });
      } else {
        console.log('\n❌ No listings found in result');
        console.log('Full result:', JSON.stringify(result, null, 2));
      }
      
    } catch (scrapeError) {
      console.log('\n❌ Scraping failed:', scrapeError.message);
      console.log('Stack:', scrapeError.stack);
    }
    
    // Test a simpler page to verify Playwright works
    console.log('\n\n🧪 Testing simple page to verify Playwright...');
    try {
      const simpleResult = await scraper.browser.newPage();
      await simpleResult.goto('https://example.com');
      const title = await simpleResult.title();
      console.log(`✅ Playwright works! Page title: ${title}`);
      await simpleResult.close();
    } catch (error) {
      console.log('❌ Playwright test failed:', error.message);
    }
    
    // Clean up
    await scraper.close();
    
  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('💡 Debugging tips:');
  console.log('1. If Playwright fails, check if Chrome/Chromium is installed');
  console.log('2. Try setting SCRAPING_HEADLESS=false to see the browser');
  console.log('3. Check if Flippa is blocking automated access');
  console.log('4. Review logs for specific error messages');
}

// Run the test
testAdaptiveScraper().catch(console.error);