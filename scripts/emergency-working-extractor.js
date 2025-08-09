/**
 * Emergency Working Extractor - Based on REAL HTML structure
 * Fixes all critical failures with proper selectors
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

class EmergencyWorkingExtractor {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.extractedListings = new Map();
    this.totalPagesProcessed = 0;
  }

  async executeEmergencyExtraction() {
    console.log('🚨 EMERGENCY WORKING EXTRACTOR');
    console.log('🎯 Using REAL Angular selectors from actual HTML');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Start with main search page
      console.log('📄 Loading Flippa marketplace...');
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait for Angular to load
      console.log('⏳ Waiting for Angular listings...');
      try {
        await page.waitForSelector('div[ng-repeat="listing in results"]', { timeout: 30000 });
      } catch (e) {
        console.log('⚠️ Angular selector not found, trying alternative approach...');
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract from multiple pages
      let currentPage = 1;
      let consecutiveEmptyPages = 0;
      const maxPages = 300; // Process many pages

      while (consecutiveEmptyPages < 5 && currentPage <= maxPages) {
        console.log(`\n📄 Processing page ${currentPage}...`);
        
        // Navigate to specific page
        const pageUrl = `https://flippa.com/search?filter[property_type][]=website&page=${currentPage}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract listings from current page
        const pageListings = await page.evaluate(() => {
          const listings = [];
          
          // Method 1: Angular repeat
          let containers = document.querySelectorAll('div[ng-repeat="listing in results"]');
          
          // Method 2: ID-based containers
          if (containers.length === 0) {
            containers = document.querySelectorAll('[id^="listing-"]');
          }
          
          // Method 3: Any element with listing structure
          if (containers.length === 0) {
            // Find divs that contain both a link and price info
            const allDivs = document.querySelectorAll('div');
            const potentialContainers = [];
            
            allDivs.forEach(div => {
              const hasLink = div.querySelector('a[href^="/"]');
              const text = div.textContent || '';
              const hasPrice = /\$[\d,]+/.test(text);
              
              if (hasLink && hasPrice && div.children.length > 2) {
                potentialContainers.push(div);
              }
            });
            
            containers = potentialContainers;
          }
          
          console.log(`Found ${containers.length} potential listing containers`);
          
          containers.forEach((container) => {
            try {
              const listing = {
                id: null,
                title: null,
                url: null,
                price: null,
                monthlyRevenue: null,
                monthlyProfit: null,
                multiple: null,
                type: null,
                age: null,
                verified: false,
                extractionMethod: 'emergency',
                pageNumber: new URLSearchParams(window.location.search).get('page') || '1'
              };
              
              // Extract ID
              if (container.id && container.id.startsWith('listing-')) {
                listing.id = container.id.replace('listing-', '');
              } else {
                // Try to find ID from child elements
                const idElement = container.querySelector('[id^="listing-"]');
                if (idElement) {
                  listing.id = idElement.id.replace('listing-', '');
                }
              }
              
              // Extract URL
              const linkElement = container.querySelector('a[href^="/"]');
              if (linkElement) {
                const href = linkElement.getAttribute('href');
                if (href && /^\/\d+/.test(href)) {
                  listing.url = `https://flippa.com${href}`;
                  if (!listing.id) {
                    listing.id = href.replace('/', '');
                  }
                }
              }
              
              // Extract all text for analysis
              const fullText = container.textContent || '';
              
              // Extract title
              // Look for "Confidential" pattern first
              if (fullText.includes('Confidential') && fullText.includes('NDA')) {
                listing.title = 'Confidential Listing - NDA Required';
              } else {
                // Try to extract title from various patterns
                const titlePatterns = [
                  // Pattern: Type | Category | Title
                  /(?:Content|Starter|App|SaaS|E-Commerce|Newsletter|Amazon FBA|Service)\s*\|\s*([^|]+)\s*\|?\s*([^$\n]+?)(?=\$|Managed|Verified|\n)/,
                  // Pattern: Just title before price
                  /^([^$\n]{10,200})(?=\$)/m,
                  // Pattern: Text between badges and numbers
                  /(?:Verified Listing\s+)?([^$\n]{10,200})(?=\$|\d+x)/
                ];
                
                for (const pattern of titlePatterns) {
                  const match = fullText.match(pattern);
                  if (match) {
                    listing.title = (match[2] || match[1]).trim();
                    break;
                  }
                }
                
                // Fallback: Get longest text that's not a number
                if (!listing.title) {
                  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 10 && l.length < 200 && !/^\$|^\d+x|Watch|View Listing/.test(l));
                  if (lines.length > 0) {
                    listing.title = lines[0];
                  }
                }
              }
              
              // Extract type
              const typeMatch = fullText.match(/(Content|Starter|App|SaaS|E-Commerce|Newsletter|Amazon FBA|Service)(?:\s*\|)?/);
              if (typeMatch) {
                listing.type = typeMatch[1];
              }
              
              // Extract price
              const priceMatch = fullText.match(/\$([0-9,]+)(?:\s*-\s*\$[0-9,]+)?/);
              if (priceMatch) {
                listing.price = parseInt(priceMatch[1].replace(/,/g, ''));
              }
              
              // Extract revenue/profit
              const revenueMatch = fullText.match(/\$([0-9,]+)\s*\/\s*mo(?:\s*(profit|revenue))?/i);
              if (revenueMatch) {
                const amount = parseInt(revenueMatch[1].replace(/,/g, ''));
                if (revenueMatch[2] && revenueMatch[2].toLowerCase() === 'profit') {
                  listing.monthlyProfit = amount;
                } else {
                  listing.monthlyRevenue = amount;
                }
              }
              
              // Extract multiple
              const multipleMatch = fullText.match(/([\d.]+)\s*x/);
              if (multipleMatch) {
                listing.multiple = parseFloat(multipleMatch[1]);
              }
              
              // Extract age
              const ageMatch = fullText.match(/(\d+)\s*(years?|months?)\s*old/i);
              if (ageMatch) {
                listing.age = `${ageMatch[1]} ${ageMatch[2]}`;
              }
              
              // Check verified status
              listing.verified = fullText.includes('Verified Listing');
              
              // Only add if we have at least ID or URL
              if (listing.id || listing.url) {
                listings.push(listing);
              }
              
            } catch (error) {
              console.error('Extraction error:', error);
            }
          });
          
          return listings;
        });

        if (pageListings.length === 0) {
          consecutiveEmptyPages++;
          console.log(`   ⚠️ No listings found (${consecutiveEmptyPages}/5 empty pages)`);
        } else {
          consecutiveEmptyPages = 0;
          
          // Add to map (deduplicate by ID)
          pageListings.forEach(listing => {
            const key = listing.id || listing.url || `page${currentPage}_${Math.random()}`;
            this.extractedListings.set(key, listing);
          });
          
          console.log(`   ✅ Found ${pageListings.length} listings (Total: ${this.extractedListings.size})`);
          
          // Show sample
          if (pageListings.length > 0) {
            const sample = pageListings[0];
            console.log(`   📋 Sample: ${sample.title || 'No title'} - ${sample.price ? '$' + sample.price.toLocaleString() : 'No price'}`);
          }
        }
        
        currentPage++;
        this.totalPagesProcessed++;
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      }

    } catch (error) {
      console.error('❌ Critical error:', error);
    } finally {
      await browser.close();
      
      // Save and report results
      await this.saveResults();
    }
  }

  async saveResults() {
    const listings = Array.from(this.extractedListings.values());
    
    console.log('\n📊 EMERGENCY EXTRACTION RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📄 Pages processed: ${this.totalPagesProcessed}`);
    console.log(`📋 Total listings: ${listings.length}`);
    
    // Calculate quality metrics
    const metrics = {
      total: listings.length,
      withTitle: listings.filter(l => l.title && l.title.length > 5).length,
      withUrl: listings.filter(l => l.url).length,
      withPrice: listings.filter(l => l.price > 0).length,
      withRevenue: listings.filter(l => l.monthlyRevenue > 0 || l.monthlyProfit > 0).length,
      withMultiple: listings.filter(l => l.multiple > 0).length,
      verified: listings.filter(l => l.verified).length
    };
    
    const rates = {
      title: ((metrics.withTitle / metrics.total) * 100).toFixed(1),
      url: ((metrics.withUrl / metrics.total) * 100).toFixed(1),
      price: ((metrics.withPrice / metrics.total) * 100).toFixed(1),
      revenue: ((metrics.withRevenue / metrics.total) * 100).toFixed(1),
      multiple: ((metrics.withMultiple / metrics.total) * 100).toFixed(1)
    };
    
    console.log('\n📈 EXTRACTION QUALITY:');
    console.log(`   📝 Title: ${rates.title}% (${metrics.withTitle}/${metrics.total}) ${parseFloat(rates.title) >= 50 ? '✅' : '❌'}`);
    console.log(`   🔗 URL: ${rates.url}% (${metrics.withUrl}/${metrics.total}) ${parseFloat(rates.url) >= 90 ? '✅' : '❌'}`);
    console.log(`   💰 Price: ${rates.price}% (${metrics.withPrice}/${metrics.total}) ${parseFloat(rates.price) >= 40 ? '✅' : '❌'}`);
    console.log(`   📈 Revenue: ${rates.revenue}% (${metrics.withRevenue}/${metrics.total}) ${parseFloat(rates.revenue) >= 30 ? '✅' : '❌'}`);
    console.log(`   📊 Multiple: ${rates.multiple}% (${metrics.withMultiple}/${metrics.total}) ${parseFloat(rates.multiple) >= 40 ? '✅' : '❌'}`);
    console.log(`   ✅ Verified: ${metrics.verified} listings`);
    
    // Save backup
    const timestamp = Date.now();
    const backupFile = `emergency-extraction-${timestamp}.json`;
    await fs.writeFile(backupFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      rates,
      listings
    }, null, 2));
    console.log(`\n💾 Backup saved: ${backupFile}`);
    
    // Save to database if quality is good
    if (metrics.total > 100 && parseFloat(rates.url) > 80) {
      console.log('\n🗄️ Saving to database...');
      
      try {
        // Clear old data first
        const { error: deleteError } = await this.supabase
          .from('flippa_listings')
          .delete()
          .neq('listing_id', '');
          
        if (deleteError) {
          console.log('⚠️ Could not clear old data:', deleteError.message);
        }
        
        // Transform for database
        const dbListings = listings.map(listing => ({
          listing_id: listing.id || `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: listing.title || '',
          url: listing.url || '',
          price: listing.price || null,
          monthly_revenue: listing.monthlyRevenue || listing.monthlyProfit || null,
          multiple: listing.multiple || null,
          raw_data: {
            ...listing,
            source: 'emergency_extractor',
            extractionDate: new Date().toISOString()
          }
        }));
        
        // Insert in batches
        const batchSize = 100;
        let successCount = 0;
        
        for (let i = 0; i < dbListings.length; i += batchSize) {
          const batch = dbListings.slice(i, i + batchSize);
          
          const { error } = await this.supabase
            .from('flippa_listings')
            .insert(batch);
            
          if (!error) {
            successCount += batch.length;
            console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} saved`);
          } else {
            console.error(`   ❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
          }
        }
        
        console.log(`\n✅ Successfully saved ${successCount}/${dbListings.length} listings!`);
        
      } catch (error) {
        console.error('❌ Database error:', error);
      }
    }
    
    // Show samples
    console.log('\n📋 SAMPLE LISTINGS:');
    listings.slice(0, 5).forEach((listing, i) => {
      console.log(`\n${i + 1}. ${listing.title || 'No title'}`);
      console.log(`   ID: ${listing.id || 'N/A'}`);
      console.log(`   URL: ${listing.url || 'N/A'}`);
      console.log(`   Price: ${listing.price ? '$' + listing.price.toLocaleString() : 'N/A'}`);
      console.log(`   Revenue: ${listing.monthlyRevenue ? '$' + listing.monthlyRevenue.toLocaleString() + '/mo' : listing.monthlyProfit ? '$' + listing.monthlyProfit.toLocaleString() + '/mo profit' : 'N/A'}`);
      console.log(`   Multiple: ${listing.multiple ? listing.multiple + 'x' : 'N/A'}`);
    });
    
    console.log('\n🎉 EMERGENCY EXTRACTION COMPLETE!');
    console.log(`🏆 Coverage: ${((this.totalPagesProcessed / 85) * 100).toFixed(1)}% (vs 34% before)`);
    
    return {
      success: metrics.total > 1000,
      total: metrics.total,
      metrics,
      rates
    };
  }
}

// Execute
async function main() {
  const extractor = new EmergencyWorkingExtractor();
  await extractor.executeEmergencyExtraction();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EmergencyWorkingExtractor };