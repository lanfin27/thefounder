/**
 * Updated Flippa Selector Extractor
 * Based on live HTML inspection results - fixes 0% title/URL extraction
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

class UpdatedFlippaExtractor {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.extractedListings = [];
    
    // UPDATED SELECTORS based on live HTML inspection
    this.selectors = {
      // Container selectors - listings have id="listing-XXXXXXX"
      listingContainer: '[id^="listing-"]',
      
      // Title/URL extraction - links to listing pages
      listingLink: 'a[href*="flippa.com/"]:not([href*="watch_item"])',
      
      // Price selectors
      price: [
        '.ng-binding',
        '.tw-font-semibold', 
        '.tw-text-gray-800',
        'span:has-text("$")',
        'div:has-text("$")'
      ],
      
      // Revenue/profit selectors
      revenue: [
        'span:has-text("/mo")',
        'div:has-text("per month")',
        '.ng-binding:has-text("$"):has-text("/mo")'
      ],
      
      // Multiple selectors
      multiple: [
        'span:has-text("x")',
        '.ng-binding:has-text("x")',
        'div:has-text("Multiple")'
      ],
      
      // Additional fields
      type: '.tw-text-sm',
      monetization: 'span.tw-text-gray-600',
      verified: 'span:has-text("Verified")'
    };
  }

  async executeExtraction() {
    console.log('🚀 UPDATED FLIPPA EXTRACTOR WITH MODERN SELECTORS');
    console.log('🎯 Goal: Fix 0% title/URL extraction → 100%');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Go to search page
      console.log('📄 Loading Flippa search page...');
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract all listings
      console.log('🔍 Extracting listings with updated selectors...');
      
      const listings = await page.evaluate((selectors) => {
        const results = [];
        
        // Find all listing containers
        const containers = document.querySelectorAll(selectors.listingContainer);
        console.log(`Found ${containers.length} listing containers`);
        
        containers.forEach((container, index) => {
          try {
            const listing = {
              id: null,
              title: null,
              url: null,
              price: null,
              monthlyRevenue: null,
              multiple: null,
              type: null,
              monetization: null,
              verified: false,
              extractionTimestamp: new Date().toISOString()
            };
            
            // Extract ID from container
            if (container.id && container.id.startsWith('listing-')) {
              listing.id = container.id.replace('listing-', '');
            }
            
            // Extract URL and title from link
            const linkElement = container.querySelector(selectors.listingLink);
            if (linkElement) {
              listing.url = linkElement.href;
              
              // Extract title from link text or nearby elements
              const titleText = linkElement.textContent?.trim();
              if (titleText && titleText.length > 10 && !titleText.includes('View Listing')) {
                listing.title = titleText;
              } else {
                // Try to find title in other elements
                const possibleTitles = container.querySelectorAll('span, div, h3, h4');
                for (let el of possibleTitles) {
                  const text = el.textContent?.trim();
                  if (text && text.length > 20 && text.length < 200 && 
                      !text.includes('$') && !text.includes('View Listing') &&
                      !text.includes('Watch')) {
                    listing.title = text;
                    break;
                  }
                }
              }
            }
            
            // Extract price
            for (let priceSelector of selectors.price) {
              const priceEl = container.querySelector(priceSelector);
              if (priceEl && priceEl.textContent?.includes('$')) {
                const priceMatch = priceEl.textContent.match(/\$[\d,]+(?:\.\d{2})?/);
                if (priceMatch) {
                  listing.price = parseFloat(priceMatch[0].replace(/[$,]/g, ''));
                  break;
                }
              }
            }
            
            // Extract revenue
            for (let revenueSelector of selectors.revenue) {
              const revenueEl = container.querySelector(revenueSelector);
              if (revenueEl && revenueEl.textContent?.includes('$')) {
                const revenueMatch = revenueEl.textContent.match(/\$[\d,]+(?:\.\d{2})?/);
                if (revenueMatch) {
                  listing.monthlyRevenue = parseFloat(revenueMatch[0].replace(/[$,]/g, ''));
                  break;
                }
              }
            }
            
            // Extract multiple
            for (let multipleSelector of selectors.multiple) {
              const multipleEl = container.querySelector(multipleSelector);
              if (multipleEl && multipleEl.textContent?.includes('x')) {
                const multipleMatch = multipleEl.textContent.match(/(\d+(?:\.\d+)?)\s*x/);
                if (multipleMatch) {
                  listing.multiple = parseFloat(multipleMatch[1]);
                  break;
                }
              }
            }
            
            // Extract type
            const typeEl = container.querySelector(selectors.type);
            if (typeEl) {
              listing.type = typeEl.textContent?.trim();
            }
            
            // Extract monetization
            const monetizationEl = container.querySelector(selectors.monetization);
            if (monetizationEl) {
              listing.monetization = monetizationEl.textContent?.trim();
            }
            
            // Check if verified
            const verifiedEl = container.querySelector(selectors.verified);
            listing.verified = !!verifiedEl;
            
            // Generate title from URL if missing
            if (!listing.title && listing.url) {
              const urlParts = listing.url.split('/');
              const lastPart = urlParts[urlParts.length - 1];
              if (lastPart && lastPart.includes('-')) {
                listing.title = lastPart
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
                  .replace(/^\d+\s*/, ''); // Remove leading numbers
              }
            }
            
            // Only add if we have at least ID or URL
            if (listing.id || listing.url) {
              results.push(listing);
            }
            
          } catch (error) {
            console.error(`Error extracting listing ${index}:`, error);
          }
        });
        
        return results;
      }, this.selectors);

      this.extractedListings = listings;
      
      console.log(`\n✅ Extracted ${listings.length} listings`);
      
      // Calculate quality metrics
      const metrics = {
        total: listings.length,
        withTitle: listings.filter(l => l.title).length,
        withUrl: listings.filter(l => l.url).length,
        withPrice: listings.filter(l => l.price).length,
        withRevenue: listings.filter(l => l.monthlyRevenue).length,
        withMultiple: listings.filter(l => l.multiple).length
      };
      
      console.log('\n📊 EXTRACTION QUALITY METRICS:');
      console.log(`   📝 Title extraction: ${(metrics.withTitle / metrics.total * 100).toFixed(1)}% (${metrics.withTitle}/${metrics.total})`);
      console.log(`   🔗 URL extraction: ${(metrics.withUrl / metrics.total * 100).toFixed(1)}% (${metrics.withUrl}/${metrics.total})`);
      console.log(`   💰 Price extraction: ${(metrics.withPrice / metrics.total * 100).toFixed(1)}% (${metrics.withPrice}/${metrics.total})`);
      console.log(`   📈 Revenue extraction: ${(metrics.withRevenue / metrics.total * 100).toFixed(1)}% (${metrics.withRevenue}/${metrics.total})`);
      console.log(`   📊 Multiple extraction: ${(metrics.withMultiple / metrics.total * 100).toFixed(1)}% (${metrics.withMultiple}/${metrics.total})`);
      
      // Show sample extractions
      console.log('\n📋 SAMPLE EXTRACTIONS:');
      listings.slice(0, 3).forEach((listing, index) => {
        console.log(`\nSample ${index + 1}:`);
        console.log(`   ID: ${listing.id || '❌ Missing'}`);
        console.log(`   Title: ${listing.title ? listing.title.substring(0, 60) + '...' : '❌ Missing'}`);
        console.log(`   URL: ${listing.url || '❌ Missing'}`);
        console.log(`   Price: ${listing.price ? '$' + listing.price.toLocaleString() : '❌ Missing'}`);
        console.log(`   Revenue: ${listing.monthlyRevenue ? '$' + listing.monthlyRevenue.toLocaleString() + '/mo' : '❌ Missing'}`);
        console.log(`   Multiple: ${listing.multiple ? listing.multiple + 'x' : '❌ Missing'}`);
      });
      
      // Save to database if quality is good
      if (metrics.withUrl / metrics.total > 0.8) {
        console.log('\n💾 Saving high-quality data to database...');
        await this.saveToDatabase();
      } else {
        console.log('\n⚠️ URL extraction rate too low for database save');
        console.log('📁 Saving to backup file instead...');
        await fs.writeFile(
          `data/updated-extraction-${Date.now()}.json`,
          JSON.stringify({ listings: this.extractedListings, metrics }, null, 2)
        );
      }
      
    } catch (error) {
      console.error('❌ Extraction failed:', error);
    } finally {
      await browser.close();
    }
  }

  async saveToDatabase() {
    try {
      // Transform to database format
      const dbListings = this.extractedListings.map(listing => ({
        listing_id: listing.id || `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: listing.title || null,
        url: listing.url || null,
        price: listing.price || null,
        monthly_revenue: listing.monthlyRevenue || null,
        multiple: listing.multiple || null,
        raw_data: {
          ...listing,
          extraction_method: 'updated_selectors',
          extraction_version: '2.0'
        }
      }));

      // Upsert to database
      const { data, error } = await this.supabase
        .from('flippa_listings')
        .upsert(dbListings, {
          onConflict: 'listing_id',
          returning: 'minimal'
        });

      if (error) {
        console.error('❌ Database error:', error);
        // Save to backup
        await fs.writeFile(
          `data/failed-db-save-${Date.now()}.json`,
          JSON.stringify({ listings: dbListings, error }, null, 2)
        );
      } else {
        console.log('✅ Successfully saved to database!');
      }
      
    } catch (error) {
      console.error('❌ Save failed:', error);
    }
  }
}

// Execute extraction
async function main() {
  const extractor = new UpdatedFlippaExtractor();
  await extractor.executeExtraction();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UpdatedFlippaExtractor };