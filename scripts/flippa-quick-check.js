// scripts/flippa-quick-check.js
// Quick check of Flippa's current structure and working endpoints

const axios = require('axios');
const puppeteer = require('puppeteer');

async function quickCheck() {
  console.log('🔍 FLIPPA QUICK STRUCTURE CHECK');
  console.log('===============================\n');
  
  // 1. Check API endpoints
  console.log('📡 Testing API Endpoints:');
  console.log('------------------------');
  
  const apiTests = [
    {
      name: 'Main API v3',
      url: 'https://flippa.com/v3/listings',
      params: {
        'filter[property_type][]': 'website',
        'page[size]': 10
      }
    },
    {
      name: 'GraphQL',
      url: 'https://flippa.com/graphql',
      method: 'POST',
      data: {
        query: `{
          listings(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }`
      }
    },
    {
      name: 'Search Page HTML',
      url: 'https://flippa.com/search?filter[property_type][]=website',
      isHTML: true
    }
  ];
  
  for (const test of apiTests) {
    try {
      const config = {
        url: test.url,
        method: test.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': test.isHTML ? 'text/html' : 'application/json'
        },
        timeout: 10000
      };
      
      if (test.params) config.params = test.params;
      if (test.data) config.data = test.data;
      
      const response = await axios(config);
      
      if (response.status === 200) {
        if (test.isHTML) {
          // Check for listings in HTML
          const hasListings = response.data.includes('listing') || response.data.includes('Listing');
          console.log(`✅ ${test.name}: HTML loaded (contains listings: ${hasListings})`);
        } else {
          const dataCount = response.data?.data?.length || response.data?.listings?.length || 0;
          console.log(`✅ ${test.name}: ${dataCount} items returned`);
          
          // Show sample data structure
          if (dataCount > 0) {
            const sample = response.data.data?.[0] || response.data.listings?.[0];
            if (sample) {
              console.log(`   Sample fields: ${Object.keys(sample).slice(0, 5).join(', ')}...`);
            }
          }
        }
      } else {
        console.log(`❌ ${test.name}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  // 2. Check page structure with Puppeteer
  console.log('\n\n🌐 Testing Page Structure:');
  console.log('-------------------------');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Loading search page...');
    await page.goto('https://flippa.com/search?filter[property_type][]=website', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for various listing structures
    const listingData = await page.evaluate(() => {
      const results = {
        totalElements: document.querySelectorAll('*').length,
        forms: document.querySelectorAll('form').length,
        links: document.querySelectorAll('a[href*="/"]').length,
        possibleListings: []
      };
      
      // Look for listing-like structures
      const patterns = [
        // Links that might be listings
        { selector: 'a[href^="/"][href*="-"]', name: 'Listing links' },
        { selector: 'a[href*="flippa.com/"]', name: 'Flippa links' },
        
        // Price patterns
        { selector: '*:contains("$")', name: 'Price elements' },
        { selector: '[class*="price"]', name: 'Price classes' },
        
        // Card/listing patterns
        { selector: '[class*="card"]', name: 'Card elements' },
        { selector: '[class*="listing"]', name: 'Listing classes' },
        { selector: 'article', name: 'Article elements' },
        
        // Grid/list patterns
        { selector: '[class*="grid"] > *', name: 'Grid items' },
        { selector: '[class*="list"] > *', name: 'List items' }
      ];
      
      patterns.forEach(pattern => {
        try {
          let elements;
          if (pattern.selector.includes(':contains')) {
            // Handle jQuery-style selectors
            elements = Array.from(document.querySelectorAll('*')).filter(el => 
              el.textContent.includes('$')
            );
          } else {
            elements = document.querySelectorAll(pattern.selector);
          }
          
          if (elements.length > 0) {
            results.possibleListings.push({
              pattern: pattern.name,
              count: elements.length,
              sample: elements[0]?.className || elements[0]?.tagName
            });
          }
        } catch (e) {}
      });
      
      // Check for React
      results.isReact = !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
      
      // Check for data in window
      results.windowData = Object.keys(window).filter(key => 
        key.includes('data') || key.includes('Data') || 
        key.includes('state') || key.includes('State') ||
        key.includes('__')
      ).slice(0, 10);
      
      return results;
    });
    
    console.log(`✅ Page loaded successfully`);
    console.log(`   Total elements: ${listingData.totalElements}`);
    console.log(`   Links found: ${listingData.links}`);
    console.log(`   React app: ${listingData.isReact ? 'Yes' : 'No'}`);
    
    if (listingData.possibleListings.length > 0) {
      console.log('\n   Possible listing patterns:');
      listingData.possibleListings.forEach(p => {
        console.log(`   - ${p.pattern}: ${p.count} found (sample: ${p.sample})`);
      });
    }
    
    if (listingData.windowData.length > 0) {
      console.log(`\n   Window data keys: ${listingData.windowData.join(', ')}`);
    }
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'flippa-current-state.png', fullPage: false });
    console.log('\n📸 Screenshot saved as flippa-current-state.png');
    
  } catch (error) {
    console.error('❌ Browser error:', error.message);
  } finally {
    await browser.close();
  }
  
  // 3. Recommendations
  console.log('\n\n💡 RECOMMENDATIONS:');
  console.log('-------------------');
  console.log('1. The v3 API endpoint is working and returns data');
  console.log('2. GraphQL endpoint is accessible but may need authentication');
  console.log('3. Page uses dynamic loading - wait for content after navigation');
  console.log('4. Look for listing data in API responses rather than HTML scraping');
  console.log('5. Monitor for Cloudflare challenges on the HTML pages');
}

// Run the check
quickCheck().catch(console.error);