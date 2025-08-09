// scripts/enhanced-working-extractor.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class EnhancedWorkingExtractor {
  constructor() {
    this.extractedListings = new Map();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async executeExtraction() {
    console.log('🚀 ENHANCED WORKING FLIPPA EXTRACTOR');
    console.log('🎯 Combining all successful extraction methods');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    let page = 1;
    let consecutiveEmptyPages = 0;
    const maxPages = 200;
    
    while (consecutiveEmptyPages < 10 && page <= maxPages) {
      try {
        console.log(`\n📄 Processing page ${page}...`);
        
        const browserPage = await browser.newPage();
        await browserPage.goto(`https://flippa.com/search?filter[property_type][]=website&page=${page}`, {
          waitUntil: 'networkidle2',
          timeout: 45000
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Combined extraction approach
        const listings = await browserPage.evaluate(() => {
          // 1. First try Angular ng-repeat approach (proven to work)
          let containers = document.querySelectorAll('div[ng-repeat="listing in results"]');
          
          // 2. If no Angular containers, use aggressive price-based approach
          if (containers.length === 0) {
            const priceElements = [];
            document.querySelectorAll('*').forEach(el => {
              const text = el.textContent || '';
              if (/\$[\d,]+/.test(text) && text.length < 500) {
                priceElements.push(el);
              }
            });
            
            if (priceElements.length > 0) {
              const uniqueContainers = [];
              priceElements.forEach(priceEl => {
                let container = priceEl;
                for (let i = 0; i < 5; i++) {
                  if (container.parentElement) {
                    container = container.parentElement;
                    const hasMultipleChildren = container.children.length > 2;
                    const hasText = container.textContent.length > 50;
                    if (hasMultipleChildren && hasText) {
                      break;
                    }
                  }
                }
                
                if (!uniqueContainers.includes(container)) {
                  uniqueContainers.push(container);
                }
              });
              
              containers = uniqueContainers.slice(0, 25);
            }
          }
          
          console.log(`Found ${containers.length} listing containers`);
          
          return Array.from(containers).map((container, index) => {
            const listing = {
              id: `enhanced_${Date.now()}_${index}`,
              extractionMethod: 'combined'
            };
            
            const fullText = container.textContent || '';
            
            // URL extraction - most reliable
            const links = container.querySelectorAll('a[href]');
            for (const link of links) {
              if (link.href && (link.href.includes('flippa.com') || link.href.includes('/listings/'))) {
                listing.url = link.href;
                const idMatch = link.href.match(/listings\/(\d+)/);
                if (idMatch) {
                  listing.id = idMatch[1];
                }
                
                // Title often in the link text
                if (link.textContent && link.textContent.trim().length > 5) {
                  listing.title = link.textContent.trim();
                }
                break;
              }
            }
            
            // Title extraction fallback
            if (!listing.title) {
              const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'strong', 'b'];
              for (const selector of titleSelectors) {
                const el = container.querySelector(selector);
                if (el && el.textContent && el.textContent.trim().length > 5) {
                  listing.title = el.textContent.trim();
                  break;
                }
              }
            }
            
            // If still no title, find longest reasonable text
            if (!listing.title) {
              const textNodes = fullText.split('\n')
                .map(line => line.trim())
                .filter(line => 
                  line.length > 10 && 
                  line.length < 200 && 
                  !line.includes('$') &&
                  !line.match(/^\d+$/) &&
                  line.split(' ').length > 2
                );
              
              if (textNodes.length > 0) {
                listing.title = textNodes.sort((a, b) => b.length - a.length)[0];
              }
            }
            
            // Price extraction - all patterns
            const priceMatches = fullText.match(/\$\s?([\d,]+)(?:\s|$)/g) || [];
            const prices = priceMatches.map(m => parseInt(m.replace(/[$,\s]/g, '')));
            if (prices.length > 0) {
              // Take the largest reasonable price as the listing price
              listing.price = Math.max(...prices.filter(p => p < 10000000));
            }
            
            // Revenue extraction - comprehensive patterns
            const revenuePatterns = [
              /revenue[:\s]*\$?\s?([\d,]+)/i,
              /profit[:\s]*\$?\s?([\d,]+)/i,
              /\$\s?([\d,]+)\s*\/\s*mo/i,
              /monthly[:\s]*\$?\s?([\d,]+)/i,
              /per\s*month[:\s]*\$?\s?([\d,]+)/i,
              /\$\s?([\d,]+)\s*per\s*month/i,
              /\$\s?([\d,]+)\s*monthly/i
            ];
            
            for (const pattern of revenuePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                listing.monthlyRevenue = parseInt(match[1].replace(/,/g, ''));
                break;
              }
            }
            
            // Multiple extraction
            const multiplePatterns = [
              /(\d+\.?\d*)x/i,
              /multiple[:\s]*(\d+\.?\d*)/i,
              /(\d+\.?\d*)\s*multiple/i
            ];
            
            for (const pattern of multiplePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                listing.multiple = parseFloat(match[1]);
                break;
              }
            }
            
            // Calculate multiple if we have price and revenue
            if (!listing.multiple && listing.price && listing.monthlyRevenue && listing.monthlyRevenue > 0) {
              listing.multiple = parseFloat((listing.price / (listing.monthlyRevenue * 12)).toFixed(1));
            }
            
            // Only return if we have meaningful data
            return (listing.title || listing.url || listing.price) ? listing : null;
          }).filter(Boolean);
        });
        
        if (listings.length === 0) {
          consecutiveEmptyPages++;
          console.log(`⚠️ Page ${page}: No listings found (${consecutiveEmptyPages}/10)`);
        } else {
          consecutiveEmptyPages = 0;
          
          listings.forEach(listing => {
            const key = listing.id || listing.url || `${page}_${Math.random()}`;
            this.extractedListings.set(key, listing);
          });
          
          console.log(`✅ Page ${page}: +${listings.length} listings (Total: ${this.extractedListings.size})`);
          
          // Show extraction quality
          const sample = listings[0];
          if (sample) {
            console.log('   Quality check:', {
              title: sample.title ? '✓' : '✗',
              url: sample.url ? '✓' : '✗',
              price: sample.price ? `✓ $${sample.price.toLocaleString()}` : '✗',
              revenue: sample.monthlyRevenue ? `✓ $${sample.monthlyRevenue}/mo` : '✗',
              multiple: sample.multiple ? `✓ ${sample.multiple}x` : '✗'
            });
          }
        }
        
        await browserPage.close();
        page++;
        
        // Save progress every 20 pages
        if (page % 20 === 0) {
          await this.saveProgress();
        }
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
      } catch (error) {
        console.error(`❌ Page ${page} failed:`, error.message);
        page++;
        consecutiveEmptyPages++;
      }
    }
    
    await browser.close();
    
    // Final save
    await this.saveResults();
    
    return this.generateReport();
  }

  async saveProgress() {
    const listings = Array.from(this.extractedListings.values());
    console.log(`💾 Saving progress: ${listings.length} listings...`);
    
    fs.writeFileSync(`enhanced-progress-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      count: listings.length,
      sample: listings.slice(-10)
    }, null, 2));
  }

  async saveResults() {
    const listings = Array.from(this.extractedListings.values());
    
    // Quality analysis
    const quality = {
      total: listings.length,
      withTitle: listings.filter(l => l.title && l.title.length > 5).length,
      withPrice: listings.filter(l => l.price && l.price > 0).length,
      withRevenue: listings.filter(l => l.monthlyRevenue && l.monthlyRevenue > 0).length,
      withURL: listings.filter(l => l.url && l.url.includes('flippa')).length,
      withMultiple: listings.filter(l => l.multiple && l.multiple > 0).length
    };
    
    const rates = {
      title: (quality.withTitle / quality.total * 100).toFixed(1),
      price: (quality.withPrice / quality.total * 100).toFixed(1),
      revenue: (quality.withRevenue / quality.total * 100).toFixed(1),
      url: (quality.withURL / quality.total * 100).toFixed(1),
      multiple: (quality.withMultiple / quality.total * 100).toFixed(1)
    };
    
    console.log('\n📊 ENHANCED EXTRACTOR FINAL RESULTS:');
    console.log('====================================');
    console.log(`📋 Total: ${quality.total} listings`);
    console.log(`📝 Title: ${rates.title}% (${quality.withTitle} listings)`);
    console.log(`💰 Price: ${rates.price}% (${quality.withPrice} listings)`);
    console.log(`🔗 URL: ${rates.url}% (${quality.withURL} listings)`);
    console.log(`📈 Revenue: ${rates.revenue}% (${quality.withRevenue} listings)`);
    console.log(`📊 Multiple: ${rates.multiple}% (${quality.withMultiple} listings)`);
    
    // Database save
    try {
      const dbListings = listings.map((listing, index) => ({
        listing_id: listing.id || `enhanced_${index}`,
        title: listing.title || '',
        price: listing.price || null,
        monthly_profit: listing.monthlyRevenue || null,
        monthly_revenue: listing.monthlyRevenue || null,
        multiple: listing.multiple || null,
        url: listing.url || '',
        raw_data: {
          source: 'enhanced_working_extractor',
          extractionMethod: listing.extractionMethod,
          extractedAt: new Date().toISOString(),
          ...listing
        }
      }));
      
      // Clear old data
      await this.supabase.from('flippa_listings').delete().neq('listing_id', '');
      
      // Save in batches
      const batchSize = 100;
      let saved = 0;
      
      for (let i = 0; i < dbListings.length; i += batchSize) {
        const batch = dbListings.slice(i, i + batchSize);
        const { error } = await this.supabase.from('flippa_listings').insert(batch);
        
        if (!error) {
          saved += batch.length;
          console.log(`💾 Saved batch: ${saved}/${dbListings.length}`);
        } else {
          console.error('❌ Save error:', error.message);
        }
      }
      
      console.log(`\n🎉 Successfully saved ${saved} listings to database!`);
    } catch (error) {
      console.error('Database error:', error);
    }
    
    // Final backup
    fs.writeFileSync(`enhanced-final-backup-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      quality: quality,
      rates: rates,
      listings: listings
    }, null, 2));
  }

  generateReport() {
    const total = this.extractedListings.size;
    console.log('\n🎉 ENHANCED EXTRACTION COMPLETE!');
    console.log('================================');
    console.log(`🏆 Total collected: ${total} listings`);
    console.log('📊 Improvements achieved:');
    console.log('   ✅ Combined Angular + price-based extraction');
    console.log('   ✅ Comprehensive selector fallbacks');
    console.log('   ✅ Progress saving every 20 pages');
    console.log('   ✅ Enhanced quality metrics');
    console.log('🔗 View results: http://localhost:3000/admin/scraping');
    
    return { success: true, total };
  }
}

// Auto-execute
new EnhancedWorkingExtractor().executeExtraction().catch(console.error);