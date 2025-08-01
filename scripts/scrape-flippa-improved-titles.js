// Improved Flippa scraper with better title extraction
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaImproved() {
  console.log('🚀 Flippa Scraper with Improved Title Extraction');
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
    
    console.log('\n🎯 Extracting SaaS listings with improved title extraction...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      const processedIds = new Set();
      
      // Find listing containers
      const containers = document.querySelectorAll('div.tw-rounded-lg.tw-border.tw-p-4.tw-shadow');
      console.log(`Found ${containers.length} containers`);
      
      containers.forEach((container, index) => {
        try {
          const containerText = container.textContent || '';
          
          // Skip if no price
          if (!containerText.includes('$')) return;
          
          // Find listing ID
          const links = container.querySelectorAll('a');
          let listingId = null;
          let listingUrl = null;
          
          for (const link of links) {
            const href = link.href || '';
            const idMatch = href.match(/flippa\.com\/(\d{7,})$/);
            if (idMatch) {
              listingId = idMatch[1];
              listingUrl = href.split('?')[0];
              break;
            }
          }
          
          if (!listingId || processedIds.has(listingId)) return;
          processedIds.add(listingId);
          
          // Extract title using multiple strategies
          let title = '';
          let businessType = '';
          let industry = '';
          
          // Strategy 1: Look for pattern "Type | Industry"
          const typeIndustryMatch = containerText.match(/(SaaS|E-commerce|Blog|Content|Marketplace|Service|App|Newsletter|YouTube)\s*\|\s*([^\n]+)/i);
          if (typeIndustryMatch) {
            businessType = typeIndustryMatch[1].trim();
            industry = typeIndustryMatch[2].trim();
            title = `${businessType} | ${industry}`;
            console.log(`Found type/industry pattern: ${title}`);
          }
          
          // Strategy 2: Extract from structured data fields
          if (!title) {
            // Look for Type field
            const typeMatch = containerText.match(/Type\s+([^\n]+?)(?=\s+Industry|\s+Monetization|\s+Site Age|$)/);
            if (typeMatch) {
              businessType = typeMatch[1].trim();
            }
            
            // Look for Industry field
            const industryMatch = containerText.match(/Industry\s+([^\n]+?)(?=\s+Type|\s+Monetization|\s+Site Age|$)/);
            if (industryMatch) {
              industry = industryMatch[1].trim();
            }
            
            if (businessType && industry) {
              title = `${businessType} | ${industry}`;
              console.log(`Built title from fields: ${title}`);
            }
          }
          
          // Strategy 3: Look for domain names or specific business names
          if (!title) {
            // Check for domain names (xxx.com, xxx.xyz, etc)
            const domainMatch = containerText.match(/([a-zA-Z0-9-]+\.(com|net|org|io|co|xyz|app|ai|dev))/);
            if (domainMatch && !domainMatch[0].includes('flippa.com')) {
              title = domainMatch[0];
              console.log(`Found domain name: ${title}`);
            }
          }
          
          // Strategy 4: Extract from long description text
          if (!title) {
            // Look for descriptive patterns
            const descPatterns = [
              /(\d+\s*Y\/O\s+[^\.]+)/i, // "24 Y/O B2B Weather..."
              /(#1\s+rank\s+for\s+"[^"]+"\s+[^\.]+)/i, // "#1 rank for "keyword"..."
              /([A-Z][^\.]+(?:Platform|App|Business|Service|Software|Solution|Tool|System))/,
              /(AI-powered\s+[^\.]+)/i,
              /(B2B\s+[^\.]+)/i,
              /(SaaS\s+[^\.]+)/i
            ];
            
            for (const pattern of descPatterns) {
              const match = containerText.match(pattern);
              if (match) {
                let desc = match[1].trim();
                // Clean up and truncate
                desc = desc.replace(/\s+/g, ' ').substring(0, 100);
                if (desc.length > 20) {
                  title = desc;
                  console.log(`Found description pattern: ${title}`);
                  break;
                }
              }
            }
          }
          
          // Strategy 5: Handle confidential listings
          if (!title && containerText.includes('Confidential')) {
            if (businessType || industry) {
              title = `Confidential ${businessType || 'SaaS'}${industry ? ' - ' + industry : ''}`;
            } else {
              title = 'Confidential SaaS Business';
            }
            console.log(`Confidential listing: ${title}`);
          }
          
          // Fallback: Use category info
          if (!title) {
            title = businessType || 'SaaS Business';
            if (industry && industry !== businessType) {
              title += ` - ${industry}`;
            }
          }
          
          // Extract other data
          const listing = {
            listingId,
            url: listingUrl,
            title: title,
            businessType: businessType,
            industry: industry
          };
          
          // Extract price
          const priceMatches = containerText.match(/\$[\d,]+/g);
          if (priceMatches) {
            const prices = priceMatches.map(p => parseInt(p.replace(/[\$,]/g, '')));
            listing.askingPrice = Math.max(...prices);
            listing.priceText = '$' + listing.askingPrice.toLocaleString();
          }
          
          // Extract profit
          const profitMatch = containerText.match(/Net Profit\s*(?:USD|AUD)?\s*\$([\d,]+)\s*p\/mo/i);
          if (profitMatch) {
            listing.monthlyProfit = parseInt(profitMatch[1].replace(/,/g, ''));
          }
          
          // Extract revenue
          const revenueMatch = containerText.match(/Revenue\s*(?:USD|AUD)?\s*\$([\d,]+)/i);
          if (revenueMatch) {
            listing.monthlyRevenue = parseInt(revenueMatch[1].replace(/,/g, ''));
          }
          
          // Extract multiple
          const multipleMatch = containerText.match(/(\d+\.?\d*)\s*x/i);
          if (multipleMatch) {
            listing.multiple = parseFloat(multipleMatch[1]);
          }
          
          // Extract monetization
          const monetizationMatch = containerText.match(/Monetization\s+([^\n]+?)(?=\s+Type|\s+Industry|\s+Site Age|$)/);
          if (monetizationMatch) {
            listing.monetization = monetizationMatch[1].trim();
          }
          
          // Extract site age
          const siteAgeMatch = containerText.match(/Site Age\s*(\d+)\s*years?/i);
          if (siteAgeMatch) {
            listing.siteAge = parseInt(siteAgeMatch[1]);
          }
          
          // Check badges
          listing.isVerified = containerText.includes('Verified Listing');
          listing.isManaged = containerText.includes('Managed by Flippa');
          listing.hasBroker = containerText.includes('Broker');
          listing.isSponsored = containerText.includes('Sponsored');
          listing.isEditorsChoice = containerText.includes("Editor's Choice");
          listing.isConfidential = containerText.includes('Confidential') || containerText.includes('Sign NDA');
          
          results.push(listing);
          
        } catch (err) {
          console.error(`Error processing container ${index}:`, err.message);
        }
      });
      
      return results;
    });
    
    console.log(`\n✅ Extracted ${listings.length} SaaS listings`);
    
    if (listings.length > 0) {
      console.log('\n📋 Listings with improved titles:');
      listings.slice(0, 10).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.listingId}`);
        console.log(`   URL: ${listing.url}`);
        console.log(`   Price: ${listing.priceText || 'N/A'}`);
        if (listing.businessType) console.log(`   Type: ${listing.businessType}`);
        if (listing.industry) console.log(`   Industry: ${listing.industry}`);
        if (listing.monthlyProfit) console.log(`   Monthly Profit: $${listing.monthlyProfit.toLocaleString()}`);
        if (listing.multiple) console.log(`   Multiple: ${listing.multiple}x`);
        const badges = [];
        if (listing.isVerified) badges.push('Verified');
        if (listing.isConfidential) badges.push('Confidential');
        if (listing.hasBroker) badges.push('Broker');
        if (listing.isSponsored) badges.push('Sponsored');
        if (badges.length > 0) console.log(`   Badges: ${badges.join(', ')}`);
      });
      
      // Save to database
      console.log('\n💾 Saving to database...');
      
      // Debug first listing
      console.log('Debug - First listing data:');
      console.log(JSON.stringify(listings[0], null, 2));
      
      const dbListings = listings.map(listing => ({
        listing_id: listing.listingId,
        title: listing.title,
        url: listing.url,
        asking_price: listing.askingPrice || null,
        primary_category: (listing.businessType || 'saas').toLowerCase(),
        sub_category: listing.industry ? listing.industry.toLowerCase() : null,
        industry: listing.industry,
        monthly_profit: listing.monthlyProfit || null,
        monthly_revenue: listing.monthlyRevenue || null,
        annual_profit: listing.monthlyProfit ? listing.monthlyProfit * 12 : null,
        annual_revenue: listing.monthlyRevenue ? listing.monthlyRevenue * 12 : null,
        revenue_multiple: listing.multiple || null,
        monetization: listing.monetization || null, // Ensure null if missing
        site_age_months: listing.siteAge ? listing.siteAge * 12 : null, // Convert years to months
        is_verified: listing.isVerified || false,
        is_featured: listing.isSponsored || false, // Map sponsored to featured
        raw_data: {
          isConfidential: listing.isConfidential,
          isEditorsChoice: listing.isEditorsChoice,
          hasBroker: listing.hasBroker,
          businessType: listing.businessType,
          monetization: listing.monetization,
          extractedAt: new Date().toISOString()
        }
      }));
      
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(dbListings, { onConflict: 'listing_id' })
        .select();
      
      if (error) {
        console.log('❌ Database error:', error.message);
      } else {
        console.log(`✅ Successfully saved ${data.length} listings`);
        
        // Show saved titles
        console.log('\nSaved listings with titles:');
        data.slice(0, 5).forEach(item => {
          console.log(`- [${item.listing_id}] ${item.title}`);
        });
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

scrapeFlippaImproved().catch(console.error);