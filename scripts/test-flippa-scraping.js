// Test actual Flippa scraping to debug selectors
const axios = require('axios');
const cheerio = require('cheerio');

async function testFlippaScraping() {
  console.log('🔍 Testing Flippa Scraping');
  console.log('=' .repeat(60));
  
  const url = 'https://flippa.com/search?filter[property_type]=saas';
  console.log(`\nURL: ${url}`);
  
  try {
    console.log('\n📡 Fetching page...');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
    
    console.log('✅ Page fetched successfully');
    console.log(`   Response status: ${response.status}`);
    console.log(`   Content length: ${response.data.length} characters`);
    
    const $ = cheerio.load(response.data);
    
    // Test different selector patterns
    console.log('\n🔍 Testing selectors:');
    
    const selectors = [
      { name: 'ListingResults__listingCard', selector: '.ListingResults__listingCard' },
      { name: 'listing-card', selector: '[class*="listing-card"]' },
      { name: 'ListingCard', selector: '[class*="ListingCard"]' },
      { name: 'data-testid listing', selector: '[data-testid*="listing"]' },
      { name: 'article tags', selector: 'article' },
      { name: 'main content divs', selector: 'main div[class*="listing"]' },
      { name: 'href with /listings/', selector: 'a[href*="/listings/"]' }
    ];
    
    for (const { name, selector } of selectors) {
      const count = $(selector).length;
      console.log(`   ${name}: ${count} found`);
      
      if (count > 0 && count < 5) {
        $(selector).slice(0, 3).each((i, elem) => {
          const text = $(elem).text().slice(0, 50).replace(/\s+/g, ' ').trim();
          console.log(`     - ${text}...`);
        });
      }
    }
    
    // Try to find price elements
    console.log('\n💰 Looking for prices:');
    const priceSelectors = [
      '$[class*="price"]',
      '[class*="Price"]',
      'span:contains("$")',
      'div:contains("$")',
      '[data-testid*="price"]'
    ];
    
    for (const selector of priceSelectors) {
      try {
        const count = $(selector).length;
        if (count > 0 && count < 20) {
          console.log(`   ${selector}: ${count} found`);
          $(selector).slice(0, 3).each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.includes('$') && text.length < 30) {
              console.log(`     - ${text}`);
            }
          });
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    
    // Check if page might be using JavaScript rendering
    console.log('\n🌐 Page analysis:');
    const hasReactRoot = $('#root').length > 0 || $('[id*="app"]').length > 0;
    const hasNextData = $('script#__NEXT_DATA__').length > 0;
    const scriptTags = $('script').length;
    
    console.log(`   React/SPA indicators: ${hasReactRoot ? 'Yes' : 'No'}`);
    console.log(`   Next.js data: ${hasNextData ? 'Yes' : 'No'}`);
    console.log(`   Script tags: ${scriptTags}`);
    
    // Check for JSON data in scripts
    let foundData = false;
    $('script').each((i, elem) => {
      const content = $(elem).html();
      if (content && content.includes('listings') && content.includes('price')) {
        console.log(`   Found potential data in script tag ${i}`);
        foundData = true;
      }
    });
    
    if (!foundData) {
      console.log('   No listing data found in script tags');
    }
    
    // Save a sample of the HTML for inspection
    const fs = require('fs');
    fs.writeFileSync('flippa-sample.html', response.data.slice(0, 50000));
    console.log('\n📄 Saved sample HTML to flippa-sample.html for inspection');
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status text: ${error.response.statusText}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('💡 Recommendations:');
  console.log('1. If no listings found, the page likely uses JavaScript rendering');
  console.log('2. Consider using Playwright/Puppeteer for dynamic content');
  console.log('3. Check flippa-sample.html to inspect the actual HTML structure');
  console.log('4. The adaptive scraper with Playwright should work better');
}

testFlippaScraping().catch(console.error);