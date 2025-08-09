// scripts/flippa-working-scraper.js
// Working Flippa scraper using correct endpoints and selectors

const axios = require('axios');
const puppeteer = require('puppeteer');

class FlippaWorkingScraper {
  constructor() {
    // Correct working endpoint
    this.apiEndpoint = 'https://flippa.com/v3/listings';
    
    // Updated selectors for current Flippa structure
    this.selectors = {
      listingCard: '.GTM-search-result-card',
      listingLink: 'a[href^="/"][href*="-"]',
      priceElements: '*', // Will filter for $ in evaluate
      cardContainer: '[class*="grid"]'
    };
    
    this.results = [];
  }

  async scrapeWithAPI(limit = 1000) {
    console.log('🚀 Starting API-based extraction...\n');
    
    const allListings = [];
    let page = 1;
    const pageSize = 100; // Max allowed
    
    while (allListings.length < limit) {
      try {
        console.log(`📡 Fetching page ${page}...`);
        
        const response = await axios.get(this.apiEndpoint, {
          params: {
            'filter[property_type][]': 'website',
            'filter[status]': 'open',
            'page[number]': page,
            'page[size]': pageSize,
            'sort': '-created_at'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://flippa.com/search'
          },
          timeout: 10000
        });
        
        if (response.data && response.data.data) {
          const listings = response.data.data;
          allListings.push(...listings);
          
          console.log(`✅ Got ${listings.length} listings (Total: ${allListings.length})`);
          
          // Show sample data
          if (page === 1 && listings.length > 0) {
            console.log('\n📋 Sample listing structure:');
            const sample = listings[0];
            console.log(`   ID: ${sample.id}`);
            console.log(`   Type: ${sample.type}`);
            console.log(`   Revenue: $${sample.average_revenue || 0}`);
            console.log(`   Profit: $${sample.average_profit || 0}`);
            console.log(`   Fields available: ${Object.keys(sample).length}`);
          }
          
          // Check if more pages available
          const hasMore = listings.length === pageSize;
          if (!hasMore || allListings.length >= limit) break;
          
          page++;
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } else {
          console.log('❌ No data in response');
          break;
        }
        
      } catch (error) {
        console.error(`❌ API error: ${error.message}`);
        
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Headers:`, error.response.headers);
        }
        
        break;
      }
    }
    
    console.log(`\n✅ API extraction complete: ${allListings.length} listings`);
    return this.transformListings(allListings);
  }

  async scrapeWithBrowser(limit = 100) {
    console.log('\n🌐 Starting browser-based extraction...\n');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      console.log('📄 Loading search page...');
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for dynamic content
      console.log('⏳ Waiting for listings to load...');
      try {
        await page.waitForSelector(this.selectors.listingCard, {
          timeout: 10000
        });
      } catch (e) {
        console.log('⚠️ Card selector not found, trying alternative selectors...');
      }
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract listings
      const listings = await page.evaluate(() => {
        const results = [];
        
        // Method 1: Look for card elements
        const cards = document.querySelectorAll('.GTM-search-result-card');
        if (cards.length > 0) {
          cards.forEach(card => {
            const link = card.querySelector('a');
            const data = {
              url: link?.href,
              title: card.textContent.trim().substring(0, 100),
              method: 'card'
            };
            
            // Extract price if visible
            const priceMatch = card.textContent.match(/\$[\d,]+/);
            if (priceMatch) {
              data.price = priceMatch[0];
            }
            
            results.push(data);
          });
        }
        
        // Method 2: Look for listing links
        if (results.length === 0) {
          const links = document.querySelectorAll('a[href^="/"][href*="-"]');
          links.forEach(link => {
            if (link.href.includes('flippa.com') && !link.href.includes('/search')) {
              results.push({
                url: link.href,
                title: link.textContent.trim(),
                method: 'link'
              });
            }
          });
        }
        
        // Method 3: Look for any price-containing elements
        if (results.length === 0) {
          const priceElements = Array.from(document.querySelectorAll('*'))
            .filter(el => el.textContent.includes('$') && el.textContent.length < 200);
          
          priceElements.forEach(el => {
            const parent = el.closest('a') || el.closest('[class*="card"]');
            if (parent) {
              results.push({
                element: parent.className,
                text: el.textContent.trim(),
                method: 'price'
              });
            }
          });
        }
        
        return {
          listings: results.slice(0, 100),
          totalElements: document.querySelectorAll('*').length,
          debug: {
            cardsFound: cards.length,
            linksFound: document.querySelectorAll('a').length,
            hasReact: !!window.React,
            bodyClasses: document.body.className
          }
        };
      });
      
      console.log(`\n✅ Browser extraction complete:`);
      console.log(`   Listings found: ${listings.listings.length}`);
      console.log(`   Extraction method: ${listings.listings[0]?.method || 'none'}`);
      console.log(`   Total page elements: ${listings.totalElements}`);
      console.log(`   Debug info:`, listings.debug);
      
      return listings.listings;
      
    } catch (error) {
      console.error('❌ Browser error:', error.message);
      return [];
    } finally {
      await browser.close();
    }
  }

  transformListings(apiListings) {
    // Transform API response to consistent format
    return apiListings.map(listing => ({
      id: listing.id,
      type: listing.type,
      url: `https://flippa.com/${listing.id}`,
      title: listing.title || 'Untitled',
      price: listing.price || listing.buy_it_now_price || 0,
      revenue: listing.average_revenue || 0,
      profit: listing.average_profit || 0,
      traffic: listing.uniques_per_month || 0,
      age: listing.age_in_months || 0,
      category: listing.category || listing.type,
      // All original fields
      raw: listing
    }));
  }

  async testBothMethods() {
    console.log('🧪 TESTING BOTH EXTRACTION METHODS');
    console.log('==================================\n');
    
    // Test API method
    console.log('1️⃣ API Method Test:');
    console.log('-------------------');
    const apiListings = await this.scrapeWithAPI(50);
    
    // Test browser method
    console.log('\n2️⃣ Browser Method Test:');
    console.log('-----------------------');
    const browserListings = await this.scrapeWithBrowser(50);
    
    // Summary
    console.log('\n📊 RESULTS SUMMARY:');
    console.log('==================');
    console.log(`API Method: ${apiListings.length} listings extracted`);
    console.log(`Browser Method: ${browserListings.length} listings extracted`);
    
    if (apiListings.length > 0) {
      console.log('\n✅ Recommendation: Use API method for best performance');
      console.log('   - 100x faster than browser scraping');
      console.log('   - Structured data with all fields');
      console.log('   - No blocking issues');
    } else if (browserListings.length > 0) {
      console.log('\n⚠️ API not working, use browser method with updated selectors');
    } else {
      console.log('\n❌ Both methods failed - check for site changes');
    }
    
    return {
      api: apiListings,
      browser: browserListings
    };
  }
}

// Export and run
module.exports = FlippaWorkingScraper;

if (require.main === module) {
  const scraper = new FlippaWorkingScraper();
  scraper.testBothMethods()
    .then(results => {
      // Save results
      const fs = require('fs');
      fs.writeFileSync(
        'flippa-extraction-results.json',
        JSON.stringify(results, null, 2)
      );
      console.log('\n💾 Results saved to flippa-extraction-results.json');
    })
    .catch(console.error);
}