// Update existing Flippa listings with improved titles
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateFlippaTitles() {
  console.log('🔄 Updating Flippa Titles Only');
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
    
    console.log('\n🎯 Extracting titles...');
    
    const titleUpdates = await page.evaluate(() => {
      const updates = [];
      const containers = document.querySelectorAll('div.tw-rounded-lg.tw-border.tw-p-4.tw-shadow');
      
      containers.forEach(container => {
        try {
          const containerText = container.textContent || '';
          
          // Find listing ID
          const links = container.querySelectorAll('a');
          let listingId = null;
          
          for (const link of links) {
            const href = link.href || '';
            const idMatch = href.match(/flippa\.com\/(\d{7,})$/);
            if (idMatch) {
              listingId = idMatch[1];
              break;
            }
          }
          
          if (!listingId) return;
          
          // Extract title
          let title = '';
          
          // Try pattern "Type | Industry"
          const typeIndustryMatch = containerText.match(/(SaaS|E-commerce|Blog|Content|Marketplace|Service|App|Newsletter|YouTube)\s*\|\s*([^\n]+)/i);
          if (typeIndustryMatch) {
            title = `${typeIndustryMatch[1].trim()} | ${typeIndustryMatch[2].trim()}`;
          }
          
          // If no title, try domain name
          if (!title) {
            const domainMatch = containerText.match(/([a-zA-Z0-9-]+\.(com|net|org|io|co|xyz|app|ai|dev))/);
            if (domainMatch && !domainMatch[0].includes('flippa.com')) {
              title = domainMatch[0];
            }
          }
          
          // If still no title, use category from structured fields
          if (!title) {
            const typeMatch = containerText.match(/Type\s+([^\n]+?)(?=\s+Industry|\s+Monetization|\s+Site Age|$)/);
            const industryMatch = containerText.match(/Industry\s+([^\n]+?)(?=\s+Type|\s+Monetization|\s+Site Age|$)/);
            
            if (typeMatch && industryMatch) {
              title = `${typeMatch[1].trim()} | ${industryMatch[1].trim()}`;
            } else if (typeMatch) {
              title = typeMatch[1].trim();
            }
          }
          
          // Default
          if (!title) {
            title = 'SaaS Business';
          }
          
          updates.push({
            listing_id: listingId,
            title: title
          });
          
        } catch (err) {
          console.error('Error:', err);
        }
      });
      
      return updates;
    });
    
    console.log(`\n✅ Found ${titleUpdates.length} titles to update`);
    
    if (titleUpdates.length > 0) {
      console.log('\n📋 Title updates:');
      titleUpdates.slice(0, 10).forEach((update, i) => {
        console.log(`${i + 1}. [${update.listing_id}] ${update.title}`);
      });
      
      // Update database - one by one to avoid errors
      console.log('\n💾 Updating database...');
      let successCount = 0;
      
      for (const update of titleUpdates) {
        try {
          const { error } = await supabase
            .from('flippa_listings')
            .update({ title: update.title })
            .eq('listing_id', update.listing_id);
          
          if (!error) {
            successCount++;
          } else {
            console.log(`Error updating ${update.listing_id}:`, error.message);
          }
        } catch (err) {
          console.log(`Error updating ${update.listing_id}:`, err.message);
        }
      }
      
      console.log(`\n✅ Successfully updated ${successCount} titles`);
      
      // Verify updates
      const { data } = await supabase
        .from('flippa_listings')
        .select('listing_id, title')
        .order('scraped_at', { ascending: false })
        .limit(10);
      
      if (data) {
        console.log('\nUpdated titles in database:');
        data.forEach(item => {
          console.log(`- [${item.listing_id}] ${item.title}`);
        });
      }
    }
    
    console.log('\n⏸️ Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

updateFlippaTitles().catch(console.error);