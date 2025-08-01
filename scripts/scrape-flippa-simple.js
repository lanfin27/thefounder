// Simple Flippa scraper using Playwright
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

async function scrapeFlippaSimple() {
  console.log('🎯 Simple Flippa Scraper');
  console.log('=' .repeat(60));
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
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
    
    // Enable request interception to capture API calls
    const apiResponses = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('api') || url.includes('graphql') || response.headers()['content-type']?.includes('json')) {
        apiResponses.push({ url, status: response.status() });
      }
    });
    
    const url = 'https://flippa.com/search?filter[property_type]=saas';
    console.log(`\n🌐 Navigating to: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Changed for faster loading
      timeout: 60000
    });
    
    console.log('✅ Page loaded');
    
    // Wait for content
    await page.waitForTimeout(5000);
    
    // Log API calls
    console.log(`\n📡 Captured ${apiResponses.length} API responses`);
    const relevantApis = apiResponses.filter(r => 
      r.url.includes('search') || 
      r.url.includes('listing') || 
      r.url.includes('property')
    );
    
    if (relevantApis.length > 0) {
      console.log('Relevant APIs:');
      relevantApis.forEach(api => console.log(`   - ${api.url.substring(0, 100)}...`));
    }
    
    // Try to extract listings data
    console.log('\n🔍 Extracting listings...');
    
    // Method 1: Look for data in page content
    const listings = await page.evaluate(() => {
      const results = [];
      
      // Try different approaches
      // 1. Look for links to individual listings
      const listingLinks = document.querySelectorAll('a[href*="/listings/"]');
      console.log(`Found ${listingLinks.length} listing links`);
      
      // 2. Look for price elements
      const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.match(/\$[\d,]+/) && text.length < 50;
      });
      
      // 3. Try to find listing containers
      const possibleContainers = document.querySelectorAll('[class*="card"], [class*="listing"], article, [role="article"]');
      
      possibleContainers.forEach(container => {
        const titleEl = container.querySelector('h2, h3, h4, [class*="title"]');
        const priceEl = Array.from(container.querySelectorAll('*')).find(el => 
          el.textContent?.match(/\$[\d,]+/)
        );
        
        if (titleEl && priceEl) {
          const title = titleEl.textContent?.trim();
          const priceText = priceEl.textContent?.trim();
          const price = parseInt(priceText?.replace(/[^\d]/g, '') || '0');
          
          if (title && price > 0) {
            results.push({
              title,
              price,
              priceText,
              link: container.querySelector('a')?.href
            });
          }
        }
      });
      
      // 4. Look for JSON-LD data
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent || '{}');
          console.log('Found JSON-LD data:', data);
        } catch (e) {}
      });
      
      return results;
    });
    
    console.log(`Found ${listings.length} potential listings`);
    
    if (listings.length > 0) {
      console.log('\n📋 Sample listings:');
      listings.slice(0, 5).forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.title}`);
        console.log(`   Price: ${listing.priceText}`);
        console.log(`   Link: ${listing.link}`);
      });
      
      // Save to database
      console.log('\n💾 Saving to database...');
      const dbListings = listings.map((listing, i) => ({
        listing_id: `simple_${Date.now()}_${i}`,
        title: listing.title,
        url: listing.link || url,
        asking_price: listing.price,
        primary_category: 'saas'
      }));
      
      const { data, error } = await supabase
        .from('flippa_listings')
        .upsert(dbListings.slice(0, 10)) // Save first 10
        .select();
      
      if (error) {
        console.log('❌ Database error:', error.message);
      } else {
        console.log(`✅ Saved ${data.length} listings to database`);
      }
    } else {
      console.log('\n❌ No listings found');
      
      // Save page for debugging
      const content = await page.content();
      require('fs').writeFileSync('flippa-debug.html', content);
      console.log('📄 Saved page content to flippa-debug.html');
      
      // Take screenshot
      await page.screenshot({ path: 'flippa-debug.png', fullPage: true });
      console.log('📸 Saved screenshot to flippa-debug.png');
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Run the scraper
scrapeFlippaSimple().catch(console.error);