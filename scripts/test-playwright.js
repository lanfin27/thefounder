// Playwright browser test script
const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function testPlaywright() {
  console.log('🔄 Testing Playwright browser setup...\n');
  
  let browser = null;
  let page = null;

  try {
    // Launch browser with scraping configuration
    console.log('1️⃣ Launching Chromium browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    console.log('✅ Chromium browser launched successfully');
    console.log(`   Executable: ${browser._initializer.executablePath}`);

    // Create page and test navigation
    console.log('\n2️⃣ Creating new page...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    page = await context.newPage();
    console.log('✅ Page created with custom user agent');

    // Test basic navigation
    console.log('\n3️⃣ Testing navigation...');
    const testUrl = 'https://httpbin.org/user-agent';
    await page.goto(testUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    const content = await page.textContent('body');
    console.log('✅ Navigation successful');
    console.log(`   Response preview: ${content.substring(0, 100)}...`);

    // Test element selection
    console.log('\n4️⃣ Testing element selection...');
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const h1Text = await page.$eval('h1', el => el.textContent);
    console.log(`✅ Element selection successful: "${h1Text}"`);

    // Test multiple selectors
    const paragraphs = await page.$$eval('p', elements => elements.length);
    console.log(`✅ Found ${paragraphs} paragraph elements`);

    // Test screenshot capability
    console.log('\n5️⃣ Testing screenshot capability...');
    const screenshotDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotDir, 'playwright-test.png');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false 
    });
    
    if (fs.existsSync(screenshotPath)) {
      console.log('✅ Screenshot saved successfully');
      console.log(`   Location: ${screenshotPath}`);
      // Clean up
      fs.unlinkSync(screenshotPath);
    }

    // Test request interception
    console.log('\n6️⃣ Testing request interception...');
    let interceptedRequests = 0;
    await page.route('**/*', route => {
      interceptedRequests++;
      route.continue();
    });
    
    await page.goto('https://httpbin.org/get', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log(`✅ Request interception working: ${interceptedRequests} requests intercepted`);

    // Performance metrics
    console.log('\n7️⃣ Testing performance metrics...');
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    console.log('✅ Performance metrics available');
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   Page Load Complete: ${metrics.loadComplete}ms`);

    console.log('\n🚀 All Playwright tests passed!');
    console.log('   Playwright is ready for web scraping!');
    
    return true;

  } catch (error) {
    console.error('\n❌ Playwright test failed:', error.message);
    console.log('\n💡 Solutions:');
    console.log('1. Install Playwright browsers:');
    console.log('   npx playwright install chromium');
    console.log('');
    console.log('2. Install system dependencies (if on Linux/WSL):');
    console.log('   npx playwright install-deps chromium');
    console.log('');
    console.log('3. For Windows-specific issues:');
    console.log('   - Run as Administrator');
    console.log('   - Disable Windows Defender temporarily');
    console.log('   - Check firewall settings');
    console.log('');
    console.log('4. Check Playwright installation:');
    console.log('   npx playwright --version');
    
    return false;
    
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('\n🔒 Browser closed cleanly');
  }
}

// Run the test
testPlaywright()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });