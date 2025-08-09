// scripts/ultimate-working-extractor.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class UltimateWorkingExtractor {
  constructor() {
    this.extractedListings = new Map();
    this.workingSelectors = this.getUltimateSelectors();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  getUltimateSelectors() {
    // Based on common Flippa patterns and inspection results
    return {
      // Multiple container strategies
      containers: [
        'div[class*="listing"]',
        'div[class*="card"]',
        'div[class*="item"]', 
        'div[class*="result"]',
        'article',
        'li[class*="list"]',
        'div[data-testid]',
        'div', // Ultimate fallback
      ],
      
      // Price patterns
      priceSelectors: [
        '*:contains("$")',
        '.price',
        '[class*="price"]',
        '[class*="amount"]',
        'span',
        'div',
        'strong'
      ],
      
      // Title patterns  
      titleSelectors: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a[href]',
        '.title',
        '[class*="title"]',
        '[class*="name"]',
        'strong',
        'b'
      ],
      
      // Link patterns
      linkSelectors: [
        'a[href*="flippa"]',
        'a[href*="listing"]', 
        'a[href*="/"]',
        'a[href]'
      ]
    };
  }

  async executeUltimateExtraction() {
    console.log('🚀 ULTIMATE WORKING EXTRACTOR');
    console.log('🎯 Using all possible strategies to find listings');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    let page = 1;
    let consecutiveEmptyPages = 0;
    const maxPages = 200;
    
    while (consecutiveEmptyPages < 5 && page <= maxPages) {
      try {
        console.log(`\n📄 Processing page ${page}...`);
        
        const browserPage = await browser.newPage();
        await browserPage.goto(`https://flippa.com/search?filter[property_type][]=website&page=${page}`, {
          waitUntil: 'networkidle0',
          timeout: 45000
        });
        
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const listings = await browserPage.evaluate((selectors) => {
          console.log('🔍 Starting ultimate extraction...');
          
          // STRATEGY 1: Find elements with dollar signs (most reliable)
          const priceElements = [];
          document.querySelectorAll('*').forEach(el => {
            const text = el.textContent || '';
            if (/\$[\d,]+/.test(text) && text.length < 500 && text.length > 10) {
              priceElements.push(el);
            }
          });
          
          console.log(`Found ${priceElements.length} elements with prices`);
          
          if (priceElements.length === 0) {
            console.log('No price elements found, trying different approach...');
            return [];
          }
          
          // Build listing containers from price elements
          const listingContainers = [];
          
          priceElements.forEach(priceEl => {
            // Find the best container for this price element
            let bestContainer = priceEl;
            let currentEl = priceEl;
            
            // Go up the DOM tree to find a good container
            for (let i = 0; i < 8; i++) {
              if (currentEl.parentElement) {
                currentEl = currentEl.parentElement;
                
                const containerText = currentEl.textContent || '';
                const hasMultipleInfo = containerText.length > 100;
                const hasReasonableLength = containerText.length < 2000;
                const hasLinks = currentEl.querySelectorAll('a[href]').length > 0;
                
                if (hasMultipleInfo && hasReasonableLength && hasLinks) {
                  bestContainer = currentEl;
                }
              }
            }
            
            // Avoid duplicates
            if (!listingContainers.some(container => container === bestContainer)) {
              listingContainers.push(bestContainer);
            }
          });
          
          console.log(`Built ${listingContainers.length} listing containers from price elements`);
          
          // Extract data from each container
          return listingContainers.slice(0, 25).map((container, index) => {
            const listing = {
              id: `ultimate_${Date.now()}_${index}`,
              extractionMethod: 'ultimate-price-based',
              confidence: 0
            };
            
            const fullText = container.textContent || '';
            const containerHTML = container.innerHTML || '';
            
            // EXTRACT PRICE
            const pricePatterns = [
              /\$([0-9,]+)(?:\s|$|\.)/,
              /USD\s*\$?([0-9,]+)/,
              /Price:?\s*\$?([0-9,]+)/i,
              /Asking:?\s*\$?([0-9,]+)/i
            ];
            
            for (const pattern of pricePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                const price = parseInt(match[1].replace(/,/g, ''));
                if (price > 0 && price < 50000000) { // Reasonable range
                  listing.price = price;
                  listing.confidence += 30;
                  break;
                }
              }
            }
            
            // EXTRACT TITLE - Find meaningful text
            const titleCandidates = [];
            
            // Try different approaches for title
            const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(h => {
              const text = h.textContent?.trim();
              if (text && text.length > 10 && text.length < 200) {
                titleCandidates.push(text);
              }
            });
            
            // Try links as titles
            const links = container.querySelectorAll('a[href]');
            links.forEach(link => {
              const text = link.textContent?.trim();
              if (text && text.length > 15 && text.length < 200 && !text.includes('$')) {
                titleCandidates.push(text);
              }
            });
            
            // Try strong/bold text
            const strongElements = container.querySelectorAll('strong, b');
            strongElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 15 && text.length < 200 && !text.includes('$')) {
                titleCandidates.push(text);
              }
            });
            
            // Pick the best title candidate
            if (titleCandidates.length > 0) {
              // Prefer longer, more descriptive titles
              listing.title = titleCandidates.sort((a, b) => b.length - a.length)[0];
              listing.confidence += 25;
            }
            
            // EXTRACT REVENUE
            const revenuePatterns = [
              /revenue[:\s]*\$?([0-9,]+)/i,
              /profit[:\s]*\$?([0-9,]+)/i,
              /monthly[:\s]*\$?([0-9,]+)/i,
              /\$([0-9,]+)\s*\/\s*mo/i,
              /\$([0-9,]+)\s*per\s*month/i,
              /net[:\s]*\$?([0-9,]+)/i
            ];
            
            for (const pattern of revenuePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                const revenue = parseInt(match[1].replace(/,/g, ''));
                if (revenue > 0 && revenue < 1000000) { // Reasonable range
                  listing.monthlyRevenue = revenue;
                  listing.confidence += 25;
                  break;
                }
              }
            }
            
            // EXTRACT URL
            const allLinks = container.querySelectorAll('a[href]');
            for (const link of allLinks) {
              if (link.href && (
                link.href.includes('flippa.com') || 
                /\/\d+/.test(link.href) ||
                link.href.includes('listing')
              )) {
                listing.url = link.href;
                
                // Extract ID from URL
                const idMatch = link.href.match(/\/(\d+)/);
                if (idMatch) {
                  listing.id = idMatch[1];
                }
                
                listing.confidence += 20;
                break;
              }
            }
            
            // CALCULATE MULTIPLE
            if (listing.price && listing.monthlyRevenue && listing.monthlyRevenue > 0) {
              listing.multiple = parseFloat((listing.price / (listing.monthlyRevenue * 12)).toFixed(1));
              if (listing.multiple > 0 && listing.multiple < 100) {
                listing.confidence += 15;
              }
            }
            
            // Only return high-confidence listings
            return listing.confidence >= 40 ? listing : null;
          }).filter(Boolean);
          
        }, this.workingSelectors);
        
        if (listings.length === 0) {
          consecutiveEmptyPages++;
          console.log(`⚠️ Page ${page}: No listings found (${consecutiveEmptyPages}/5)`);
        } else {
          consecutiveEmptyPages = 0;
          
          listings.forEach(listing => {
            const key = listing.id || listing.url || `${page}_${Math.random()}`;
            this.extractedListings.set(key, listing);
          });
          
          console.log(`✅ Page ${page}: +${listings.length} listings (Total: ${this.extractedListings.size})`);
          
          // Show sample quality
          if (listings[0]) {
            console.log('   Sample quality:', {
              title: listings[0].title ? '✓' : '✗',
              price: listings[0].price ? `✓ $${listings[0].price.toLocaleString()}` : '✗',
              url: listings[0].url ? '✓' : '✗',
              revenue: listings[0].monthlyRevenue ? `✓ $${listings[0].monthlyRevenue}/mo` : '✗',
              multiple: listings[0].multiple ? `✓ ${listings[0].multiple}x` : '✗'
            });
          }
        }
        
        await browserPage.close();
        page++;
        
        // Save progress periodically
        if (page % 20 === 0) {
          await this.saveProgress();
        }
        
        // Shorter delay for faster processing
        await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 2000));
        
      } catch (error) {
        console.error(`❌ Page ${page} failed:`, error.message);
        page++;
        consecutiveEmptyPages++;
      }
    }
    
    await browser.close();
    await this.saveResults();
    return this.generateReport();
  }

  async saveProgress() {
    const listings = Array.from(this.extractedListings.values());
    console.log(`💾 Progress checkpoint: ${listings.length} listings`);
    
    fs.writeFileSync(`ultimate-progress-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      count: listings.length,
      sample: listings.slice(-5)
    }, null, 2));
  }

  async saveResults() {
    const listings = Array.from(this.extractedListings.values());
    
    console.log('\n📊 ULTIMATE EXTRACTOR RESULTS:');
    console.log('==============================');
    
    const quality = {
      total: listings.length,
      withTitle: listings.filter(l => l.title && l.title.length > 5).length,
      withPrice: listings.filter(l => l.price && l.price > 0).length,
      withRevenue: listings.filter(l => l.monthlyRevenue && l.monthlyRevenue > 0).length,
      withURL: listings.filter(l => l.url && l.url.includes('flippa')).length,
      withMultiple: listings.filter(l => l.multiple && l.multiple > 0).length
    };
    
    const rates = {
      title: quality.total > 0 ? (quality.withTitle / quality.total * 100).toFixed(1) : '0.0',
      price: quality.total > 0 ? (quality.withPrice / quality.total * 100).toFixed(1) : '0.0',
      revenue: quality.total > 0 ? (quality.withRevenue / quality.total * 100).toFixed(1) : '0.0',
      url: quality.total > 0 ? (quality.withURL / quality.total * 100).toFixed(1) : '0.0',
      multiple: quality.total > 0 ? (quality.withMultiple / quality.total * 100).toFixed(1) : '0.0'
    };
    
    console.log(`📋 Total: ${quality.total} listings`);
    console.log(`📝 Title: ${rates.title}% (Previous: 8.7%)`);
    console.log(`💰 Price: ${rates.price}% (Previous: 100%)`);
    console.log(`🔗 URL: ${rates.url}% (Previous: 0%)`);
    console.log(`📈 Revenue: ${rates.revenue}% (Previous: 12.6%)`);
    console.log(`📊 Multiple: ${rates.multiple}% (Previous: 6.4%)`);
    
    if (quality.total === 0) {
      console.log('\n❌ NO LISTINGS EXTRACTED - FLIPPA STRUCTURE HAS CHANGED');
      console.log('🔍 Try running final-flippa-inspector.js for manual inspection');
      return;
    }
    
    // Save to database
    try {
      // Clear old data
      await this.supabase.from('flippa_listings').delete().neq('listing_id', '');
      
      // Prepare database entries
      const dbListings = listings.map((listing, index) => ({
        listing_id: listing.id || `ultimate_${index}`,
        title: listing.title || '',
        price: listing.price || null,
        monthly_profit: listing.monthlyRevenue || null,
        monthly_revenue: listing.monthlyRevenue || null,
        multiple: listing.multiple || null,
        url: listing.url || '',
        raw_data: {
          source: 'ultimate_working_extractor',
          extractionMethod: listing.extractionMethod,
          confidence: listing.confidence,
          extractedAt: new Date().toISOString(),
          ...listing
        }
      }));
      
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
      
      console.log(`\n🎉 Successfully saved ${saved} listings!`);
    } catch (error) {
      console.error('Database error:', error);
    }
    
    // Save backup
    fs.writeFileSync(`ultimate-extractor-backup-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      quality,
      rates,
      listings
    }, null, 2));
  }

  generateReport() {
    const total = this.extractedListings.size;
    console.log('\n🏆 ULTIMATE EXTRACTION COMPLETE!');
    console.log('================================');
    console.log(`📊 Total: ${total} listings extracted`);
    console.log('🔗 View: http://localhost:3000/admin/scraping');
    
    return { success: total > 500, total };
  }
}

// Execute
new UltimateWorkingExtractor().executeUltimateExtraction().catch(console.error);