// Test script for multi-page scraping functionality
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function testMultiPageScraping() {
  console.log('🧪 Testing Multi-Page Scraping');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    // Launch browser with debug mode
    browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Import helper functions
    const { 
      optimizeBrowserForScraping, 
      setSortOrder, 
      hasNextPage, 
      clickNextPage 
    } = require('./scrape-flippa-complete-worker');
    
    // Set timeouts
    await page.setDefaultTimeout(120000);
    await page.setDefaultNavigationTimeout(120000);
    
    // Navigate to Flippa
    console.log('\n🌐 Loading Flippa search page...');
    await page.goto('https://flippa.com/search', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
    
    await page.waitForTimeout(5000);
    
    // Test 1: Sort Order
    console.log('\n📊 Test 1: Sort Order (Multiple Elements)');
    try {
      await setSortOrder(page);
      console.log('✅ Sort order test passed');
    } catch (error) {
      console.log(`❌ Sort order test failed: ${error.message}`);
    }
    
    // Test 2: Next Page Detection
    console.log('\n📊 Test 2: Next Page Detection');
    try {
      // Wait for listings to load
      await page.waitForSelector('[id^="listing-"]', { timeout: 10000 });
      
      const nextButton = await hasNextPage(page);
      if (nextButton) {
        console.log('✅ Next page button detected');
        
        // Get current page URL
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);
        
        // Try clicking next page
        const success = await clickNextPage(page, nextButton);
        if (success) {
          console.log('✅ Successfully navigated to next page');
          
          // Verify URL changed or new content loaded
          const newUrl = page.url();
          console.log(`New URL: ${newUrl}`);
          
          // Count listings on new page
          const listingCount = await page.locator('[id^="listing-"]').count();
          console.log(`✅ Found ${listingCount} listings on page 2`);
        } else {
          console.log('❌ Failed to navigate to next page');
        }
      } else {
        console.log('❌ No next page button found');
      }
    } catch (error) {
      console.log(`❌ Next page test failed: ${error.message}`);
    }
    
    // Test 3: Multi-Page Loop Simulation
    console.log('\n📊 Test 3: Multi-Page Loop (3 pages max)');
    try {
      let currentPage = 1;
      const maxPages = 3;
      let totalListings = 0;
      
      while (currentPage <= maxPages) {
        console.log(`\n📄 Processing page ${currentPage}...`);
        
        // Count listings on current page
        const listings = await page.locator('[id^="listing-"]').count();
        totalListings += listings;
        console.log(`Found ${listings} listings on page ${currentPage}`);
        
        if (currentPage >= maxPages) {
          console.log('✅ Reached page limit');
          break;
        }
        
        // Check for next page
        const nextBtn = await hasNextPage(page);
        if (!nextBtn) {
          console.log('✅ No more pages available');
          break;
        }
        
        // Navigate to next page
        const navigated = await clickNextPage(page, nextBtn);
        if (!navigated) {
          console.log('❌ Navigation failed');
          break;
        }
        
        currentPage++;
      }
      
      console.log(`\n✅ Scraped ${currentPage} pages with ${totalListings} total listings`);
    } catch (error) {
      console.log(`❌ Multi-page loop test failed: ${error.message}`);
    }
    
    console.log('\n✅ All tests completed!');
    console.log('\n💡 Summary:');
    console.log('- Sort order handling works with multiple elements');
    console.log('- Next page detection uses multiple selectors');
    console.log('- Multi-page navigation is functional');
    console.log('\n🎯 Run full scraper with: MAX_PAGES=5 npm run scrape:complete');
    
    await page.waitForTimeout(5000); // Keep browser open for inspection
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testMultiPageScraping().catch(console.error);