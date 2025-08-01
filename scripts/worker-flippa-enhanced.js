// Enhanced Flippa worker with improved title extraction
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

// Helper function to extract title
function extractTitle(containerText) {
  let title = '';
  let businessType = '';
  let industry = '';
  
  // Strategy 1: Look for pattern "Type | Industry"
  const typeIndustryMatch = containerText.match(/(SaaS|E-commerce|Blog|Content|Marketplace|Service|App|Newsletter|YouTube)\s*\|\s*([^\n]+)/i);
  if (typeIndustryMatch) {
    businessType = typeIndustryMatch[1].trim();
    industry = typeIndustryMatch[2].trim();
    title = `${businessType} | ${industry}`;
    return { title, businessType, industry };
  }
  
  // Strategy 2: Extract from structured data fields
  const typeMatch = containerText.match(/Type\s+([^\n]+?)(?=\s+Industry|\s+Monetization|\s+Site Age|$)/);
  if (typeMatch) {
    businessType = typeMatch[1].trim();
  }
  
  const industryMatch = containerText.match(/Industry\s+([^\n]+?)(?=\s+Type|\s+Monetization|\s+Site Age|$)/);
  if (industryMatch) {
    industry = industryMatch[1].trim();
  }
  
  if (businessType && industry) {
    title = `${businessType} | ${industry}`;
    return { title, businessType, industry };
  }
  
  // Strategy 3: Look for domain names
  const domainMatch = containerText.match(/([a-zA-Z0-9-]+\.(com|net|org|io|co|xyz|app|ai|dev))/);
  if (domainMatch && !domainMatch[0].includes('flippa.com')) {
    title = domainMatch[0];
    return { title, businessType: businessType || 'SaaS', industry };
  }
  
  // Strategy 4: Handle confidential listings
  if (containerText.includes('Confidential')) {
    title = `Confidential ${businessType || 'SaaS'}${industry ? ' - ' + industry : ''}`;
    return { title, businessType: businessType || 'SaaS', industry };
  }
  
  // Fallback
  title = businessType || 'SaaS Business';
  if (industry && industry !== businessType) {
    title += ` - ${industry}`;
  }
  
  return { title, businessType: businessType || 'SaaS', industry };
}

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
    
    // Extract listings with improved approach
    const listings = await browserPage.evaluate((extractTitleFunc) => {
      const results = [];
      const processedIds = new Set();
      
      // Re-create the function in browser context
      const extractTitle = new Function('return ' + extractTitleFunc)();
      
      // Find listing containers
      const containers = document.querySelectorAll('div.tw-rounded-lg.tw-border.tw-p-4.tw-shadow');
      
      containers.forEach(container => {
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
          
          // Extract title
          const { title, businessType, industry } = extractTitle(containerText);
          
          // Extract other data
          const priceMatches = containerText.match(/\$[\d,]+/g);
          let askingPrice = null;
          if (priceMatches) {
            const prices = priceMatches.map(p => parseInt(p.replace(/[\$,]/g, '')));
            askingPrice = Math.max(...prices);
          }
          
          // Extract profit
          const profitMatch = containerText.match(/Net Profit\s*(?:USD|AUD)?\s*\$([\d,]+)\s*p\/mo/i);
          const monthlyProfit = profitMatch ? parseInt(profitMatch[1].replace(/,/g, '')) : null;
          
          // Extract revenue
          const revenueMatch = containerText.match(/Revenue\s*(?:USD|AUD)?\s*\$([\d,]+)/i);
          const monthlyRevenue = revenueMatch ? parseInt(revenueMatch[1].replace(/,/g, '')) : null;
          
          // Extract multiple
          const multipleMatch = containerText.match(/(\d+\.?\d*)\s*x/i);
          const multiple = multipleMatch ? parseFloat(multipleMatch[1]) : null;
          
          results.push({
            listingId,
            title,
            url: listingUrl,
            askingPrice,
            businessType,
            industry,
            monthlyProfit,
            monthlyRevenue,
            multiple,
            isVerified: containerText.includes('Verified Listing'),
            isSponsored: containerText.includes('Sponsored')
          });
          
        } catch (err) {
          console.error('Error:', err);
        }
      });
      
      return results;
    }, extractTitle.toString());
    
    console.log(`📊 Found ${listings.length} listings`);
    
    // Process and save listings
    const savedListings = [];
    
    for (const listing of listings) {
      if (!listing.askingPrice) continue;
      
      const dbListing = {
        listing_id: listing.listingId,
        title: listing.title,
        url: listing.url,
        asking_price: listing.askingPrice,
        primary_category: (listing.businessType || category).toLowerCase(),
        sub_category: listing.industry ? listing.industry.toLowerCase() : null,
        industry: listing.industry,
        monthly_profit: listing.monthlyProfit,
        monthly_revenue: listing.monthlyRevenue,
        annual_profit: listing.monthlyProfit ? listing.monthlyProfit * 12 : null,
        annual_revenue: listing.monthlyRevenue ? listing.monthlyRevenue * 12 : null,
        revenue_multiple: listing.multiple,
        is_verified: listing.isVerified || false,
        is_featured: listing.isSponsored || false,
        raw_data: {
          businessType: listing.businessType,
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

console.log('🚀 Enhanced Flippa worker started');
console.log('Waiting for jobs...');