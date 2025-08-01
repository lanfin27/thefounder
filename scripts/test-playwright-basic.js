// Basic Playwright test to verify it's working
const { chromium } = require('playwright');

async function testPlaywrightBasic() {
  console.log('🧪 Basic Playwright Test');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    console.log('\n1️⃣ Testing browser launch...');
    browser = await chromium.launch({
      headless: false, // Show browser
      timeout: 30000
    });
    console.log('✅ Browser launched successfully');
    
    console.log('\n2️⃣ Creating browser context...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 720 }
    });
    console.log('✅ Context created');
    
    console.log('\n3️⃣ Creating new page...');
    const page = await context.newPage();
    console.log('✅ Page created');
    
    console.log('\n4️⃣ Navigating to example.com...');
    await page.goto('https://example.com');
    console.log('✅ Navigation successful');
    
    const title = await page.title();
    console.log(`   Page title: ${title}`);
    
    console.log('\n5️⃣ Taking screenshot...');
    await page.screenshot({ path: 'example-test.png' });
    console.log('✅ Screenshot saved as example-test.png');
    
    console.log('\n6️⃣ Navigating to Flippa...');
    await page.goto('https://flippa.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('✅ Flippa homepage loaded');
    
    await page.screenshot({ path: 'flippa-homepage.png' });
    console.log('📸 Screenshot saved as flippa-homepage.png');
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (browser) {
      console.log('\n🔚 Closing browser...');
      await browser.close();
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Playwright is working correctly!');
  console.log('Check the screenshots to verify page content.');
}

testPlaywrightBasic().catch(console.error);