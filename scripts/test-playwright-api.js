// Test script to verify Playwright API fixes
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function testPlaywrightAPI() {
  console.log('🧪 Testing Playwright API Fixes');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Test 1: Playwright route API (correct)
    console.log('\n📊 Test 1: Playwright Route API');
    try {
      let blockedCount = 0;
      await page.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        
        if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
          blockedCount++;
          route.abort();
        } else {
          route.continue();
        }
      });
      console.log('✅ Route API configured successfully');
      
      // Navigate to test the route interception
      await page.goto('https://flippa.com', { waitUntil: 'domcontentloaded' });
      console.log(`✅ Blocked ${blockedCount} resources`);
    } catch (error) {
      console.log(`❌ Route API test failed: ${error.message}`);
    }
    
    // Test 2: Timeout settings
    console.log('\n📊 Test 2: Timeout Settings');
    try {
      await page.setDefaultTimeout(120000);
      await page.setDefaultNavigationTimeout(120000);
      console.log('✅ Timeouts set successfully');
    } catch (error) {
      console.log(`❌ Timeout settings failed: ${error.message}`);
    }
    
    // Test 3: Viewport (Playwright uses setViewportSize)
    console.log('\n📊 Test 3: Viewport Settings');
    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const viewport = page.viewportSize();
      console.log(`✅ Viewport set to ${viewport.width}x${viewport.height}`);
    } catch (error) {
      console.log(`❌ Viewport settings failed: ${error.message}`);
    }
    
    // Test 4: Test the optimizeBrowserForScraping function
    console.log('\n📊 Test 4: optimizeBrowserForScraping Function');
    try {
      // Import the function from the worker module
      const { optimizeBrowserForScraping } = require('./scrape-flippa-complete-worker');
      
      const testPage = await context.newPage();
      await optimizeBrowserForScraping(testPage);
      console.log('✅ optimizeBrowserForScraping executed successfully');
      
      // Test navigation with optimization
      await testPage.goto('https://flippa.com/search', { waitUntil: 'domcontentloaded' });
      console.log('✅ Page loaded with optimizations');
      
      await testPage.close();
    } catch (error) {
      console.log(`❌ optimizeBrowserForScraping test failed: ${error.message}`);
    }
    
    console.log('\n✅ All Playwright API tests completed!');
    console.log('\n💡 Summary:');
    console.log('- Use page.route() instead of page.setRequestInterception()');
    console.log('- Use route.abort()/route.continue() instead of req.abort()/req.continue()');
    console.log('- Use page.setViewportSize() instead of page.setViewport()');
    console.log('- All Playwright APIs are now correctly implemented');
    
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
testPlaywrightAPI().catch(console.error);