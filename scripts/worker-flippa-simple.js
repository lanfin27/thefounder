// Simplified Flippa worker with direct extraction
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
  
  console.log(`\n🔧 Processing job ${job.id}: ${jobType} - ${category} (page ${page})`);
  
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
    
    // Extract listings with simplified approach
    const listings = await browserPage.evaluate(() => {
      const results = [];
      
      // Method 1: Find all links to numeric listing IDs
      const listingLinks = document.querySelectorAll('a[href^="/"][href*="flippa.com/"]');
      const processedIds = new Set();
      
      listingLinks.forEach(link => {
        const href = link.href;
        // Match numeric IDs like /11845258
        const idMatch = href.match(/flippa\.com\/(\d{7,})$/);
        
        if (idMatch) {
          const listingId = idMatch[1];
          
          if (!processedIds.has(listingId)) {
            processedIds.add(listingId);
            
            // Find the container that holds this listing
            let container = link;
            for (let i = 0; i < 15; i++) {
              container = container.parentElement;
              if (!container) break;
              
              const text = container.textContent || '';
              
              // Check if this container has price info
              if (text.match(/\$[\d,]+/) && (text.includes('SaaS') || text.includes('Type'))) {
                // Extract data
                const priceMatch = text.match(/USD\s*\$[\d,]+|AUD\s*\$[\d,]+|\$[\d,]+/);
                const titleEl = container.querySelector('h1, h2, h3, h4') || link;
                const title = titleEl.textContent?.trim().split('\n')[0] || 'Untitled';
                
                results.push({
                  listingId,
                  title,
                  url: `https://flippa.com/${listingId}`,
                  priceText: priceMatch ? priceMatch[0] : null,
                  fullText: text.substring(0, 500)
                });
                break;
              }
            }
          }
        }
      });
      
      // Method 2: Find price elements and work up
      if (results.length < 5) {
        const priceElements = Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const text = el.textContent || '';
            return text.match(/USD\s*\$[\d,]+/) && text.length < 50;
          });
        
        priceElements.forEach(priceEl => {
          let container = priceEl;
          for (let i = 0; i < 10; i++) {
            container = container.parentElement;
            if (!container) break;
            
            const links = container.querySelectorAll('a[href^="/"]');
            for (const link of links) {
              const idMatch = link.href.match(/flippa\.com\/(\d{7,})$/);
              if (idMatch && !processedIds.has(idMatch[1])) {
                processedIds.add(idMatch[1]);
                
                results.push({
                  listingId: idMatch[1],
                  title: link.textContent?.trim() || container.querySelector('h2, h3, h4')?.textContent?.trim() || 'Untitled',
                  url: `https://flippa.com/${idMatch[1]}`,
                  priceText: priceEl.textContent?.trim(),
                  fullText: container.textContent?.substring(0, 500)
                });
                break;
              }
            }
          }
        });
      }
      
      return results;
    });
    
    console.log(`📊 Found ${listings.length} listings`);
    
    // Process and save listings
    const savedListings = [];
    
    for (const listing of listings) {
      // Parse price
      const priceMatch = listing.priceText?.match(/\$?([\d,]+)/);
      const askingPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
      
      if (!askingPrice) continue;
      
      // Use the listing ID we already extracted
      const listingId = listing.listingId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const dbListing = {
        listing_id: listingId,
        title: listing.title,
        url: listing.url,
        asking_price: askingPrice,
        primary_category: category,
        raw_data: {
          priceText: listing.priceText,
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
        console.log(`✅ Saved ${data.length} listings`);
      }
    }
    
    await browser.close();
    
    return {
      category,
      page,
      count: savedListings.length,
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

console.log('🚀 Flippa worker started');
console.log('Waiting for jobs...');