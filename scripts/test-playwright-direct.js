// Test Playwright directly on Flippa
const { chromium } = require('playwright');

async function testPlaywrightDirect() {
  console.log('🧪 Testing Playwright Direct Access to Flippa');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    console.log('\n🚀 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Show browser for debugging
      timeout: 30000
    });
    
    // Create context with user agent
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    const url = 'https://flippa.com/search?filter[property_type]=saas';
    console.log(`\n🌐 Navigating to: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Changed from networkidle
      timeout: 60000
    });
    
    console.log('✅ Page loaded');
    
    // Wait for content to load
    console.log('\n⏳ Waiting for content...');
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    await page.screenshot({ path: 'flippa-page.png' });
    console.log('📸 Screenshot saved as flippa-page.png');
    
    // Try different selectors
    console.log('\n🔍 Looking for listings...');
    
    const selectors = [
      // Common patterns for listing cards
      '[data-testid*="listing"]',
      '[class*="listing-card"]',
      '[class*="ListingCard"]',
      '.listing-card',
      'article',
      '[class*="search-result"]',
      '[class*="property-card"]',
      'a[href*="/listings/"]',
      '[class*="grid"] > div > a',
      '[role="article"]'
    ];
    
    for (const selector of selectors) {
      try {
        const count = await page.$$eval(selector, elements => elements.length);
        if (count > 0) {
          console.log(`✅ Found ${count} elements with selector: ${selector}`);
          
          // Get first few items
          const items = await page.$$eval(selector, (elements, sel) => {
            return elements.slice(0, 3).map(el => ({
              text: el.textContent?.substring(0, 100),
              href: el.querySelector('a')?.href || el.href,
              classes: el.className
            }));
          }, selector);
          
          items.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.text?.replace(/\s+/g, ' ').trim()}`);
          });
        }
      } catch (e) {
        // Selector failed, continue
      }
    }
    
    // Check for price elements
    console.log('\n💰 Looking for prices...');
    const priceTexts = await page.$$eval('*', elements => {
      return elements
        .filter(el => el.textContent?.includes('$') && el.textContent.length < 50)
        .slice(0, 10)
        .map(el => el.textContent?.trim());
    });
    
    if (priceTexts.length > 0) {
      console.log(`Found ${priceTexts.length} price elements:`);
      priceTexts.forEach(price => console.log(`   - ${price}`));
    }
    
    // Check page content
    const pageContent = await page.content();
    console.log(`\n📄 Page size: ${pageContent.length} characters`);
    
    // Check for JSON data
    const jsonScripts = await page.$$eval('script[type="application/json"]', scripts => 
      scripts.map(s => ({ 
        id: s.id, 
        length: s.textContent?.length 
      }))
    );
    
    if (jsonScripts.length > 0) {
      console.log(`\n📊 Found ${jsonScripts.length} JSON scripts:`);
      jsonScripts.forEach(script => {
        console.log(`   - ${script.id || 'unnamed'}: ${script.length} chars`);
      });
    }
    
    // Try to find the main content area
    const mainContent = await page.$eval('main, [role="main"], #main-content, .main-content', 
      el => el?.innerHTML?.substring(0, 500)
    ).catch(() => null);
    
    if (mainContent) {
      console.log('\n📋 Main content area found');
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      console.log('\n🔚 Closing browser...');
      await browser.close();
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('💡 Check flippa-page.png to see what the page looks like');
  console.log('If no listings found, Flippa might be:');
  console.log('1. Using heavy JavaScript rendering');
  console.log('2. Detecting and blocking automation');
  console.log('3. Requiring login or specific headers');
}

testPlaywrightDirect().catch(console.error);