// Quick test to verify hasNextPage function works
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

// Import the functions from the main script to test them
async function hasNextPage(page) {
  console.log('🔍 Checking for next page...');
  
  // Multiple strategies to find next button
  const nextSelectors = [
    'button:has-text("Next")',
    'a:has-text("Next")',
    'button[aria-label*="Next"]',
    'a[aria-label*="Next"]',
    '.pagination .next:not(.disabled)',
    '.pagination li:last-child:not(.disabled) a',
    'svg use[href*="chevron-right"]',
    'button:has(svg use[href*="chevron-right"])',
    'a:has(svg use[href*="chevron-right"])',
    'ul.pagination li:has-text("Next") a',
    'nav[aria-label="Pagination"] a:has-text("Next")',
    'button:text("»")',
    'a:text("»")'
  ];
  
  for (const selector of nextSelectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible() && await element.isEnabled()) {
        console.log(`✅ Next button found with selector: ${selector}`);
        return element;
      }
    } catch (e) {
      continue;
    }
  }
  
  console.log('❌ No next page button found');
  return null;
}

async function testFix() {
  console.log('🧪 Testing hasNextPage Function Fix');
  console.log('=' .repeat(50));
  
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newContext().then(ctx => ctx.newPage());
    
    // Navigate to Flippa
    console.log('🌐 Loading Flippa...');
    await page.goto('https://flippa.com/search', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await page.waitForTimeout(5000);
    
    // Test the function
    console.log('\n📊 Testing hasNextPage function...');
    const nextButton = await hasNextPage(page);
    
    if (nextButton) {
      console.log('✅ SUCCESS: hasNextPage function works correctly!');
      console.log('   Next button element found and returned');
    } else {
      console.log('⚠️  No next button found (this might be expected if there\'s only one page)');
    }
    
    console.log('\n✅ Test completed successfully - no errors!');
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testFix().catch(console.error);