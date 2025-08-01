// Analyze all Flippa links to find correct patterns
const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeFlippaLinks() {
  console.log('🔍 Analyzing Flippa Link Patterns');
  console.log('=' .repeat(70));
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 50
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
    
    // Analyze all links on the page
    console.log('\n📊 Analyzing link patterns...');
    
    const linkAnalysis = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const linkPatterns = {};
      const sampleLinks = [];
      
      // Categorize links by pattern
      allLinks.forEach(link => {
        const href = link.href;
        const text = link.textContent?.trim() || '';
        
        // Extract path pattern
        let pattern = 'unknown';
        if (href.includes('flippa.com')) {
          const url = new URL(href);
          const pathParts = url.pathname.split('/').filter(p => p);
          
          if (pathParts.length > 0) {
            pattern = '/' + pathParts[0];
            if (pathParts.length > 1 && !pathParts[1].match(/^\d/)) {
              pattern += '/' + pathParts[1];
            }
          }
        }
        
        // Count patterns
        linkPatterns[pattern] = (linkPatterns[pattern] || 0) + 1;
        
        // Collect samples of interesting links
        const pathParts = href.includes('flippa.com') ? new URL(href).pathname.split('/').filter(p => p) : [];
        
        if (sampleLinks.length < 100 && 
            (text.includes('SaaS') || 
             text.includes('Business') || 
             text.includes('$') ||
             href.includes('business') ||
             href.includes('listing') ||
             href.includes('/websites/') ||
             (pathParts && pathParts.length > 1))) {
          sampleLinks.push({
            href: href,
            text: text.substring(0, 100),
            pattern: pattern,
            hasPrice: link.parentElement?.textContent?.includes('$') || false
          });
        }
      });
      
      return {
        totalLinks: allLinks.length,
        patterns: linkPatterns,
        samples: sampleLinks
      };
    });
    
    console.log(`\n📈 Link Analysis Results:`);
    console.log(`   Total links: ${linkAnalysis.totalLinks}`);
    console.log('\n   Link patterns found:');
    Object.entries(linkAnalysis.patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} links`);
      });
    
    console.log('\n   Sample links with business context:');
    linkAnalysis.samples.slice(0, 20).forEach((link, i) => {
      console.log(`\n   ${i + 1}. Text: "${link.text}"`);
      console.log(`      URL: ${link.href}`);
      console.log(`      Pattern: ${link.pattern}`);
      console.log(`      Near price: ${link.hasPrice}`);
    });
    
    // Now extract listings using price elements as anchors
    console.log('\n\n💰 Extracting listings from price elements...');
    
    const listings = await page.evaluate(() => {
      const results = [];
      const processedContainers = new Set();
      
      // Find all elements with prices
      const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.match(/USD\s*\$[\d,]+|\$[\d,]+(?:,\d{3})*/) && 
               text.length < 100 && 
               el.children.length === 0; // Leaf nodes only
      });
      
      console.log(`Found ${priceElements.length} price elements`);
      
      priceElements.forEach((priceEl, index) => {
        try {
          // Navigate up to find a meaningful container
          let container = priceEl.parentElement;
          let depth = 0;
          
          while (container && depth < 10) {
            // Check if we've already processed this container
            if (processedContainers.has(container)) {
              break;
            }
            
            // Look for any link within this container
            const links = container.querySelectorAll('a');
            
            if (links.length > 0) {
              // Found a container with links
              processedContainers.add(container);
              
              const containerText = container.textContent || '';
              
              // Find the most relevant link (usually the first or one with title)
              let mainLink = null;
              let mainTitle = '';
              
              links.forEach(link => {
                const linkText = link.textContent?.trim() || '';
                // Prioritize links with SaaS or Business in them
                if (linkText.includes('SaaS') || linkText.includes('Business') || linkText.length > mainTitle.length) {
                  mainLink = link;
                  mainTitle = linkText;
                }
              });
              
              if (!mainLink) {
                mainLink = links[0];
                mainTitle = mainLink.textContent?.trim() || '';
              }
              
              // Extract price
              const priceText = priceEl.textContent?.trim();
              
              // Look for additional metrics
              const revenueMatch = containerText.match(/Revenue[:\s]*\$?([\d,]+)/i);
              const profitMatch = containerText.match(/Profit[:\s]*\$?([\d,]+)/i);
              const multipleMatch = containerText.match(/(\d+\.?\d*)x/i);
              
              results.push({
                index: index,
                title: mainTitle || 'Untitled',
                url: mainLink.href,
                priceText: priceText,
                revenue: revenueMatch ? revenueMatch[1] : null,
                profit: profitMatch ? profitMatch[1] : null,
                multiple: multipleMatch ? multipleMatch[1] : null,
                containerHTML: container.outerHTML.substring(0, 500),
                allLinks: Array.from(links).map(l => ({
                  href: l.href,
                  text: l.textContent?.trim()
                }))
              });
              
              break;
            }
            
            container = container.parentElement;
            depth++;
          }
        } catch (err) {
          console.error('Error processing price element:', err);
        }
      });
      
      return results;
    });
    
    console.log(`\n✅ Extracted ${listings.length} listings from price elements`);
    
    if (listings.length > 0) {
      console.log('\n📋 Sample extracted listings:');
      listings.slice(0, 10).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   Price: ${listing.priceText}`);
        console.log(`   URL: ${listing.url}`);
        if (listing.revenue) console.log(`   Revenue: $${listing.revenue}`);
        if (listing.profit) console.log(`   Profit: $${listing.profit}`);
        if (listing.multiple) console.log(`   Multiple: ${listing.multiple}x`);
        console.log(`   Links in container: ${listing.allLinks.length}`);
        listing.allLinks.slice(0, 3).forEach(link => {
          console.log(`     - "${link.text}" -> ${link.href}`);
        });
      });
      
      // Save to database
      console.log('\n💾 Saving to database...');
      const dbListings = [];
      
      for (const listing of listings.slice(0, 50)) { // Save up to 50
        // Parse price
        const priceMatch = listing.priceText?.match(/\$?([\d,]+)/);
        const askingPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
        
        if (!askingPrice) continue;
        
        // Extract ID from URL or generate
        const urlParts = listing.url.split('/');
        const listingId = urlParts[urlParts.length - 1] || `analyzed_${Date.now()}_${listing.index}`;
        
        dbListings.push({
          listing_id: listingId,
          title: listing.title,
          url: listing.url,
          asking_price: askingPrice,
          primary_category: 'saas',
          monthly_revenue: listing.revenue ? parseInt(listing.revenue.replace(/,/g, '')) : null,
          monthly_profit: listing.profit ? parseInt(listing.profit.replace(/,/g, '')) : null,
          revenue_multiple: listing.multiple ? parseFloat(listing.multiple) : null,
          raw_data: {
            priceText: listing.priceText,
            linksFound: listing.allLinks.length,
            extractedAt: new Date().toISOString()
          }
        });
      }
      
      if (dbListings.length > 0) {
        const { data, error } = await supabase
          .from('flippa_listings')
          .upsert(dbListings, { onConflict: 'listing_id' })
          .select();
        
        if (error) {
          console.log('❌ Database error:', error.message);
        } else {
          console.log(`✅ Saved ${data.length} listings to database`);
        }
      }
    }
    
    // Save analysis results
    require('fs').writeFileSync('flippa-link-analysis.json', JSON.stringify({
      linkAnalysis,
      listings: listings.slice(0, 20)
    }, null, 2));
    console.log('\n📄 Full analysis saved to flippa-link-analysis.json');
    
    console.log('\n⏸️ Browser will remain open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

analyzeFlippaLinks().catch(console.error);