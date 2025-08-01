// Basic connectivity test for Flippa
const axios = require('axios');
const playwright = require('playwright');

async function testConnectivity() {
  console.log('🔌 Testing connectivity to Flippa...\n');
  
  // Test 1: Basic HTTP request
  console.log('1️⃣ Testing HTTP request...');
  try {
    const response = await axios.get('https://flippa.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    console.log('   ✅ HTTP request successful');
    console.log(`   Status: ${response.status}`);
    console.log(`   Content length: ${response.data.length} bytes`);
  } catch (error) {
    console.log('   ❌ HTTP request failed:', error.message);
  }
  
  // Test 2: Playwright browser test
  console.log('\n2️⃣ Testing with Playwright browser...');
  let browser;
  try {
    browser = await playwright.chromium.launch({
      headless: false
    });
    
    const page = await browser.newPage();
    
    console.log('   🌐 Navigating to https://flippa.com...');
    const response = await page.goto('https://flippa.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log('   ✅ Page loaded successfully');
    console.log(`   Status: ${response.status()}`);
    console.log(`   URL: ${page.url()}`);
    
    // Check for common elements
    const hasSearchElements = await page.evaluate(() => {
      return document.querySelector('[class*="search"], input[type="search"], form') !== null;
    });
    
    console.log(`   Search elements found: ${hasSearchElements ? 'Yes' : 'No'}`);
    
    // Take a screenshot
    await page.screenshot({ path: 'flippa-test.png' });
    console.log('   📸 Screenshot saved as flippa-test.png');
    
    // Wait to see if any blocking occurs
    console.log('   ⏳ Waiting 5 seconds to check for blocks...');
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('blocked') || finalUrl.includes('captcha')) {
      console.log('   ⚠️ Possible blocking detected');
    } else {
      console.log('   ✅ No blocking detected');
    }
    
  } catch (error) {
    console.log('   ❌ Browser test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Test 3: Check specific search page
  console.log('\n3️⃣ Testing search page specifically...');
  try {
    const response = await axios.get('https://flippa.com/search', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    console.log('   ✅ Search page accessible');
    
    // Check if we're getting real content
    const hasListings = response.data.includes('listing') || response.data.includes('price');
    console.log(`   Contains listing data: ${hasListings ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.log('   ❌ Search page request failed:', error.message);
  }
  
  console.log('\n📊 Connectivity test complete');
}

// Run test
testConnectivity().catch(error => {
  console.error('Fatal error:', error);
}).finally(() => {
  process.exit(0);
});