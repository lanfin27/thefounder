// Test the extraction logic directly
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function testExtractionV2() {
  console.log('🧪 Testing V2 Extraction Logic Directly');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📍 Navigating to Flippa...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log('⏳ Waiting for listings...');
    await page.waitForSelector('div[id^="listing-"]', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('🔍 Running extraction...');
    
    // Test extraction
    const listings = await page.evaluate(() => {
      const results = [];
      const listingElements = document.querySelectorAll('div[id^="listing-"]');
      
      console.log(`Found ${listingElements.length} listing elements in browser`);
      
      // Just extract first 3 for debugging
      for (let i = 0; i < Math.min(3, listingElements.length); i++) {
        const element = listingElements[i];
        const listing = {
          index: i,
          id: element.id,
          hasLink: element.querySelector('a[href^="/"]') !== null,
          hasPrice: element.querySelector('span.tw-text-xl') !== null,
          hasDescription: element.querySelector('p.tw-text-gray-900') !== null,
          textSample: element.textContent.substring(0, 200).replace(/\s+/g, ' ').trim()
        };
        
        // Try to extract basic fields
        try {
          // ID
          listing.extractedId = element.id.replace('listing-', '');
          
          // Link
          const link = element.querySelector('a[href^="/"]');
          listing.url = link ? `https://flippa.com${link.getAttribute('href')}` : null;
          
          // Price
          const priceEl = element.querySelector('span.tw-text-xl');
          if (priceEl) {
            const priceText = priceEl.textContent;
            const match = priceText.match(/\$?([\d,]+)/);
            listing.price = match ? parseFloat(match[1].replace(/,/g, '')) : null;
          }
          
          // Title from description
          const descEl = element.querySelector('p.tw-text-gray-900');
          if (descEl) {
            const desc = descEl.textContent.trim();
            listing.title = desc.split(/[,.]/)[0].trim();
          }
          
          // Monthly value
          const monthlyEl = element.querySelector('div:has-text("p/mo")');
          if (monthlyEl) {
            const text = monthlyEl.textContent;
            const match = text.match(/\$?([\d,]+)/);
            listing.monthlyValue = match ? parseFloat(match[1].replace(/,/g, '')) : null;
          }
          
        } catch (e) {
          listing.extractionError = e.message;
        }
        
        results.push(listing);
      }
      
      return results;
    });
    
    console.log('\n📊 Extraction Results:');
    listings.forEach(listing => {
      console.log(`\n--- Listing ${listing.index + 1} ---`);
      console.log(`DOM ID: ${listing.id}`);
      console.log(`Has Link: ${listing.hasLink}`);
      console.log(`Has Price: ${listing.hasPrice}`);
      console.log(`Has Description: ${listing.hasDescription}`);
      console.log(`\nExtracted Data:`);
      console.log(`- ID: ${listing.extractedId}`);
      console.log(`- URL: ${listing.url}`);
      console.log(`- Price: $${listing.price || 'N/A'}`);
      console.log(`- Title: ${listing.title || 'N/A'}`);
      console.log(`- Monthly: $${listing.monthlyValue || 'N/A'}`);
      if (listing.extractionError) {
        console.log(`- Error: ${listing.extractionError}`);
      }
      console.log(`\nText Sample: ${listing.textSample}`);
    });
    
    // Also test the selector issue
    console.log('\n🔍 Testing selector with :has()...');
    const hasTextTest = await page.evaluate(() => {
      // Test if :has-text() works
      try {
        const el1 = document.querySelector('div:has-text("p/mo")');
        return { hasTextWorks: false, error: ':has-text() is not a valid selector' };
      } catch (e) {
        // Expected - :has-text() is Playwright-specific
      }
      
      // Use proper selectors
      const monthlyDivs = Array.from(document.querySelectorAll('div')).filter(div => 
        div.textContent.includes('p/mo')
      );
      
      return {
        hasTextWorks: false,
        alternativeFound: monthlyDivs.length,
        firstMatch: monthlyDivs[0]?.textContent.trim()
      };
    });
    
    console.log('Selector test:', hasTextTest);
    
    console.log('\n✅ Test completed!');
    console.log('⏸️ Keeping browser open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testExtractionV2().catch(console.error);