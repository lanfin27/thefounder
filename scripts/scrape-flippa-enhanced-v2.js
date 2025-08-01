// Enhanced Flippa scraper with correct URL patterns
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaEnhanced() {
  console.log('🚀 Enhanced Flippa Scraper v2 - Using Numeric ID Patterns');
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
    
    console.log('\n🎯 Extracting SaaS listings...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      const processedIds = new Set();
      
      // Find all links to numeric IDs (actual listings)
      const listingLinks = document.querySelectorAll('a[href*="flippa.com/"]');
      
      listingLinks.forEach(link => {
        const href = link.href;
        // Match numeric IDs like flippa.com/11845258
        const idMatch = href.match(/flippa\.com\/(\d{7,})$/);
        
        if (idMatch) {
          const listingId = idMatch[1];
          
          if (!processedIds.has(listingId)) {
            processedIds.add(listingId);
            
            // Find the container that holds this listing
            let container = link;
            let depth = 0;
            let listingData = null;
            
            while (container && depth < 15) {
              const containerText = container.textContent || '';
              
              // Check if this container has all the listing info
              if (containerText.includes('$') && 
                  (containerText.includes('SaaS') || containerText.includes('Type') || containerText.includes('Industry'))) {
                
                // Extract all relevant data
                const priceMatch = containerText.match(/USD\s*\$[\d,]+|AUD\s*\$[\d,]+|\$[\d,]+/);
                const profitMatch = containerText.match(/Net Profit\s*(?:USD|AUD)?\s*\$?([\d,]+)\s*p\/mo/i);
                const revenueMatch = containerText.match(/Revenue\s*(?:USD|AUD)?\s*\$?([\d,]+)/i);
                const multipleMatch = containerText.match(/(\d+\.?\d*)\s*x/i);
                const industryMatch = containerText.match(/Industry\s*([^\n]+)/i);
                const monetizationMatch = containerText.match(/Monetization\s*([^\n]+)/i);
                const siteAgeMatch = containerText.match(/Site Age\s*(\d+)\s*years?/i);
                
                // Find the title (usually in a heading or the main link text)
                const titleEl = container.querySelector('h1, h2, h3, h4') || 
                               container.querySelector('a[href*="' + listingId + '"]');
                const title = titleEl?.textContent?.trim().split('\n')[0] || 'Untitled';
                
                // Check for badges
                const isVerified = containerText.includes('Verified Listing');
                const isManaged = containerText.includes('Managed by Flippa');
                const isBroker = containerText.includes('Broker');
                const isSponsored = containerText.includes('Sponsored');
                const isEditorsChoice = containerText.includes("Editor's Choice");
                
                listingData = {
                  listingId,
                  title,
                  url: `https://flippa.com/${listingId}`,
                  priceText: priceMatch ? priceMatch[0] : null,
                  monthlyProfit: profitMatch ? profitMatch[1] : null,
                  monthlyRevenue: revenueMatch ? revenueMatch[1] : null,
                  multiple: multipleMatch ? multipleMatch[1] : null,
                  industry: industryMatch ? industryMatch[1].trim() : null,
                  monetization: monetizationMatch ? monetizationMatch[1].trim() : null,
                  siteAge: siteAgeMatch ? parseInt(siteAgeMatch[1]) : null,
                  badges: {
                    verified: isVerified,
                    managed: isManaged,
                    broker: isBroker,
                    sponsored: isSponsored,
                    editorsChoice: isEditorsChoice
                  },
                  containerClass: container.className || '',
                  extractedAt: new Date().toISOString()
                };
                
                results.push(listingData);
                break;
              }
              
              container = container.parentElement;
              depth++;
            }
          }
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
  console.log('✅ Enhanced scraping complete');
}

// Run the scraper
scrapeFlippaEnhanced().catch(console.error);