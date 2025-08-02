// Minimal test to debug V2 extraction
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function minimalTestV2() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    const page = await browser.newPage();
    
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForSelector('div[id^="listing-"]', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Simple test
    const count = await page.locator('div[id^="listing-"]').count();
    console.log(`Playwright found ${count} listings`);
    
    // Test extraction in browser
    const result = await page.evaluate(() => {
      const listings = document.querySelectorAll('div[id^="listing-"]');
      console.log('Browser console: Found', listings.length, 'listings');
      return {
        count: listings.length,
        firstId: listings[0]?.id,
        firstClasses: listings[0]?.className
      };
    });
    
    console.log('Browser evaluation result:', result);
    
    // Test the actual extraction logic
    const extracted = await page.evaluate(() => {
      const results = [];
      const listingElements = document.querySelectorAll('div[id^="listing-"]');
      
      // Just try to extract first listing
      if (listingElements.length > 0) {
        const element = listingElements[0];
        const listing = {
          id: element.id.replace('listing-', ''),
          hasContent: element.textContent.length > 0,
          textLength: element.textContent.length
        };
        
        // Test each extraction step
        try {
          // Link
          const link = element.querySelector('a[href^="/"]');
          listing.hasLink = link !== null;
          listing.linkHref = link?.getAttribute('href');
          
          // Description
          const desc = element.querySelector('p.tw-text-gray-900');
          listing.hasDesc = desc !== null;
          listing.descText = desc?.textContent.substring(0, 50);
          
          // Price search
          const priceSpan = element.querySelector('span.tw-text-xl');
          listing.hasPriceSpan = priceSpan !== null;
          listing.priceSpanText = priceSpan?.textContent;
          
          // Monthly divs
          const monthlyDivs = element.querySelectorAll('div.tw-text-gray-800');
          listing.monthlyDivsCount = monthlyDivs.length;
          
          // Find p/mo
          let foundMonthly = false;
          for (const div of monthlyDivs) {
            if (div.textContent.includes('p/mo')) {
              listing.foundMonthly = true;
              listing.monthlyText = div.textContent;
              foundMonthly = true;
              break;
            }
          }
          
          // Confidence calculation
          let confidence = 0;
          if (listing.id) confidence += 15;
          if (listing.hasDesc) confidence += 20;
          if (listing.hasLink) confidence += 10;
          listing.confidence = confidence;
          
        } catch (e) {
          listing.error = e.message;
        }
        
        results.push(listing);
      }
      
      return results;
    });
    
    console.log('\nExtraction test results:');
    console.log(JSON.stringify(extracted, null, 2));
    
    console.log('\nKeeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

minimalTestV2().catch(console.error);