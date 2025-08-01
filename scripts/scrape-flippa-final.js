// Final Flippa scraper with extensive debugging
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaFinal() {
  console.log('🚀 Final Flippa Scraper with Debug');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('PAGE LOG:', msg.text());
      }
    });
    
    console.log('\n🌐 Loading Flippa SaaS listings...');
    await page.goto('https://flippa.com/search?filter[property_type]=saas', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(7000);
    console.log('✅ Page loaded');
    
    console.log('\n🎯 Extracting SaaS listings...');
    
    const { listings, debug } = await page.evaluate(() => {
      const results = [];
      const debugInfo = {
        containersChecked: 0,
        containersWithPrice: 0,
        linksChecked: 0,
        numericLinksFound: 0,
        listingsProcessed: 0,
        errors: []
      };
      
      try {
        // Find listing containers
        const containers = document.querySelectorAll('div.tw-rounded-lg.tw-border.tw-p-4.tw-shadow');
        debugInfo.containersChecked = containers.length;
        
        containers.forEach((container, index) => {
          try {
            const containerText = container.textContent || '';
            
            // Check if this has price
            if (containerText.includes('$')) {
              debugInfo.containersWithPrice++;
              
              // Find links
              const links = container.querySelectorAll('a');
              debugInfo.linksChecked += links.length;
              
              let listingId = null;
              let listingUrl = null;
              
              // Check each link
              for (const link of links) {
                const href = link.href || '';
                console.log(`Checking link: ${href}`);
                
                // Try different patterns
                const patterns = [
                  /flippa\.com\/(\d{7,})$/,
                  /flippa\.com\/(\d{7,})\?/,
                  /flippa\.com\/(\d{7,})#/
                ];
                
                for (const pattern of patterns) {
                  const match = href.match(pattern);
                  if (match) {
                    listingId = match[1];
                    listingUrl = href.split('?')[0]; // Remove query params
                    debugInfo.numericLinksFound++;
                    console.log(`Found listing ID: ${listingId}`);
                    break;
                  }
                }
                
                if (listingId) break;
              }
              
              if (listingId) {
                debugInfo.listingsProcessed++;
                
                // Extract all data
                const listing = {
                  listingId,
                  url: listingUrl,
                  containerIndex: index,
                  title: 'Extracted title',
                  priceText: 'Extracted price',
                  containerText: containerText.substring(0, 200)
                };
                
                // Try to extract title
                const titleCandidates = [
                  container.querySelector('h1, h2, h3, h4'),
                  container.querySelector(`a[href*="${listingId}"]`),
                  container.querySelector('a')
                ];
                
                for (const candidate of titleCandidates) {
                  if (candidate && candidate.textContent) {
                    const text = candidate.textContent.trim();
                    if (text && text.length > 5 && !text.includes('Sign NDA')) {
                      listing.title = text.split('\n')[0];
                      break;
                    }
                  }
                }
                
                // Extract price - look for the largest dollar amount
                const priceMatches = containerText.match(/\$[\d,]+/g);
                if (priceMatches) {
                  const prices = priceMatches.map(p => parseInt(p.replace(/[\$,]/g, '')));
                  const maxPrice = Math.max(...prices);
                  listing.priceText = '$' + maxPrice.toLocaleString();
                }
                
                results.push(listing);
              }
            }
          } catch (err) {
            debugInfo.errors.push(`Container ${index}: ${err.message}`);
          }
        });
      } catch (err) {
        debugInfo.errors.push(`Main: ${err.message}`);
      }
      
      return { listings: results, debug: debugInfo };
    });
    
    console.log('\n📊 Debug Info:');
    console.log(`Containers checked: ${debug.containersChecked}`);
    console.log(`Containers with price: ${debug.containersWithPrice}`);
    console.log(`Links checked: ${debug.linksChecked}`);
    console.log(`Numeric links found: ${debug.numericLinksFound}`);
    console.log(`Listings processed: ${debug.listingsProcessed}`);
    if (debug.errors.length > 0) {
      console.log('Errors:', debug.errors);
    }
    
    console.log(`\n✅ Extracted ${listings.length} SaaS listings`);
    
    if (listings.length > 0) {
      console.log('\n📋 Listings found:');
      listings.forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.listingId}`);
        console.log(`   URL: ${listing.url}`);
        console.log(`   Price: ${listing.priceText}`);
        console.log(`   Container text preview: ${listing.containerText.replace(/\s+/g, ' ')}`);
      });
      
      // Save to database
      console.log('\n💾 Saving to database...');
      const dbListings = listings.map(listing => ({
        listing_id: listing.listingId,
        title: listing.title,
        url: listing.url,
        asking_price: parseInt(listing.priceText.replace(/[\$,]/g, '')) || null,
        primary_category: 'saas',
        raw_data: listing
      }));
      
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(dbListings, { onConflict: 'listing_id' })
        .select();
      
      if (error) {
        console.log('❌ Database error:', error.message);
      } else {
        console.log(`✅ Successfully saved ${data.length} listings`);
      }
    }
    
    console.log('\n⏸️ Browser will remain open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeFlippaFinal().catch(console.error);