// Comprehensive Flippa worker with full data extraction
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create queue
const scrapingQueue = new Bull('flippa-scraping', process.env.REDIS_URL);

// Process jobs
scrapingQueue.process(async (job) => {
  const { jobType, category = 'saas', page = 1 } = job.data;
  
  console.log(`\n🔧 Processing comprehensive job ${job.id}: ${jobType} - ${category} (page ${page})`);
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const browserPage = await context.newPage();
    
    // Navigate to Flippa
    const url = `https://flippa.com/search?filter[property_type]=${category}&page=${page}`;
    console.log(`📡 Loading: ${url}`);
    
    await browserPage.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Wait for content
    await browserPage.waitForTimeout(5000);
    
    // Extract comprehensive data
    const listings = await browserPage.evaluate(() => {
      const results = [];
      
      // Find all listing containers
      const containers = document.querySelectorAll('[id^="listing-"]');
      
      containers.forEach(container => {
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
          
          // Determine price type and status
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
            
            // Original price and discount
            const originalPriceEl = priceContainer.querySelector('s');
            if (originalPriceEl) {
              const originalPriceMatch = originalPriceEl.textContent.match(/\$([\d,]+)/);
              if (originalPriceMatch) {
                listing.original_price = parseInt(originalPriceMatch[1].replace(/,/g, ''));
              }
            }
            
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
          
          // Other flags
          listing.is_confidential = container.textContent?.includes('ConfidentialSign NDA') || false;
          
          // Geography
          const locationPattern = container.textContent?.match(/([A-Z]{2}),\s*([^,\n]+(?:States|Kingdom|Australia|Canada))/);
          if (locationPattern) {
            listing.geography = locationPattern[0];
          }
          
          results.push(listing);
          
        } catch (err) {
          console.error('Error:', err);
        }
      });
      
      return results;
    });
    
    console.log(`📊 Found ${listings.length} listings`);
    
    // Process and save listings
    const savedListings = [];
    
    for (const listing of listings) {
      if (!listing.price && listing.price_type === 'asking') continue;
      
      const dbListing = {
        listing_id: listing.listing_id,
        title: listing.title,
        url: listing.url,
        
        // Price (use asking_price for both sold and asking)
        asking_price: listing.price || null,
        
        // Business info
        primary_category: (listing.type || category).toLowerCase(),
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
      
      savedListings.push(dbListing);
    }
    
    // Save to database
    if (savedListings.length > 0) {
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(savedListings, { onConflict: 'listing_id' })
        .select();
      
      if (error) {
        console.log('❌ Database error:', error.message);
      } else {
        console.log(`✅ Saved ${data.length} listings with comprehensive data`);
        
        // Log multiples summary
        const withMultiples = data.filter(l => l.profit_multiple || l.revenue_multiple);
        if (withMultiples.length > 0) {
          console.log(`   ${withMultiples.length} listings have multiples`);
        }
      }
    }
    
    await browser.close();
    
    return {
      category,
      page,
      count: savedListings.length,
      withMultiples: savedListings.filter(l => l.profit_multiple || l.revenue_multiple).length,
      askingCount: savedListings.filter(l => l.raw_data?.price_type === 'asking').length,
      soldCount: savedListings.filter(l => l.raw_data?.price_type === 'sold').length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Job failed:`, error.message);
    if (browser) await browser.close();
    throw error;
  }
});

// Queue event handlers
scrapingQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

scrapingQueue.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} failed:`, err.message);
});

console.log('🚀 Comprehensive Flippa worker started');
console.log('Features:');
console.log('- Price type detection (asking/sold)');
console.log('- Multiple extraction (profit/revenue)');
console.log('- Full business metrics');
console.log('- Badge and status tracking');
console.log('- Geography extraction');
console.log('\nWaiting for jobs...');