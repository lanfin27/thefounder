/**
 * Angular-Aware Flippa Extractor
 * Handles Flippa's Angular-based structure with ng-repeat
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

class AngularAwareFlippaExtractor {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.extractedListings = [];
  }

  async executeExtraction() {
    console.log('🚀 ANGULAR-AWARE FLIPPA EXTRACTOR');
    console.log('🎯 Handling ng-repeat structure for 100% extraction');
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

      // Wait for Angular to load
      console.log('⏳ Waiting for Angular to render listings...');
      await page.waitForSelector('div[ng-repeat="listing in results"]', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract page by page
      let allListings = [];
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && currentPage <= 10) { // Limit to 10 pages for testing
        console.log(`\n📄 Extracting page ${currentPage}...`);
        
        // Extract listings from current page
        const pageListings = await page.evaluate(() => {
          const results = [];
          
          // Find all Angular repeated listings
          const listingDivs = document.querySelectorAll('div[ng-repeat="listing in results"]');
          
          listingDivs.forEach((listingDiv) => {
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
                monetization: null,
                verified: false,
                age: null,
                extractionTimestamp: new Date().toISOString()
              };
              
              // Find the main container with ID
              const container = listingDiv.querySelector('[id^="listing-"]');
              if (container) {
                listing.id = container.id.replace('listing-', '');
              }
              
              // Extract URL from the main link
              const mainLink = container ? container.querySelector('a[href^="/"]') : null;
              if (mainLink) {
                const href = mainLink.getAttribute('href');
                listing.url = `https://flippa.com${href}`;
              }
              
              // Extract all text content from the listing
              const allText = container ? container.textContent : '';
              
              // Extract title - look for content between type badges and price
              const typeMatch = allText.match(/(Content|Starter|App|SaaS|E-Commerce|Newsletter|Amazon FBA|Service)\s*\|\s*([^$\n]+?)(?=\$|Confidential|Sign NDA)/);
              if (typeMatch) {
                listing.type = typeMatch[1];
                listing.title = typeMatch[2].trim();
              } else {
                // Fallback: try to extract from structured elements
                const possibleTitleElements = container ? container.querySelectorAll('span, div') : [];
                for (let el of possibleTitleElements) {
                  const text = el.textContent?.trim();
                  if (text && text.length > 20 && text.length < 200 && 
                      !text.includes('$') && !text.includes('Watch') && 
                      !text.includes('View Listing') && !text.includes('/mo')) {
                    listing.title = text;
                    break;
                  }
                }
              }
              
              // Extract price
              const priceMatch = allText.match(/\$?([\d,]+)(?:\s*-\s*\$?[\d,]+)?(?=\s|$)/);
              if (priceMatch) {
                listing.price = parseFloat(priceMatch[1].replace(/,/g, ''));
              }
              
              // Extract monthly revenue/profit
              const monthlyMatch = allText.match(/\$([\d,]+)\s*\/mo/);
              if (monthlyMatch) {
                const amount = parseFloat(monthlyMatch[1].replace(/,/g, ''));
                if (allText.includes('Profit')) {
                  listing.monthlyProfit = amount;
                } else {
                  listing.monthlyRevenue = amount;
                }
              }
              
              // Extract multiple
              const multipleMatch = allText.match(/([\d.]+)\s*x/);
              if (multipleMatch) {
                listing.multiple = parseFloat(multipleMatch[1]);
              }
              
              // Extract age
              const ageMatch = allText.match(/(\d+)\s*(years?|months?)\s*old/i);
              if (ageMatch) {
                listing.age = `${ageMatch[1]} ${ageMatch[2]}`;
              }
              
              // Check if verified
              listing.verified = allText.includes('Verified Listing');
              
              // Extract monetization
              const monetizationPatterns = ['Adsense', 'Affiliate', 'E-Commerce', 'Subscription', 'Amazon', 'Advertising'];
              for (let pattern of monetizationPatterns) {
                if (allText.includes(pattern)) {
                  listing.monetization = pattern;
                  break;
                }
              }
              
              // Only add if we have essential data
              if (listing.id || listing.url) {
                results.push(listing);
              }
              
            } catch (error) {
              console.error('Error extracting listing:', error);
            }
          });
          
          return results;
        });

        allListings = allListings.concat(pageListings);
        console.log(`   Found ${pageListings.length} listings on page ${currentPage}`);
        console.log(`   Total collected: ${allListings.length}`);

        // Check for next page
        const nextButton = await page.$('a[aria-label="Next page"]');
        if (nextButton) {
          const isDisabled = await page.evaluate(el => el.classList.contains('disabled') || el.hasAttribute('disabled'), nextButton);
          
          if (!isDisabled) {
            await nextButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            currentPage++;
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }

      this.extractedListings = allListings;
      
      console.log(`\n✅ Total extracted: ${allListings.length} listings`);
      
      // Calculate quality metrics
      const metrics = {
        total: allListings.length,
        withTitle: allListings.filter(l => l.title).length,
        withUrl: allListings.filter(l => l.url).length,
        withPrice: allListings.filter(l => l.price).length,
        withRevenue: allListings.filter(l => l.monthlyRevenue || l.monthlyProfit).length,
        withMultiple: allListings.filter(l => l.multiple).length,
        verified: allListings.filter(l => l.verified).length
      };
      
      console.log('\n📊 EXTRACTION QUALITY METRICS:');
      console.log(`   📝 Title extraction: ${(metrics.withTitle / metrics.total * 100).toFixed(1)}% (${metrics.withTitle}/${metrics.total})`);
      console.log(`   🔗 URL extraction: ${(metrics.withUrl / metrics.total * 100).toFixed(1)}% (${metrics.withUrl}/${metrics.total})`);
      console.log(`   💰 Price extraction: ${(metrics.withPrice / metrics.total * 100).toFixed(1)}% (${metrics.withPrice}/${metrics.total})`);
      console.log(`   📈 Revenue extraction: ${(metrics.withRevenue / metrics.total * 100).toFixed(1)}% (${metrics.withRevenue}/${metrics.total})`);
      console.log(`   📊 Multiple extraction: ${(metrics.withMultiple / metrics.total * 100).toFixed(1)}% (${metrics.withMultiple}/${metrics.total})`);
      console.log(`   ✅ Verified listings: ${metrics.verified}`);
      
      // Show sample extractions
      console.log('\n📋 SAMPLE EXTRACTIONS:');
      allListings.slice(0, 3).forEach((listing, index) => {
        console.log(`\nSample ${index + 1}:`);
        console.log(`   ID: ${listing.id || '❌ Missing'}`);
        console.log(`   Title: ${listing.title ? listing.title.substring(0, 60) + '...' : '❌ Missing'}`);
        console.log(`   URL: ${listing.url || '❌ Missing'}`);
        console.log(`   Price: ${listing.price ? '$' + listing.price.toLocaleString() : '❌ Missing'}`);
        console.log(`   Revenue: ${listing.monthlyRevenue ? '$' + listing.monthlyRevenue.toLocaleString() + '/mo' : listing.monthlyProfit ? '$' + listing.monthlyProfit.toLocaleString() + '/mo profit' : '❌ Missing'}`);
        console.log(`   Multiple: ${listing.multiple ? listing.multiple + 'x' : '❌ Missing'}`);
        console.log(`   Type: ${listing.type || 'N/A'}`);
        console.log(`   Verified: ${listing.verified ? '✅' : '❌'}`);
      });
      
      // Save results
      if (metrics.withUrl / metrics.total > 0.8 && metrics.withTitle / metrics.total > 0.8) {
        console.log('\n💾 High-quality extraction! Saving to database...');
        await this.saveToDatabase();
      } else {
        console.log('\n📁 Saving extraction results to file...');
        await fs.writeFile(
          `data/angular-extraction-${Date.now()}.json`,
          JSON.stringify({ listings: this.extractedListings, metrics }, null, 2)
        );
      }
      
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      // Save whatever we got
      if (this.extractedListings.length > 0) {
        await fs.writeFile(
          `data/partial-angular-extraction-${Date.now()}.json`,
          JSON.stringify({ listings: this.extractedListings }, null, 2)
        );
      }
    } finally {
      await browser.close();
    }
  }

  async saveToDatabase() {
    try {
      // Transform to database format
      const dbListings = this.extractedListings.map(listing => ({
        listing_id: listing.id || `angular_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: listing.title || null,
        url: listing.url || null,
        price: listing.price || null,
        monthly_revenue: listing.monthlyRevenue || listing.monthlyProfit || null,
        multiple: listing.multiple || null,
        raw_data: {
          ...listing,
          extraction_method: 'angular_aware',
          extraction_version: '3.0'
        }
      }));

      // Upsert in batches
      const batchSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < dbListings.length; i += batchSize) {
        const batch = dbListings.slice(i, i + batchSize);
        
        const { data, error } = await this.supabase
          .from('flippa_listings')
          .upsert(batch, {
            onConflict: 'listing_id',
            returning: 'minimal'
          });

        if (error) {
          console.error(`❌ Batch ${i/batchSize + 1} error:`, error.message);
        } else {
          totalInserted += batch.length;
          console.log(`   ✅ Batch ${i/batchSize + 1}: ${batch.length} listings saved`);
        }
      }
      
      console.log(`\n✅ Total saved to database: ${totalInserted}/${dbListings.length} listings`);
      
      // Run quality monitor
      console.log('\n🔍 Running quality check...');
      const { monitorApifyQuality } = require('./apify-quality-monitor');
      await monitorApifyQuality();
      
    } catch (error) {
      console.error('❌ Database save failed:', error);
      // Save to backup
      await fs.writeFile(
        `data/db-save-failed-${Date.now()}.json`,
        JSON.stringify({ listings: this.extractedListings }, null, 2)
      );
    }
  }
}

// Execute extraction
async function main() {
  const extractor = new AngularAwareFlippaExtractor();
  await extractor.executeExtraction();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AngularAwareFlippaExtractor };