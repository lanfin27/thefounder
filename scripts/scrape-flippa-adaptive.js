// Adaptive Flippa scraper that works with current schema while extracting comprehensive data
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaAdaptive() {
  console.log('🚀 Adaptive Flippa Scraper - Comprehensive Data with Current Schema');
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
    
    // Scroll to load more
    console.log('📜 Scrolling to load more content...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(2000);
    }
    
    console.log('\n🎯 Extracting comprehensive listing data...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      
      // Find all listing containers
      const containers = document.querySelectorAll('[id^="listing-"]');
      console.log(`Found ${containers.length} listing containers`);
      
      containers.forEach((container, index) => {
        try {
          const listing = {};
          
          // Extract listing ID
          const idMatch = container.id.match(/listing-(\d+)/);
          if (!idMatch) return;
          
          listing.listing_id = idMatch[1];
          listing.url = `https://flippa.com/${listing.listing_id}`;
          
          // Extract sale method and status
          const saleMethodEl = container.querySelector('span[ng-bind-html*="saleMethodTitle"]');
          const saleMethodText = saleMethodEl?.textContent?.trim() || '';
          
          // Determine if sold or asking
          listing.is_sold = saleMethodText.includes('Sold');
          listing.is_auction = saleMethodText.includes('Current bid');
          listing.price_type = listing.is_sold ? 'sold' : 'asking';
          listing.listing_status = listing.is_sold ? 'sold' : (listing.is_auction ? 'auction' : 'asking');
          
          // Extract prices
          const priceContainer = container.querySelector('h5[ng-if*="price_dropped"], h5:not([ng-if]), .tw-text-2xl');
          if (priceContainer) {
            const priceText = priceContainer.textContent || '';
            
            // Current price
            const currentPriceMatch = priceText.match(/(?:USD|AUD)\s*\$([\d,]+)(?!.*<s>)/);
            if (currentPriceMatch) {
              listing.price = parseInt(currentPriceMatch[1].replace(/,/g, ''));
            }
            
            // Original price (if discounted)
            const originalPriceEl = priceContainer.querySelector('s');
            if (originalPriceEl) {
              const originalPriceMatch = originalPriceEl.textContent.match(/\$([\d,]+)/);
              if (originalPriceMatch) {
                listing.original_price = parseInt(originalPriceMatch[1].replace(/,/g, ''));
              }
            }
            
            // Discount
            const discountMatch = priceText.match(/Reduced\s*(\d+)%/);
            if (discountMatch) {
              listing.discount_percentage = parseInt(discountMatch[1]);
            }
          }
          
          // Extract multiples (CRITICAL)
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
          }
          
          // Extract structured fields
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
                  const ageMatch = value.match(/(\d+)\s*(year|month)/i);
                  if (ageMatch) {
                    const num = parseInt(ageMatch[1]);
                    listing.site_age_months = ageMatch[2].toLowerCase().includes('year') ? num * 12 : num;
                  }
                  break;
                case 'net profit':
                  const profitMatch = value.match(/\$([\d,]+)\s*p\/mo/);
                  if (profitMatch) {
                    listing.monthly_profit = parseInt(profitMatch[1].replace(/,/g, ''));
                  }
                  break;
                case 'revenue':
                  const revenueMatch = value.match(/\$([\d,]+)\s*p\/mo/);
                  if (revenueMatch) {
                    listing.monthly_revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
                  }
                  break;
              }
            }
          });
          
          // Extract title
          if (listing.type && listing.industry) {
            listing.title = `${listing.type} | ${listing.industry}`;
          } else {
            // Try domain name
            const domainMatch = container.textContent?.match(/([a-zA-Z0-9-]+\.(com|net|org|io|co|xyz|app|ai|dev))/);
            if (domainMatch && !domainMatch[0].includes('flippa.com')) {
              listing.title = domainMatch[0];
            } else {
              listing.title = listing.type || 'SaaS Business';
            }
          }
          
          // Extract badges
          const badges = [];
          if (container.textContent?.includes('Verified Listing')) {
            listing.is_verified = true;
            badges.push('Verified');
          }
          if (container.textContent?.includes('Managed by Flippa')) {
            badges.push('Managed by Flippa');
          }
          if (container.textContent?.includes('Broker')) {
            badges.push('Broker');
          }
          if (container.textContent?.includes('Sponsored')) {
            listing.is_featured = true;
            badges.push('Sponsored');
          }
          if (container.textContent?.includes("Editor's Choice")) {
            badges.push("Editor's Choice");
          }
          listing.badges = badges;
          
          // Check if confidential
          listing.is_confidential = container.textContent?.includes('ConfidentialSign NDA') || false;
          
          // Extract geography
          const locationPattern = container.textContent?.match(/([A-Z]{2}),\s*([^,\n]+(?:States|Kingdom|Australia|Canada))/);
          if (locationPattern) {
            listing.geography = locationPattern[0];
          }
          
          console.log(`Extracted: ${listing.listing_id} - ${listing.title} (${listing.price_type})`);
          results.push(listing);
          
        } catch (err) {
          console.error(`Error processing container ${index}:`, err.message);
        }
      });
      
      return results;
    });
    
    console.log(`\n✅ Extracted ${listings.length} listings`);
    
    // Analysis
    const askingListings = listings.filter(l => l.price_type === 'asking');
    const soldListings = listings.filter(l => l.price_type === 'sold');
    
    console.log(`\n📊 Listing Analysis:`);
    console.log(`   Asking price: ${askingListings.length}`);
    console.log(`   Sold: ${soldListings.length}`);
    console.log(`   With multiples: ${listings.filter(l => l.profit_multiple || l.revenue_multiple).length}`);
    
    // Show samples
    console.log('\n📋 Sample listings:');
    listings.slice(0, 5).forEach((listing, i) => {
      console.log(`\n${i + 1}. ${listing.title}`);
      console.log(`   ID: ${listing.listing_id}`);
      console.log(`   Status: ${listing.price_type}`);
      console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
      
      if (listing.original_price) {
        console.log(`   Original: $${listing.original_price.toLocaleString()} (${listing.discount_percentage}% off)`);
      }
      
      if (listing.profit_multiple || listing.revenue_multiple) {
        const multiples = [];
        if (listing.profit_multiple) multiples.push(`${listing.profit_multiple}x Profit`);
        if (listing.revenue_multiple) multiples.push(`${listing.revenue_multiple}x Revenue`);
        console.log(`   Multiples: ${multiples.join(', ')}`);
      }
      
      if (listing.monthly_profit) {
        console.log(`   Monthly Profit: $${listing.monthly_profit.toLocaleString()}`);
      }
      
      console.log(`   Badges: ${listing.badges.join(', ') || 'None'}`);
    });
    
    // Save to database (adapted for current schema)
    console.log('\n💾 Saving to database...');
    const dbListings = listings.map(listing => {
      const dbRecord = {
        listing_id: listing.listing_id,
        title: listing.title,
        url: listing.url,
        
        // Price - use asking_price for both sold and asking
        asking_price: listing.price || null,
        
        // Business info
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
        
        // Other fields
        site_age_months: listing.site_age_months || null,
        is_verified: listing.is_verified || false,
        is_featured: listing.is_featured || false,
        
        // Store comprehensive data in raw_data
        raw_data: {
          price_type: listing.price_type,
          listing_status: listing.listing_status,
          is_sold: listing.is_sold,
          is_auction: listing.is_auction,
          original_price: listing.original_price,
          discount_percentage: listing.discount_percentage,
          badges: listing.badges,
          is_confidential: listing.is_confidential,
          geography: listing.geography,
          site_age_text: listing.site_age,
          extractedAt: new Date().toISOString()
        }
      };
      
      return dbRecord;
    });
    
    // Save in batches
    const batchSize = 10;
    let savedCount = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(batch, { onConflict: 'listing_id' })
        .select();
      
      if (error) {
        console.log(`❌ Error batch ${i/batchSize + 1}:`, error.message);
      } else {
        savedCount += data.length;
      }
    }
    
    console.log(`✅ Successfully saved ${savedCount} listings`);
    
    // Dashboard preview
    console.log('\n📊 Dashboard Analytics Preview:');
    
    // Asking price multiples
    const askingWithMultiples = askingListings.filter(l => l.profit_multiple || l.revenue_multiple);
    if (askingWithMultiples.length > 0) {
      const avgProfitMultiple = askingWithMultiples
        .filter(l => l.profit_multiple)
        .reduce((sum, l, _, arr) => sum + l.profit_multiple / arr.length, 0);
      const avgRevenueMultiple = askingWithMultiples
        .filter(l => l.revenue_multiple)
        .reduce((sum, l, _, arr) => sum + l.revenue_multiple / arr.length, 0);
      
      console.log(`\n   Asking Price Multiples (${askingWithMultiples.length} listings):`);
      console.log(`   - Avg Profit Multiple: ${avgProfitMultiple.toFixed(2)}x`);
      console.log(`   - Avg Revenue Multiple: ${avgRevenueMultiple.toFixed(2)}x`);
    }
    
    // Sold multiples
    const soldWithMultiples = soldListings.filter(l => l.profit_multiple || l.revenue_multiple);
    if (soldWithMultiples.length > 0) {
      console.log(`\n   Sold Multiples (${soldWithMultiples.length} listings):`);
      // ... similar calculation
    }
    
    console.log('\n⏸️ Browser will remain open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeFlippaAdaptive().catch(console.error);