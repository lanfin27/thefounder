// Debug script to understand why V2 isn't finding listings
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function debugFlippaV2() {
  console.log('🔍 Debug Flippa V2 - Understanding the issue');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📍 Navigating to Flippa...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      const info = {
        bodyClasses: document.body.className,
        hasAngularReady: document.body.classList.contains('AngularPageReady--searchController'),
        listingSelectors: {}
      };
      
      // Test various selectors
      const selectors = [
        'div[id^="listing-"]',
        '[id^="listing-"]',
        '.listing-card',
        '[class*="listing"]',
        'article',
        '.search-result',
        '[data-listing-id]'
      ];
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            info.listingSelectors[selector] = {
              count: elements.length,
              firstId: elements[0].id || 'no-id',
              firstClass: elements[0].className || 'no-class'
            };
          }
        } catch (e) {
          info.listingSelectors[selector] = { error: e.message };
        }
      });
      
      // Get any error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      info.errors = Array.from(errorElements).map(e => e.textContent.trim()).filter(t => t);
      
      // Check if listings are loading
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], .spinner');
      info.hasLoading = loadingElements.length > 0;
      
      // Get page text sample
      info.pageTextSample = document.body.textContent.substring(0, 500).replace(/\s+/g, ' ').trim();
      
      return info;
    });
    
    console.log('\n📊 Page Information:');
    console.log(`Body Classes: ${pageInfo.bodyClasses}`);
    console.log(`Has Angular Ready: ${pageInfo.hasAngularReady}`);
    console.log(`Has Loading: ${pageInfo.hasLoading}`);
    
    console.log('\n🎯 Listing Selectors Found:');
    Object.entries(pageInfo.listingSelectors).forEach(([selector, data]) => {
      if (data.count) {
        console.log(`✅ ${selector}: ${data.count} elements`);
        console.log(`   First: #${data.firstId} (${data.firstClass.substring(0, 50)}...)`);
      } else if (data.error) {
        console.log(`❌ ${selector}: Error - ${data.error}`);
      }
    });
    
    if (pageInfo.errors.length > 0) {
      console.log('\n⚠️ Error Messages Found:');
      pageInfo.errors.forEach(err => console.log(`- ${err}`));
    }
    
    console.log('\n📄 Page Text Sample:');
    console.log(pageInfo.pageTextSample);
    
    // Try extracting with exact selector
    const hasListings = await page.locator('div[id^="listing-"]').count();
    console.log(`\n📊 Playwright locator count for div[id^="listing-"]: ${hasListings}`);
    
    // Check if we need to wait longer
    if (hasListings === 0) {
      console.log('\n⏳ No listings found, waiting 10 more seconds...');
      await page.waitForTimeout(10000);
      
      const hasListingsAfterWait = await page.locator('div[id^="listing-"]').count();
      console.log(`📊 After wait: ${hasListingsAfterWait} listings`);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-flippa-v2.png', fullPage: false });
    console.log('\n📸 Screenshot saved as debug-flippa-v2.png');
    
    console.log('\n⏸️ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await browser.close();
  }
}

debugFlippaV2().catch(console.error);