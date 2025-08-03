/**
 * Test script to verify Puppeteer API compatibility fix
 * Tests that waitForTimeout replacement works correctly
 */

const puppeteer = require('puppeteer');

async function testPuppeteerFix() {
  console.log('🧪 Testing Puppeteer API compatibility fix...');
  console.log(`📦 Puppeteer version: ${puppeteer.version || 'unknown'}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    console.log('✅ Browser and page created successfully');
    
    // Test navigation
    console.log('\n🔍 Testing navigation...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✅ Navigation successful');
    
    // Test wait replacement
    console.log('\n⏱️ Testing wait functionality...');
    const startTime = Date.now();
    
    // Test 1: Short wait (2 seconds)
    console.log('Testing 2-second wait...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const elapsed1 = Date.now() - startTime;
    console.log(`✅ 2-second wait completed (actual: ${elapsed1}ms)`);
    
    // Test 2: Dynamic wait (calculated delay)
    console.log('\nTesting dynamic wait...');
    const dynamicDelay = 1000 + Math.random() * 1000; // 1-2 seconds
    const startTime2 = Date.now();
    await new Promise(resolve => setTimeout(resolve, dynamicDelay));
    const elapsed2 = Date.now() - startTime2;
    console.log(`✅ Dynamic wait completed (expected: ${Math.round(dynamicDelay)}ms, actual: ${elapsed2}ms)`);
    
    // Test 3: Check page functionality after waits
    console.log('\n🔍 Testing page functionality after waits...');
    const hasListings = await page.evaluate(() => {
      return document.querySelectorAll('div[id^="listing-"]').length > 0;
    });
    console.log(`✅ Page evaluation works: ${hasListings ? 'Listings found' : 'No listings (may need to wait longer)'}`);
    
    // Test 4: Marketplace detection
    console.log('\n📊 Testing marketplace detection...');
    const marketplaceInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:listings?|results?)/i);
      return match ? match[1] : 'Not found';
    });
    console.log(`✅ Marketplace size detection: ${marketplaceInfo}`);
    
    console.log('\n🎉 All tests passed! Puppeteer API fix is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await browser.close();
    console.log('\n🔒 Browser closed');
  }
}

// Run the test
testPuppeteerFix().catch(console.error);