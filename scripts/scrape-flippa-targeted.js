// Targeted Flippa scraper using known container structure
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaTargeted() {
  console.log('🎯 Targeted Flippa Scraper - Using Container Classes');
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
    
    console.log('\n🌐 Loading Flippa SaaS listings...');
    await page.goto('https://flippa.com/search?filter[property_type]=saas', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(7000);
    console.log('✅ Page loaded');
    
    // Scroll to load more listings
    console.log('📜 Scrolling to load more content...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(2000);
    }
    
    console.log('\n🎯 Extracting SaaS listings using container classes...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      const processedIds = new Set();
      
      // Find listing containers using the specific class pattern
      // Based on debug output: tw-w-full tw-flex tw-flex-col @3xl:tw-flex-row tw-gap-4 tw-rounded-lg tw-border tw-border-solid tw-border-gray-300 tw-p-4 tw-shadow hover:tw-shadow-lg
      const containers = document.querySelectorAll('div.tw-rounded-lg.tw-border.tw-p-4.tw-shadow');
      
      console.log(`Found ${containers.length} potential listing containers`);
      
      containers.forEach((container, index) => {
        try {
          const containerText = container.textContent || '';
          
          // Check if this is a listing container (has price)
          if (!containerText.includes('$')) {
            return;
          }
          
          // Find the numeric listing ID link
          const links = container.querySelectorAll('a[href*="flippa.com/"]');
          let listingId = null;
          let listingUrl = null;
          
          for (const link of links) {
            const idMatch = link.href.match(/flippa\.com\/(\d{7,})$/);
            if (idMatch) {
              listingId = idMatch[1];
              listingUrl = link.href;
              break;
            }
          }
          
          if (!listingId || processedIds.has(listingId)) {
            return;
          }
          
          processedIds.add(listingId);
          
          // Extract data from the container
          const data = {
            listingId,
            url: listingUrl,
            containerIndex: index
          };
          
          // Extract title - usually in an h2, h3, or the main link
          const titleEl = container.querySelector('h1, h2, h3, h4') || 
                         container.querySelector(`a[href*="${listingId}"]`);
          data.title = titleEl?.textContent?.trim().split('\n')[0] || 'Untitled';
          
          // Extract price
          const priceMatches = containerText.match(/USD\s*\$([\d,]+)|AUD\s*\$([\d,]+)|\$([\d,]+)/g);
          if (priceMatches) {
            data.priceText = priceMatches[priceMatches.length - 1]; // Usually the last price is the asking price
          }
          
          // Extract profit
          const profitMatch = containerText.match(/Net Profit\s*(?:USD|AUD)?\s*\$([\d,]+)\s*p\/mo/i);
          if (profitMatch) {
            data.monthlyProfit = profitMatch[1];
          }
          
          // Extract revenue  
          const revenueMatch = containerText.match(/Revenue\s*(?:USD|AUD)?\s*\$([\d,]+)/i);
          if (revenueMatch) {
            data.monthlyRevenue = revenueMatch[1];
          }
          
          // Extract multiple
          const multipleMatch = containerText.match(/(\d+\.?\d*)\s*x/i);
          if (multipleMatch) {
            data.multiple = multipleMatch[1];
          }
          
          // Extract metadata
          const industryMatch = containerText.match(/Industry\s*([^\n]+?)(?=\s*Type|\s*Monetization|\s*Site Age|$)/i);
          if (industryMatch) {
            data.industry = industryMatch[1].trim();
          }
          
          const monetizationMatch = containerText.match(/Monetization\s*([^\n]+?)(?=\s*Type|\s*Industry|\s*Site Age|$)/i);
          if (monetizationMatch) {
            data.monetization = monetizationMatch[1].trim();
          }
          
          const siteAgeMatch = containerText.match(/Site Age\s*(\d+)\s*years?/i);
          if (siteAgeMatch) {
            data.siteAge = parseInt(siteAgeMatch[1]);
          }
          
          // Check badges
          data.badges = {
            verified: containerText.includes('Verified Listing'),
            managed: containerText.includes('Managed by Flippa'),
            broker: containerText.includes('Broker'),
            sponsored: containerText.includes('Sponsored'),
            editorsChoice: containerText.includes("Editor's Choice")
          };
          
          results.push(data);
          
        } catch (err) {
          console.error(`Error processing container ${index}:`, err);
        }
      });
      
      return results;
    });
    
    console.log(`\n✅ Extracted ${listings.length} SaaS listings`);
    
    if (listings.length > 0) {
      console.log('\n📋 Sample listings:');
      listings.slice(0, 5).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.listingId}`);
        console.log(`   URL: ${listing.url}`);
        console.log(`   Price: ${listing.priceText || 'N/A'}`);
        if (listing.monthlyProfit) console.log(`   Monthly Profit: $${listing.monthlyProfit}`);
        if (listing.monthlyRevenue) console.log(`   Monthly Revenue: $${listing.monthlyRevenue}`);
        if (listing.multiple) console.log(`   Multiple: ${listing.multiple}x`);
        if (listing.industry) console.log(`   Industry: ${listing.industry}`);
        console.log(`   Badges: ${Object.entries(listing.badges).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'none'}`);
      });
      
      // Process and save to database
      console.log('\n💾 Processing for database...');
      const dbListings = [];
      
      for (const listing of listings) {
        // Parse price
        let askingPrice = null;
        let currency = 'USD';
        
        if (listing.priceText) {
          const currencyMatch = listing.priceText.match(/(USD|AUD)/);
          if (currencyMatch) currency = currencyMatch[1];
          
          const priceMatch = listing.priceText.match(/\$([\d,]+)/);
          if (priceMatch) {
            askingPrice = parseInt(priceMatch[1].replace(/,/g, ''));
          }
        }
        
        // Parse monthly values
        const monthlyProfit = listing.monthlyProfit ? parseInt(listing.monthlyProfit.replace(/,/g, '')) : null;
        const monthlyRevenue = listing.monthlyRevenue ? parseInt(listing.monthlyRevenue.replace(/,/g, '')) : null;
        const revenueMultiple = listing.multiple ? parseFloat(listing.multiple) : null;
        
        dbListings.push({
          listing_id: listing.listingId,
          title: listing.title,
          url: listing.url,
          asking_price: askingPrice,
          currency: currency,
          primary_category: 'saas',
          sub_category: listing.industry?.toLowerCase(),
          industry: listing.industry,
          monthly_profit: monthlyProfit,
          monthly_revenue: monthlyRevenue,
          annual_profit: monthlyProfit ? monthlyProfit * 12 : null,
          annual_revenue: monthlyRevenue ? monthlyRevenue * 12 : null,
          revenue_multiple: revenueMultiple,
          monetization: listing.monetization,
          site_age: listing.siteAge,
          is_verified: listing.badges.verified,
          has_broker: listing.badges.broker,
          is_sponsored: listing.badges.sponsored,
          raw_data: listing
        });
      }
      
      if (dbListings.length > 0) {
        console.log(`\n💾 Saving ${dbListings.length} listings to database...`);
        
        const { data, error } = await supabase
          .from('flippa_listings')
          .upsert(dbListings, { onConflict: 'listing_id' })
          .select();
        
        if (error) {
          console.log('❌ Database error:', error.message);
        } else {
          console.log(`✅ Successfully saved ${data.length} listings`);
          
          // Show what was saved
          console.log('\nSaved listings:');
          data.forEach(item => {
            console.log(`- ${item.title} ($${item.asking_price?.toLocaleString() || 'N/A'})`);
          });
        }
      }
    } else {
      console.log('❌ No listings found');
      
      // Debug: check what containers we found
      const debugInfo = await page.evaluate(() => {
        const containers = document.querySelectorAll('div.tw-rounded-lg.tw-border.tw-p-4.tw-shadow');
        const sampleContainer = containers[0];
        
        return {
          containerCount: containers.length,
          sampleHTML: sampleContainer ? sampleContainer.innerHTML.substring(0, 500) : null,
          sampleText: sampleContainer ? sampleContainer.textContent?.substring(0, 500) : null,
          allClasses: sampleContainer ? sampleContainer.className : null
        };
      });
      
      console.log('\n🔍 Debug info:');
      console.log(`Found ${debugInfo.containerCount} containers with target classes`);
      if (debugInfo.allClasses) {
        console.log(`Sample container classes: ${debugInfo.allClasses}`);
      }
      if (debugInfo.sampleText) {
        console.log(`Sample text: ${debugInfo.sampleText.replace(/\s+/g, ' ')}`);
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
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Targeted scraping complete');
}

// Run the scraper
scrapeFlippaTargeted().catch(console.error);