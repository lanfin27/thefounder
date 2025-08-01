// Comprehensive Flippa scraper with accurate price distinction and full data extraction
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaComprehensive() {
  console.log('🚀 Comprehensive Flippa Scraper - Full Data Extraction');
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
    
    // Enable console logging
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
    
    // Scroll to load more
    console.log('📜 Scrolling to load more content...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(2000);
    }
    
    console.log('\n🎯 Extracting comprehensive listing data...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      
      // Find all listing containers by ID pattern
      const containers = document.querySelectorAll('[id^="listing-"]');
      console.log(`Found ${containers.length} listing containers`);
      
      containers.forEach((container, index) => {
        try {
          const listing = {};
          
          // Extract listing ID from container ID
          const idMatch = container.id.match(/listing-(\d+)/);
          if (!idMatch) return;
          
          listing.listing_id = idMatch[1];
          listing.url = `https://flippa.com/${listing.listing_id}`;
          
          // CRITICAL: Price type detection
          const saleMethodEl = container.querySelector('span[ng-bind-html*="saleMethodTitle"]');
          const saleMethodText = saleMethodEl?.textContent?.trim() || '';
          
          // Determine listing status and price type
          if (saleMethodText.includes('Sold')) {
            listing.listing_status = 'sold';
            listing.price_type = 'sold';
          } else if (saleMethodText.includes('Current bid')) {
            listing.listing_status = 'auction';
            listing.price_type = 'asking';
          } else if (saleMethodText.includes('Asking price')) {
            listing.listing_status = 'asking';
            listing.price_type = 'asking';
          } else {
            listing.listing_status = 'active';
            listing.price_type = 'asking';
          }
          
          // Extract prices (handle both regular and discounted prices)
          const priceContainer = container.querySelector('h5[ng-if*="price_dropped"], h5:not([ng-if]), .tw-text-2xl');
          if (priceContainer) {
            const priceText = priceContainer.textContent || '';
            
            // Current/Final price
            const currentPriceMatch = priceText.match(/(?:USD|AUD)\s*\$([\d,]+)(?!.*<s>)/);
            if (currentPriceMatch) {
              const price = parseInt(currentPriceMatch[1].replace(/,/g, ''));
              if (listing.price_type === 'sold') {
                listing.sold_price = price;
                listing.final_price = price;
              } else {
                listing.asking_price = price;
              }
            }
            
            // Original price (if discounted)
            const originalPriceEl = priceContainer.querySelector('s');
            if (originalPriceEl) {
              const originalPriceMatch = originalPriceEl.textContent.match(/\$([\d,]+)/);
              if (originalPriceMatch) {
                listing.original_price = parseInt(originalPriceMatch[1].replace(/,/g, ''));
              }
            }
            
            // Discount percentage
            const discountMatch = priceText.match(/Reduced\s*(\d+)%/);
            if (discountMatch) {
              listing.discount_percentage = parseInt(discountMatch[1]);
            }
          }
          
          // Extract multiples (CRITICAL for dashboard)
          const multipleContainer = container.querySelector('div[ng-if*="show_multiple"]');
          if (multipleContainer) {
            const multipleText = multipleContainer.textContent || '';
            
            // Profit multiple
            const profitMultipleMatch = multipleText.match(/([\d.]+)x\s*(?:Profit|profit)/);
            if (profitMultipleMatch) {
              listing.profit_multiple = parseFloat(profitMultipleMatch[1]);
            }
            
            // Revenue multiple
            const revenueMultipleMatch = multipleText.match(/([\d.]+)x\s*(?:Revenue|revenue)/);
            if (revenueMultipleMatch) {
              listing.revenue_multiple = parseFloat(revenueMultipleMatch[1]);
            }
            
            // Sometimes format is "3.8x" without specifying type
            if (!listing.profit_multiple && !listing.revenue_multiple) {
              const genericMultipleMatch = multipleText.match(/([\d.]+)x/);
              if (genericMultipleMatch) {
                listing.revenue_multiple = parseFloat(genericMultipleMatch[1]);
              }
            }
          }
          
          // Extract structured fields using the pattern:
          // <span class="tw-text-xs tw-uppercase">FIELD</span>
          // <div class="tw-text-sm">VALUE</div>
          const fieldContainers = container.querySelectorAll('.tw-flex.tw-flex-col');
          
          fieldContainers.forEach(fieldContainer => {
            const labelEl = fieldContainer.querySelector('span.tw-text-xs.tw-uppercase');
            const valueEl = fieldContainer.querySelector('div.tw-text-sm, span.tw-text-sm');
            
            if (labelEl && valueEl) {
              const label = labelEl.textContent.trim();
              const value = valueEl.textContent.trim();
              
              switch(label.toLowerCase()) {
                case 'type':
                  listing.type = value;
                  break;
                case 'industry':
                  listing.industry = value;
                  break;
                case 'monetization':
                  listing.monetization = value;
                  break;
                case 'site age':
                  listing.site_age = value;
                  // Convert to months
                  const ageMatch = value.match(/(\d+)\s*(year|month)/i);
                  if (ageMatch) {
                    const num = parseInt(ageMatch[1]);
                    listing.site_age_months = ageMatch[2].toLowerCase().includes('year') ? num * 12 : num;
                  }
                  break;
                case 'net profit':
                  listing.monthly_profit_text = value;
                  // Extract numeric value
                  const profitMatch = value.match(/\$([\d,]+)\s*p\/mo/);
                  if (profitMatch) {
                    listing.monthly_profit = parseInt(profitMatch[1].replace(/,/g, ''));
                  }
                  break;
                case 'revenue':
                  listing.monthly_revenue_text = value;
                  // Extract numeric value
                  const revenueMatch = value.match(/\$([\d,]+)\s*p\/mo/);
                  if (revenueMatch) {
                    listing.monthly_revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
                  }
                  break;
              }
            }
          });
          
          // Extract title (Type | Industry pattern)
          if (listing.type && listing.industry) {
            listing.title = `${listing.type} | ${listing.industry}`;
          } else {
            // Fallback: try to find from heading
            const titleEl = container.querySelector('h2, h3, h4');
            listing.title = titleEl?.textContent?.trim() || 'Untitled';
          }
          
          // Extract badges
          const badges = [];
          
          // Verified listing
          if (container.textContent?.includes('Verified Listing')) {
            listing.verified_listing = true;
            badges.push('Verified');
          }
          
          // Managed by Flippa
          if (container.querySelector('[title*="Managed by Flippa"]') || 
              container.textContent?.includes('Managed by Flippa')) {
            badges.push('Managed by Flippa');
          }
          
          // Broker
          if (container.querySelector('[title*="Broker"]') || 
              container.textContent?.includes('Broker')) {
            badges.push('Broker');
          }
          
          // Sponsored
          if (container.querySelector('[title*="Sponsored"]') || 
              container.textContent?.includes('Sponsored')) {
            badges.push('Sponsored');
          }
          
          // Editor's Choice
          if (container.querySelector('[title*="Editor\'s Choice"]') || 
              container.textContent?.includes("Editor's Choice")) {
            badges.push("Editor's Choice");
          }
          
          listing.badges = badges;
          
          // Check if confidential
          if (container.textContent?.includes('ConfidentialSign NDA to view') ||
              container.textContent?.includes('Sign NDA')) {
            listing.confidential = true;
          }
          
          // Extract geography
          const geoEl = container.querySelector('span[class*="flag"], [class*="location"]');
          if (geoEl) {
            const geoText = geoEl.textContent?.trim();
            if (geoText && !geoText.includes('United States')) {
              listing.geography = geoText;
            }
          }
          
          // Additional location extraction
          const locationPattern = container.textContent?.match(/([A-Z]{2}),\s*([^,\n]+(?:States|Kingdom|Australia|Canada))/);
          if (locationPattern) {
            listing.geography = locationPattern[0];
          }
          
          // Extract view/watch/bid counts if available
          const viewsMatch = container.textContent?.match(/(\d+)\s*views?/i);
          if (viewsMatch) {
            listing.view_count = parseInt(viewsMatch[1]);
          }
          
          const watchMatch = container.textContent?.match(/(\d+)\s*watching/i);
          if (watchMatch) {
            listing.watch_count = parseInt(watchMatch[1]);
          }
          
          const bidMatch = container.textContent?.match(/(\d+)\s*bids?/i);
          if (bidMatch) {
            listing.bid_count = parseInt(bidMatch[1]);
          }
          
          // Domain name extraction
          const domainMatch = container.textContent?.match(/([a-zA-Z0-9-]+\.(com|net|org|io|co|xyz|app|ai|dev))/);
          if (domainMatch && !domainMatch[0].includes('flippa.com')) {
            listing.domain = domainMatch[0];
            // Use domain as title if no other title found
            if (!listing.title || listing.title === 'Untitled') {
              listing.title = listing.domain;
            }
          }
          
          console.log(`Extracted listing ${listing.listing_id}: ${listing.title} (${listing.listing_status})`);
          results.push(listing);
          
        } catch (err) {
          console.error(`Error processing container ${index}:`, err.message);
        }
      });
      
      return results;
    });
    
    console.log(`\n✅ Extracted ${listings.length} comprehensive listings`);
    
    // Separate asking and sold listings for analysis
    const askingListings = listings.filter(l => l.price_type === 'asking');
    const soldListings = listings.filter(l => l.price_type === 'sold');
    
    console.log(`\n📊 Listing Analysis:`);
    console.log(`   Asking price listings: ${askingListings.length}`);
    console.log(`   Sold listings: ${soldListings.length}`);
    console.log(`   Auction listings: ${listings.filter(l => l.listing_status === 'auction').length}`);
    
    if (listings.length > 0) {
      console.log('\n📋 Sample listings with comprehensive data:');
      listings.slice(0, 5).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.listing_id}`);
        console.log(`   Status: ${listing.listing_status} (${listing.price_type})`);
        
        if (listing.price_type === 'sold') {
          console.log(`   Sold Price: $${listing.sold_price?.toLocaleString() || 'N/A'}`);
        } else {
          console.log(`   Asking Price: $${listing.asking_price?.toLocaleString() || 'N/A'}`);
        }
        
        if (listing.original_price) {
          console.log(`   Original Price: $${listing.original_price.toLocaleString()} (Reduced ${listing.discount_percentage}%)`);
        }
        
        if (listing.profit_multiple || listing.revenue_multiple) {
          console.log(`   Multiples: ${listing.profit_multiple ? listing.profit_multiple + 'x Profit' : ''} ${listing.revenue_multiple ? listing.revenue_multiple + 'x Revenue' : ''}`);
        }
        
        if (listing.monthly_profit) {
          console.log(`   Monthly Profit: $${listing.monthly_profit.toLocaleString()}`);
        }
        
        console.log(`   Type: ${listing.type || 'N/A'}`);
        console.log(`   Industry: ${listing.industry || 'N/A'}`);
        console.log(`   Monetization: ${listing.monetization || 'N/A'}`);
        console.log(`   Site Age: ${listing.site_age || 'N/A'}`);
        
        if (listing.badges.length > 0) {
          console.log(`   Badges: ${listing.badges.join(', ')}`);
        }
        
        if (listing.geography) {
          console.log(`   Geography: ${listing.geography}`);
        }
      });
      
      // Save to database
      console.log('\n💾 Saving to database...');
      const dbListings = listings.map(listing => ({
        listing_id: listing.listing_id,
        title: listing.title,
        url: listing.url,
        
        // Price fields
        price_type: listing.price_type,
        asking_price: listing.asking_price || null,
        sold_price: listing.sold_price || null,
        original_price: listing.original_price || null,
        discount_percentage: listing.discount_percentage || null,
        
        // Business metrics
        primary_category: (listing.type || 'saas').toLowerCase(),
        sub_category: listing.industry ? listing.industry.toLowerCase() : null,
        industry: listing.industry,
        business_model: listing.type,
        monetization: listing.monetization,
        
        // Financial metrics
        monthly_profit: listing.monthly_profit || null,
        monthly_revenue: listing.monthly_revenue || null,
        annual_profit: listing.monthly_profit ? listing.monthly_profit * 12 : null,
        annual_revenue: listing.monthly_revenue ? listing.monthly_revenue * 12 : null,
        profit_multiple: listing.profit_multiple || null,
        revenue_multiple: listing.revenue_multiple || null,
        
        // Other metrics
        site_age_months: listing.site_age_months || null,
        listing_status: listing.listing_status,
        is_verified: listing.verified_listing || false,
        is_featured: listing.badges.includes('Sponsored') || false,
        
        // Counts
        view_count: listing.view_count || null,
        watch_count: listing.watch_count || null,
        bid_count: listing.bid_count || null,
        
        // Raw data
        raw_data: {
          badges: listing.badges,
          confidential: listing.confidential || false,
          geography: listing.geography,
          domain: listing.domain,
          site_age_text: listing.site_age,
          monthly_profit_text: listing.monthly_profit_text,
          monthly_revenue_text: listing.monthly_revenue_text,
          extractedAt: new Date().toISOString()
        }
      }));
      
      // Save in batches to avoid errors
      const batchSize = 10;
      let savedCount = 0;
      
      for (let i = 0; i < dbListings.length; i += batchSize) {
        const batch = dbListings.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('flippa_listings')
          .upsert(batch, { onConflict: 'listing_id' })
          .select();
        
        if (error) {
          console.log(`❌ Database error for batch ${i / batchSize + 1}:`, error.message);
        } else {
          savedCount += data.length;
        }
      }
      
      console.log(`✅ Successfully saved ${savedCount} listings`);
      
      // Dashboard analytics preview
      console.log('\n📊 Dashboard Analytics Preview:');
      
      // Multiples analysis for asking price listings
      const askingWithMultiples = askingListings.filter(l => l.profit_multiple || l.revenue_multiple);
      console.log(`\n   Asking Price Listings with Multiples: ${askingWithMultiples.length}`);
      if (askingWithMultiples.length > 0) {
        const avgProfitMultiple = askingWithMultiples
          .filter(l => l.profit_multiple)
          .reduce((sum, l) => sum + l.profit_multiple, 0) / askingWithMultiples.filter(l => l.profit_multiple).length;
        const avgRevenueMultiple = askingWithMultiples
          .filter(l => l.revenue_multiple)
          .reduce((sum, l) => sum + l.revenue_multiple, 0) / askingWithMultiples.filter(l => l.revenue_multiple).length;
        
        console.log(`   Average Profit Multiple: ${avgProfitMultiple?.toFixed(2) || 'N/A'}x`);
        console.log(`   Average Revenue Multiple: ${avgRevenueMultiple?.toFixed(2) || 'N/A'}x`);
      }
      
      // Multiples analysis for sold listings
      const soldWithMultiples = soldListings.filter(l => l.profit_multiple || l.revenue_multiple);
      console.log(`\n   Sold Listings with Multiples: ${soldWithMultiples.length}`);
      if (soldWithMultiples.length > 0) {
        const avgProfitMultiple = soldWithMultiples
          .filter(l => l.profit_multiple)
          .reduce((sum, l) => sum + l.profit_multiple, 0) / soldWithMultiples.filter(l => l.profit_multiple).length;
        const avgRevenueMultiple = soldWithMultiples
          .filter(l => l.revenue_multiple)
          .reduce((sum, l) => sum + l.revenue_multiple, 0) / soldWithMultiples.filter(l => l.revenue_multiple).length;
        
        console.log(`   Average Profit Multiple: ${avgProfitMultiple?.toFixed(2) || 'N/A'}x`);
        console.log(`   Average Revenue Multiple: ${avgRevenueMultiple?.toFixed(2) || 'N/A'}x`);
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
  console.log('✅ Comprehensive scraping complete');
}

// Run the scraper
scrapeFlippaComprehensive().catch(console.error);