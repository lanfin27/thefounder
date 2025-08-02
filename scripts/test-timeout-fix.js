// Test script to verify timeout fixes
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function testTimeoutFix() {
  console.log('🧪 Testing Flippa Timeout Fix');
  console.log('=' .repeat(70));
  
  const strategies = [
    { waitUntil: 'domcontentloaded', timeout: 120000 },
    { waitUntil: 'load', timeout: 90000 },
    { waitUntil: 'networkidle0', timeout: 60000 }
  ];
  
  let browser;
  try {
    // Test with headless false to see what's happening
    browser = await chromium.launch({
      headless: false,
      args: [
        '--no-first-run',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    // Set timeouts
    await page.setDefaultTimeout(120000);
    await page.setDefaultNavigationTimeout(120000);
    
    // Enable console logging
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
    
    // Test 1: Simple navigation
    console.log('\n📊 Test 1: Simple Navigation (domcontentloaded)');
    const start1 = Date.now();
    try {
      await page.goto('https://flippa.com/search', {
        waitUntil: 'domcontentloaded',
        timeout: 120000
      });
      console.log(`✅ Loaded in ${Date.now() - start1}ms`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    
    // Test 2: Wait for elements
    console.log('\n📊 Test 2: Element Detection');
    try {
      await page.waitForSelector('body', { timeout: 30000 });
      console.log('✅ Body element found');
      
      await page.waitForSelector('[id^="listing-"]', { timeout: 30000 });
      console.log('✅ Listing elements found');
    } catch (error) {
      console.log(`❌ Element detection failed: ${error.message}`);
    }
    
    // Test 3: Performance mode with request interception (Playwright API)
    console.log('\n📊 Test 3: Performance Mode');
    
    let blockedRequests = 0;
    await page.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
        blockedRequests++;
        route.abort();
      } else {
        route.continue();
      }
    });
    
    const start3 = Date.now();
    try {
      await page.goto('https://flippa.com/search', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      console.log(`✅ Loaded in ${Date.now() - start3}ms`);
      console.log(`🚀 Blocked ${blockedRequests} resource requests`);
    } catch (error) {
      console.log(`❌ Performance mode failed: ${error.message}`);
    }
    
    // Test 4: Check if page is functional
    console.log('\n📊 Test 4: Page Functionality');
    try {
      // Check for filters
      const clearButton = await page.locator('div.btn.btn-link.btn-sm:has-text("Clear")');
      console.log(`✅ Clear button exists: ${await clearButton.count() > 0}`);
      
      // Check for listings
      const listings = await page.locator('[id^="listing-"]').count();
      console.log(`✅ Found ${listings} listings on page`);
      
      // Check for sort dropdown
      const sortDropdown = await page.locator('select[name="sort_alias"]').count();
      console.log(`✅ Sort dropdown exists: ${sortDropdown > 0}`);
    } catch (error) {
      console.log(`❌ Functionality check failed: ${error.message}`);
    }
    
    console.log('\n✅ All tests completed!');
    console.log('💡 Recommendations:');
    console.log('- Use domcontentloaded for faster loading');
    console.log('- Enable request interception in production');
    console.log('- Set appropriate timeouts (120s recommended)');
    
    await page.waitForTimeout(5000); // Keep browser open for inspection
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testTimeoutFix().catch(console.error);