// Visual-based Flippa scraper using element positioning
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeFlippaVisual() {
  console.log('👁️ Visual Flippa Scraper - Using Element Positioning');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false, // Show browser to verify extraction
      slowMo: 100 // Slow down for visibility
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
    
    // Wait for content to load
    console.log('⏳ Waiting for dynamic content...');
    await page.waitForTimeout(7000);
    
    // Scroll to load more listings
    console.log('📜 Scrolling to load more listings...');
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
    
    // Take screenshot for reference
    await page.screenshot({ 
      path: 'flippa-visual-scrape.png',
      fullPage: false 
    });
    
    console.log('\n🎯 Extracting listings using visual patterns...');
    
    // Extract using multiple strategies
    const listings = await page.evaluate(() => {
      const results = [];
      const processedUrls = new Set();
      
      // Strategy 1: Find all elements containing "$" and work backwards
      const allElements = Array.from(document.querySelectorAll('*'));
      const priceElements = allElements.filter(el => {
        const text = (el.textContent || '').trim();
        const hasPrice = /USD\s*\$[\d,]+|^\$[\d,]+/.test(text);
        const isSmallElement = text.length < 50;
        const hasNoChildren = el.children.length === 0;
        return hasPrice && isSmallElement && hasNoChildren;
      });
      
      console.log(`Found ${priceElements.length} price elements`);
      
      priceElements.forEach((priceEl) => {
        try {
          // Navigate up to find container
          let container = priceEl;
          let depth = 0;
          
          while (container && depth < 10) {
            // Check if this container has a listing link
            const link = container.querySelector('a[href*="/listings/"]');
            if (link) {
              const url = link.href;
              
              if (!processedUrls.has(url)) {
                processedUrls.add(url);
                
                // Extract all text within container
                const containerText = container.textContent || '';
                
                // Extract title (usually in a heading or the link itself)
                const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
                const title = heading?.textContent?.trim() || 
                            link.textContent?.trim() || 
                            'Untitled Listing';
                
                // Extract price
                const priceMatch = containerText.match(/USD\s*\$[\d,]+|^\$[\d,]+/);
                const priceText = priceMatch ? priceMatch[0] : priceEl.textContent;
                
                // Look for business metrics
                const revenueMatch = containerText.match(/(?:Revenue|Rev)[:\s]*\$?([\d,]+)/i);
                const profitMatch = containerText.match(/(?:Profit|Net)[:\s]*\$?([\d,]+)/i);
                const multipleMatch = containerText.match(/(\d+\.?\d*)x/i);
                
                // Check for badges
                const hasVerified = containerText.includes('Verified');
                const hasConfidential = containerText.includes('Confidential') || containerText.includes('NDA');
                
                results.push({
                  title,
                  url,
                  priceText,
                  revenue: revenueMatch ? revenueMatch[1] : null,
                  profit: profitMatch ? profitMatch[1] : null,
                  multiple: multipleMatch ? multipleMatch[1] : null,
                  isVerified: hasVerified,
                  isConfidential: hasConfidential,
                  containerClass: container.className,
                  position: {
                    top: container.getBoundingClientRect().top,
                    left: container.getBoundingClientRect().left
                  }
                });
                
                break;
              }
            }
            
            container = container.parentElement;
            depth++;
          }
        } catch (err) {
          console.error('Error processing price element:', err);
        }
      });
      
      // Strategy 2: Find listing links and extract surrounding content
      if (results.length < 5) {
        document.querySelectorAll('a[href*="/listings/"]').forEach(link => {
          const url = link.href;
          if (!processedUrls.has(url)) {
            processedUrls.add(url);
            
            // Find the nearest container with price info
            let container = link.parentElement;
            let foundPrice = false;
            let depth = 0;
            
            while (container && !foundPrice && depth < 10) {
              const containerText = container.textContent || '';
              if (containerText.match(/\$[\d,]+/)) {
                foundPrice = true;
                
                const priceMatch = containerText.match(/USD\s*\$[\d,]+|^\$[\d,]+/);
                
                results.push({
                  title: link.textContent?.trim() || 'Untitled',
                  url: url,
                  priceText: priceMatch ? priceMatch[0] : 'Price not found',
                  containerClass: container.className
                });
              }
              container = container.parentElement;
              depth++;
            }
          }
        });
      }
      
      return results;
    });
    
    console.log(`\n✅ Extracted ${listings.length} unique listings`);
    
    // Process and save listings
    if (listings.length > 0) {
      console.log('\n📋 Processing listings:');
      const processedListings = [];
      
      for (const listing of listings) {
        // Parse price
        const priceMatch = listing.priceText?.match(/\$?([\d,]+)/);
        const askingPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
        
        // Extract listing ID from URL
        const listingIdMatch = listing.url.match(/listings\/([^\/\?]+)/);
        const listingId = listingIdMatch ? listingIdMatch[1] : `visual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Parse business type and category from title
        const titleParts = listing.title.split('|').map(p => p.trim());
        const businessType = titleParts[0] || 'SaaS';
        const category = titleParts[1] || 'General';
        
        const processedListing = {
          listing_id: listingId,
          title: listing.title,
          url: listing.url,
          asking_price: askingPrice,
          primary_category: businessType.toLowerCase(),
          sub_category: category,
          industry: category,
          monthly_revenue: listing.revenue ? parseInt(listing.revenue.replace(/,/g, '')) : null,
          monthly_profit: listing.profit ? parseInt(listing.profit.replace(/,/g, '')) : null,
          revenue_multiple: listing.multiple ? parseFloat(listing.multiple) : null,
          is_verified: listing.isVerified || false,
          monetization: 'SaaS',
          raw_data: {
            priceText: listing.priceText,
            containerClass: listing.containerClass,
            position: listing.position,
            extractedAt: new Date().toISOString()
          }
        };
        
        // Calculate annual values
        if (processedListing.monthly_revenue) {
          processedListing.annual_revenue = processedListing.monthly_revenue * 12;
        }
        if (processedListing.monthly_profit) {
          processedListing.annual_profit = processedListing.monthly_profit * 12;
        }
        
        processedListings.push(processedListing);
        console.log(`✅ ${processedListing.title} - $${askingPrice?.toLocaleString() || 'N/A'}`);
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
        } else {
          console.log(`✅ Successfully saved ${data.length} listings`);
        }
      }
    } else {
      console.log('❌ No listings found');
      
      // Debug: Check what's on the page
      const debugInfo = await page.evaluate(() => {
        return {
          totalLinks: document.querySelectorAll('a').length,
          listingLinks: document.querySelectorAll('a[href*="/listings/"]').length,
          priceElements: Array.from(document.querySelectorAll('*'))
            .filter(el => el.textContent?.match(/\$[\d,]+/)).length,
          pageTitle: document.title,
          bodyText: document.body.textContent?.substring(0, 500)
        };
      });
      
      console.log('\n🔍 Debug info:');
      console.log(`   Page title: ${debugInfo.pageTitle}`);
      console.log(`   Total links: ${debugInfo.totalLinks}`);
      console.log(`   Listing links: ${debugInfo.listingLinks}`);
      console.log(`   Elements with prices: ${debugInfo.priceElements}`);
    }
    
    console.log('\n⏸️ Browser will remain open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Visual scraping complete');
}

// Run the visual scraper
scrapeFlippaVisual().catch(console.error);