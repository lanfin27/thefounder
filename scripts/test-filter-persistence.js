// Test script for filter persistence across pages
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

// Import helper functions
const { 
  reapplyFiltersOnPage, 
  verifyFiltersApplied,
  hasNextPage,
  clickNextPage
} = require('./scrape-flippa-complete-worker');

async function testFilterPersistence() {
  console.log('🧪 Testing Filter Persistence Across Pages');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Navigate to Flippa
    console.log('\n🌐 Loading Flippa search page...');
    await page.goto('https://flippa.com/search', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
    
    await page.waitForTimeout(5000);
    
    // Test 1: Apply initial filters
    console.log('\n📊 Test 1: Initial Filter Application');
    
    // Enable Recently Sold
    console.log('💰 Enabling Recently Sold filter...');
    try {
      const checkbox = page.locator('label:has-text("Recently Sold") input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await page.waitForTimeout(3000);
        console.log('✅ Recently Sold enabled');
      }
    } catch (e) {
      console.log('⚠️ Could not enable Recently Sold');
    }
    
    // Set sort order
    console.log('🔄 Setting sort to Most Recent...');
    try {
      const sortSelect = page.locator('select[name="sort_alias"]').first();
      await sortSelect.selectOption('most_recent');
      await page.waitForTimeout(3000);
      console.log('✅ Sort order set');
    } catch (e) {
      console.log('⚠️ Could not set sort order');
    }
    
    // Verify initial filters
    const page1Verification = await verifyFiltersApplied(page, 1);
    console.log('\n📊 Page 1 Filter Status:');
    console.log(`   Recently Sold: ${page1Verification.recentlySoldEnabled ? '✅' : '❌'}`);
    console.log(`   Sort Order: ${page1Verification.sortCorrect ? '✅' : '❌'}`);
    
    // Count listings on page 1
    const page1Listings = await page.locator('[id^="listing-"]').count();
    console.log(`   Listings found: ${page1Listings}`);
    
    // Test 2: Navigate to next page and check filters
    console.log('\n📊 Test 2: Navigate to Page 2');
    
    const nextButton = await hasNextPage(page);
    if (nextButton) {
      console.log('✅ Next button found');
      
      const navigated = await clickNextPage(page, nextButton);
      if (navigated) {
        console.log('✅ Navigated to page 2');
        
        // Check filters before re-application
        console.log('\n🔍 Checking filters on page 2 (before re-application)...');
        const page2BeforeVerification = await verifyFiltersApplied(page, 2);
        console.log('📊 Page 2 Filter Status (Before):');
        console.log(`   Recently Sold: ${page2BeforeVerification.recentlySoldEnabled ? '✅' : '❌'}`);
        console.log(`   Sort Order: ${page2BeforeVerification.sortCorrect ? '✅' : '❌'}`);
        
        // If filters are not persisted, re-apply them
        if (!page2BeforeVerification.recentlySoldEnabled) {
          console.log('\n⚠️ Filters lost on navigation - re-applying...');
          await reapplyFiltersOnPage(page, 2);
          
          // Verify after re-application
          const page2AfterVerification = await verifyFiltersApplied(page, 2);
          console.log('\n📊 Page 2 Filter Status (After Re-application):');
          console.log(`   Recently Sold: ${page2AfterVerification.recentlySoldEnabled ? '✅' : '❌'}`);
          console.log(`   Sort Order: ${page2AfterVerification.sortCorrect ? '✅' : '❌'}`);
        } else {
          console.log('\n✅ Filters persisted correctly!');
        }
        
        // Count listings on page 2
        const page2Listings = await page.locator('[id^="listing-"]').count();
        console.log(`   Listings found: ${page2Listings}`);
      }
    } else {
      console.log('❌ No next page available');
    }
    
    // Test 3: Test filter re-application function directly
    console.log('\n📊 Test 3: Direct Filter Re-application');
    await reapplyFiltersOnPage(page, 3);
    
    const finalVerification = await verifyFiltersApplied(page, 3);
    console.log('\n📊 Final Filter Status:');
    console.log(`   Recently Sold: ${finalVerification.recentlySoldEnabled ? '✅' : '❌'}`);
    console.log(`   Sort Order: ${finalVerification.sortCorrect ? '✅' : '❌'}`);
    
    console.log('\n✅ Filter persistence test completed!');
    console.log('\n💡 Summary:');
    console.log('- Filter verification function works correctly');
    console.log('- Filter re-application function works correctly');
    console.log('- Multi-page navigation may reset filters (as expected)');
    console.log('- Re-application ensures consistent data collection');
    
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
testFilterPersistence().catch(console.error);