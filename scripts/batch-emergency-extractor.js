/**
 * Batch Emergency Extractor - Processes specific page ranges
 * Can be run in parallel for faster extraction
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

class BatchEmergencyExtractor {
  constructor(startPage = 1, endPage = 50) {
    this.startPage = startPage;
    this.endPage = endPage;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.extractedListings = [];
  }

  async executeBatchExtraction() {
    console.log(`🚀 BATCH EMERGENCY EXTRACTOR (Pages ${this.startPage}-${this.endPage})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      for (let pageNum = this.startPage; pageNum <= this.endPage; pageNum++) {
        console.log(`📄 Page ${pageNum}...`);
        
        const pageUrl = `https://flippa.com/search?filter[property_type][]=website&page=${pageNum}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const listings = await page.evaluate((pageNumber) => {
          const results = [];
          
          // Find listing containers
          let containers = document.querySelectorAll('div[ng-repeat="listing in results"]');
          if (containers.length === 0) {
            containers = document.querySelectorAll('[id^="listing-"]');
          }
          
          containers.forEach((container) => {
            try {
              const listing = {
                id: null,
                title: null,
                url: null,
                price: null,
                monthlyRevenue: null,
                multiple: null,
                pageNumber: pageNumber
              };
              
              // Extract ID
              if (container.id && container.id.startsWith('listing-')) {
                listing.id = container.id.replace('listing-', '');
              }
              
              // Extract URL
              const link = container.querySelector('a[href^="/"]');
              if (link) {
                const href = link.getAttribute('href');
                listing.url = `https://flippa.com${href}`;
                if (!listing.id && href) {
                  listing.id = href.replace('/', '');
                }
              }
              
              const text = container.textContent || '';
              
              // Extract title
              if (text.includes('Confidential') && text.includes('NDA')) {
                listing.title = 'Confidential Listing - NDA Required';
              } else {
                const lines = text.split('\n').map(l => l.trim()).filter(l => 
                  l.length > 10 && l.length < 200 && 
                  !/^\$|^\d+x|Watch|View Listing|USD/.test(l)
                );
                if (lines.length > 0) {
                  listing.title = lines[0];
                }
              }
              
              // Extract price
              const priceMatch = text.match(/\$([0-9,]+)/);
              if (priceMatch) {
                listing.price = parseInt(priceMatch[1].replace(/,/g, ''));
              }
              
              // Extract revenue
              const revenueMatch = text.match(/\$([0-9,]+)\s*\/\s*mo/i);
              if (revenueMatch) {
                listing.monthlyRevenue = parseInt(revenueMatch[1].replace(/,/g, ''));
              }
              
              // Extract multiple
              const multipleMatch = text.match(/([\d.]+)\s*x/);
              if (multipleMatch) {
                listing.multiple = parseFloat(multipleMatch[1]);
              }
              
              if (listing.id || listing.url) {
                results.push(listing);
              }
            } catch (e) {}
          });
          
          return results;
        }, pageNum);

        if (listings.length > 0) {
          this.extractedListings = this.extractedListings.concat(listings);
          console.log(`   ✅ Found ${listings.length} listings (Total: ${this.extractedListings.length})`);
        } else {
          console.log(`   ⚠️ No listings found`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await browser.close();
    }

    // Save results
    await this.saveResults();
  }

  async saveResults() {
    const metrics = {
      total: this.extractedListings.length,
      withTitle: this.extractedListings.filter(l => l.title).length,
      withPrice: this.extractedListings.filter(l => l.price).length,
      withRevenue: this.extractedListings.filter(l => l.monthlyRevenue).length
    };
    
    console.log('\n📊 BATCH RESULTS:');
    console.log(`   Total: ${metrics.total}`);
    console.log(`   With Title: ${metrics.withTitle} (${(metrics.withTitle/metrics.total*100).toFixed(1)}%)`);
    console.log(`   With Price: ${metrics.withPrice} (${(metrics.withPrice/metrics.total*100).toFixed(1)}%)`);
    console.log(`   With Revenue: ${metrics.withRevenue} (${(metrics.withRevenue/metrics.total*100).toFixed(1)}%)`);
    
    // Save to file
    const filename = `batch-extraction-pages-${this.startPage}-${this.endPage}-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify({
      pageRange: `${this.startPage}-${this.endPage}`,
      metrics,
      listings: this.extractedListings
    }, null, 2));
    
    console.log(`\n💾 Saved: ${filename}`);
    
    // If this is the first batch, save to database
    if (this.startPage === 1 && metrics.total > 100) {
      console.log('\n🗄️ Saving to database...');
      
      try {
        const dbListings = this.extractedListings.map(listing => ({
          listing_id: listing.id || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: listing.title || '',
          url: listing.url || '',
          price: listing.price || null,
          monthly_revenue: listing.monthlyRevenue || null,
          multiple: listing.multiple || null,
          raw_data: listing
        }));
        
        // Clear old data
        await this.supabase.from('flippa_listings').delete().neq('listing_id', '');
        
        // Insert new data
        const batchSize = 100;
        for (let i = 0; i < dbListings.length; i += batchSize) {
          const batch = dbListings.slice(i, i + batchSize);
          const { error } = await this.supabase.from('flippa_listings').insert(batch);
          if (!error) {
            console.log(`   ✅ Saved batch ${Math.floor(i/batchSize) + 1}`);
          }
        }
        
        console.log(`✅ Saved ${dbListings.length} listings to database!`);
      } catch (error) {
        console.error('Database error:', error);
      }
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const startPage = parseInt(args[0]) || 1;
const endPage = parseInt(args[1]) || 50;

// Execute
const extractor = new BatchEmergencyExtractor(startPage, endPage);
extractor.executeBatchExtraction().catch(console.error);