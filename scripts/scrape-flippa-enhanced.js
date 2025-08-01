// Enhanced Flippa scraper with comprehensive business metrics extraction
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Utility functions
function parsePrice(priceText) {
  if (!priceText) return null;
  
  // Handle "Open to Offers"
  if (priceText.toLowerCase().includes('offer')) return null;
  
  // Remove currency symbols and text, extract number
  const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '');
  const price = parseInt(cleanPrice);
  
  return isNaN(price) ? null : price;
}

function parseMultiple(multipleText) {
  if (!multipleText) return null;
  const match = multipleText.match(/(\d+\.?\d*)x?/i);
  return match ? parseFloat(match[1]) : null;
}

async function scrapeFlippaEnhanced() {
  console.log('🎯 Enhanced Flippa Scraper - Comprehensive Business Metrics');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    console.log('\n🚀 Launching browser...');
    browser = await chromium.launch({
      headless: process.env.SCRAPING_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    
    const page = await context.newPage();
    
    // Navigate to SaaS listings
    const url = 'https://flippa.com/search?filter[property_type]=saas';
    console.log(`\n🌐 Navigating to: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for listings to load
    console.log('\n⏳ Waiting for listings to render...');
    await page.waitForTimeout(5000);
    
    // Take debug screenshot
    await page.screenshot({ 
      path: 'flippa-listings-debug.png',
      fullPage: false // Just viewport to see what's visible
    });
    console.log('📸 Debug screenshot saved');
    
    // Extract comprehensive listing data
    console.log('\n🔍 Extracting business metrics...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      
      // Strategy 1: Find listing cards by common patterns
      const possibleSelectors = [
        'div[class*="listing"]',
        'article[class*="listing"]',
        'div[class*="card"]',
        'a[href*="/listings/"]',
        '[data-testid*="listing"]',
        'div[class*="property"]',
        'div[class*="result"]'
      ];
      
      let listingElements = [];
      
      // Try each selector until we find listings
      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 5) { // Expect at least 5 listings
          listingElements = Array.from(elements);
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }
      
      // If no specific selector worked, try a more general approach
      if (listingElements.length === 0) {
        // Look for elements containing price and a link
        const allElements = document.querySelectorAll('div, article, section');
        listingElements = Array.from(allElements).filter(el => {
          const text = el.textContent || '';
          const hasPrice = text.match(/\$[\d,]+/);
          const hasLink = el.querySelector('a[href*="/listings/"]');
          const hasTitle = el.querySelector('h2, h3, h4, [class*="title"]');
          return hasPrice && (hasLink || hasTitle);
        });
      }
      
      // Extract data from each listing
      listingElements.forEach((element, index) => {
        try {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, [class*="title"], a[href*="/listings/"]');
          const title = titleElement?.textContent?.trim() || '';
          
          // Extract URL
          const linkElement = element.querySelector('a[href*="/listings/"]') || element.closest('a[href*="/listings/"]');
          const url = linkElement?.href || '';
          const listingId = url.match(/listings\/([^\/\?]+)/)?.[1] || `scraped_${Date.now()}_${index}`;
          
          // Extract price
          const priceText = Array.from(element.querySelectorAll('*'))
            .map(el => el.textContent)
            .find(text => text?.match(/USD\s*\$[\d,]+|^\$[\d,]+/)) || '';
          
          // Extract business type and category from title
          const titleParts = title.split('|').map(p => p.trim());
          const businessType = titleParts[0] || 'SaaS';
          const category = titleParts[1] || 'General';
          
          // Extract metrics (revenue, profit, multiple)
          const metricsText = element.textContent || '';
          
          // Look for revenue
          const revenueMatch = metricsText.match(/revenue[:\s]*\$?([\d,]+)/i);
          const monthlyRevenue = revenueMatch ? parseInt(revenueMatch[1].replace(/,/g, '')) : null;
          
          // Look for profit
          const profitMatch = metricsText.match(/profit[:\s]*\$?([\d,]+)/i);
          const monthlyProfit = profitMatch ? parseInt(profitMatch[1].replace(/,/g, '')) : null;
          
          // Look for multiple
          const multipleMatch = metricsText.match(/(\d+\.?\d*)x\s*(multiple|revenue|profit)/i);
          const multiple = multipleMatch ? parseFloat(multipleMatch[1]) : null;
          
          // Check for badges/status
          const isVerified = metricsText.includes('Verified') || element.querySelector('[class*="verified"]') !== null;
          const isConfidential = metricsText.includes('Confidential') || metricsText.includes('NDA');
          
          // Only add if we have meaningful data
          if (title && (priceText || url)) {
            results.push({
              listingId,
              title,
              url,
              priceText,
              businessType,
              category,
              monthlyRevenue,
              monthlyProfit,
              multiple,
              isVerified,
              isConfidential,
              rawText: element.textContent?.substring(0, 200)
            });
          }
        } catch (err) {
          console.error('Error extracting listing:', err);
        }
      });
      
      return results;
    });
    
    console.log(`\n📊 Extracted ${listings.length} listings`);
    
    if (listings.length === 0) {
      console.log('❌ No listings found - trying alternative extraction method...');
      
      // Alternative extraction using visual positioning
      const alternativeListings = await page.evaluate(() => {
        const results = [];
        
        // Find all text containing prices
        const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent || '';
          return text.match(/USD\s*\$[\d,]+|^\$[\d,]+/) && text.length < 200;
        });
        
        priceElements.forEach((priceEl, index) => {
          // Look for nearby title
          const parent = priceEl.parentElement?.parentElement || priceEl.parentElement;
          if (!parent) return;
          
          const titleEl = parent.querySelector('h2, h3, h4, a[href*="/listings/"]') || 
                          parent.previousElementSibling?.querySelector('h2, h3, h4, a[href*="/listings/"]');
          
          if (titleEl) {
            results.push({
              listingId: `alt_${Date.now()}_${index}`,
              title: titleEl.textContent?.trim(),
              priceText: priceEl.textContent?.trim(),
              url: titleEl.href || parent.querySelector('a')?.href || ''
            });
          }
        });
        
        return results;
      });
      
      if (alternativeListings.length > 0) {
        listings.push(...alternativeListings);
        console.log(`✅ Alternative method found ${alternativeListings.length} listings`);
      }
    }
    
    // Process and format listings
    console.log('\n💾 Processing listings for database...');
    const processedListings = [];
    
    for (const listing of listings.slice(0, 20)) { // Process up to 20 listings
      const askingPrice = parsePrice(listing.priceText);
      
      if (!askingPrice && !listing.url) continue; // Skip invalid listings
      
      const processedListing = {
        listing_id: listing.listingId || `flippa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: listing.title || 'Untitled SaaS Business',
        url: listing.url || url,
        asking_price: askingPrice,
        primary_category: listing.businessType || 'saas',
        sub_category: listing.category || null,
        industry: listing.category || null,
        monthly_revenue: listing.monthlyRevenue,
        annual_revenue: listing.monthlyRevenue ? listing.monthlyRevenue * 12 : null,
        monthly_profit: listing.monthlyProfit,
        annual_profit: listing.monthlyProfit ? listing.monthlyProfit * 12 : null,
        revenue_multiple: listing.multiple,
        profit_multiple: listing.multiple,
        is_verified: listing.isVerified || false,
        monetization: 'SaaS',
        raw_data: {
          priceText: listing.priceText,
          isConfidential: listing.isConfidential,
          extractedAt: new Date().toISOString()
        }
      };
      
      processedListings.push(processedListing);
      
      console.log(`✅ ${processedListing.title} - $${askingPrice ? askingPrice.toLocaleString() : 'N/A'}`);
    }
    
    // Save to database
    if (processedListings.length > 0) {
      console.log(`\n💾 Saving ${processedListings.length} listings to database...`);
      
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(processedListings, { onConflict: 'listing_id' })
        .select();
      
      if (error) {
        console.log('❌ Database error:', error.message);
        console.log('Error details:', error);
      } else {
        console.log(`✅ Successfully saved ${data.length} listings to database`);
        
        // Display saved listings
        console.log('\n📋 Saved listings:');
        data.forEach(listing => {
          console.log(`   - ${listing.title}: $${listing.asking_price?.toLocaleString() || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ No valid listings to save');
      
      // Save page content for debugging
      const pageContent = await page.content();
      require('fs').writeFileSync('flippa-page-content.html', pageContent);
      console.log('📄 Saved page HTML for debugging');
    }
    
    // Get final statistics
    const { count } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Total listings in database: ${count}`);
    
  } catch (error) {
    console.log('\n❌ Scraper error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Enhanced scraping complete');
  console.log('\nNext steps:');
  console.log('1. Check flippa-listings-debug.png to see what was visible');
  console.log('2. Review extracted data in the database');
  console.log('3. Run monitoring script: npm run monitor:flow');
}

// Run the enhanced scraper
scrapeFlippaEnhanced().catch(console.error);