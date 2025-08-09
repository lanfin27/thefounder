// scripts/screenshot-based-extractor.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class ScreenshotBasedExtractor {
  constructor() {
    this.extractedListings = new Map();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async executeExtraction() {
    console.log('🚀 SCREENSHOT-BASED FLIPPA EXTRACTOR');
    console.log('🎯 Using selectors based on actual visible structure');
    
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
        
        // Based on screenshot: card-based layout with specific structure
        const listings = await browserPage.evaluate(() => {
          const results = [];
          
          // Multiple strategies to find listing cards
          const cardSelectors = [
            'div[class*="ListingCard"]',
            'div[class*="listing-card"]',
            'div[class*="card"][class*="listing"]',
            'article[class*="listing"]',
            'div[data-listing-id]',
            'div[class*="result-item"]',
            'div[class*="search-result"]'
          ];
          
          let cards = [];
          for (const selector of cardSelectors) {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
              cards = found;
              console.log(`Found ${found.length} cards with selector: ${selector}`);
              break;
            }
          }
          
          // Fallback: find by structure pattern
          if (cards.length === 0) {
            const allDivs = document.querySelectorAll('div');
            const potentialCards = [];
            
            allDivs.forEach(div => {
              const text = div.textContent || '';
              const hasPrice = /\$[\d,]+/.test(text);
              const hasTitle = div.querySelector('h1, h2, h3, h4, a[href*="listings"]');
              const hasMultipleChildren = div.children.length >= 3;
              const reasonableSize = text.length > 50 && text.length < 2000;
              
              if (hasPrice && hasTitle && hasMultipleChildren && reasonableSize) {
                // Check if not already a child of another card
                const isNested = potentialCards.some(card => card.contains(div));
                if (!isNested) {
                  potentialCards.push(div);
                }
              }
            });
            
            cards = potentialCards;
            console.log(`Found ${cards.length} cards by structure analysis`);
          }
          
          // Extract data from each card
          Array.from(cards).slice(0, 30).forEach((card, index) => {
            const listing = {
              id: `page${window.location.search.match(/page=(\d+)/)?.[1] || '1'}_${index}`,
              extractionMethod: 'screenshot-based'
            };
            
            // Title extraction - multiple strategies
            const titleSelectors = [
              'h1', 'h2', 'h3', 'h4',
              'a[href*="/listings/"]',
              '[class*="title"]',
              '[class*="name"]',
              '[class*="heading"]'
            ];
            
            for (const selector of titleSelectors) {
              const titleEl = card.querySelector(selector);
              if (titleEl && titleEl.textContent) {
                listing.title = titleEl.textContent.trim();
                break;
              }
            }
            
            // URL extraction
            const linkEl = card.querySelector('a[href*="/listings/"], a[href*="flippa.com"]');
            if (linkEl) {
              listing.url = linkEl.href;
              const idMatch = linkEl.href.match(/listings\/(\d+)/);
              if (idMatch) {
                listing.id = idMatch[1];
              }
            }
            
            // Price extraction - look for main price
            const priceEls = card.querySelectorAll('*');
            let mainPrice = 0;
            
            priceEls.forEach(el => {
              const text = el.textContent || '';
              const priceMatch = text.match(/\$\s?([\d,]+)(?:\s|$)/);
              if (priceMatch) {
                const price = parseInt(priceMatch[1].replace(/,/g, ''));
                if (price > mainPrice && price < 10000000) {
                  mainPrice = price;
                }
              }
            });
            
            if (mainPrice > 0) {
              listing.price = mainPrice;
            }
            
            // Revenue extraction
            const revenuePatterns = [
              /revenue.*?\$\s?([\d,]+)/i,
              /profit.*?\$\s?([\d,]+)/i,
              /\$\s?([\d,]+)\s*\/\s*mo/i,
              /monthly.*?\$\s?([\d,]+)/i
            ];
            
            const cardText = card.textContent || '';
            for (const pattern of revenuePatterns) {
              const match = cardText.match(pattern);
              if (match) {
                listing.monthlyRevenue = parseInt(match[1].replace(/,/g, ''));
                break;
              }
            }
            
            // Multiple extraction
            const multipleMatch = cardText.match(/(\d+\.?\d*)x/i);
            if (multipleMatch) {
              listing.multiple = parseFloat(multipleMatch[1]);
            } else if (listing.price && listing.monthlyRevenue && listing.monthlyRevenue > 0) {
              listing.multiple = parseFloat((listing.price / (listing.monthlyRevenue * 12)).toFixed(1));
            }
            
            // Category extraction
            const categoryPatterns = [
              /Type:\s*([^$\n]+)/i,
              /Category:\s*([^$\n]+)/i
            ];
            
            for (const pattern of categoryPatterns) {
              const match = cardText.match(pattern);
              if (match) {
                listing.category = match[1].trim();
                break;
              }
            }
            
            // Only add if we have meaningful data
            if (listing.title || listing.url || listing.price) {
              results.push(listing);
            }
          });
          
          return results;
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
          
          // Show sample extraction
          if (listings[0]) {
            console.log('📊 Sample extraction:', {
              title: listings[0].title ? '✓' : '✗',
              price: listings[0].price ? '✓' : '✗',
              url: listings[0].url ? '✓' : '✗',
              revenue: listings[0].monthlyRevenue ? '✓' : '✗'
            });
          }
        }
        
        await browserPage.close();
        page++;
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
      } catch (error) {
        console.error(`❌ Page ${page} failed:`, error.message);
        page++;
        consecutiveEmptyPages++;
      }
    }
    
    await browser.close();
    
    // Save results
    await this.saveResults();
    
    return this.generateReport();
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
    
    console.log('\n📊 SCREENSHOT-BASED EXTRACTOR RESULTS:');
    console.log('=====================================');
    console.log(`📋 Total: ${quality.total} listings`);
    console.log(`📝 Title: ${rates.title}%`);
    console.log(`💰 Price: ${rates.price}%`);
    console.log(`🔗 URL: ${rates.url}%`);
    console.log(`📈 Revenue: ${rates.revenue}%`);
    console.log(`📊 Multiple: ${rates.multiple}%`);
    
    // Save to database
    try {
      const dbListings = listings.map((listing, index) => ({
        listing_id: listing.id || `screenshot_${index}`,
        title: listing.title || '',
        price: listing.price || null,
        monthly_profit: listing.monthlyRevenue || null,
        monthly_revenue: listing.monthlyRevenue || null,
        multiple: listing.multiple || null,
        url: listing.url || '',
        raw_data: {
          source: 'screenshot_based_extractor',
          extractionMethod: listing.extractionMethod,
          category: listing.category,
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
          console.log(`💾 Saved: ${saved}/${dbListings.length}`);
        } else {
          console.error('❌ Save error:', error.message);
        }
      }
      
      console.log(`🎉 Successfully saved ${saved} listings!`);
    } catch (error) {
      console.error('Database error:', error);
    }
    
    // Save backup
    fs.writeFileSync(`screenshot-extractor-backup-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      quality: quality,
      rates: rates,
      listings: listings.slice(0, 10) // Sample
    }, null, 2));
  }

  generateReport() {
    const total = this.extractedListings.size;
    console.log('\n🎉 SCREENSHOT-BASED EXTRACTION COMPLETE!');
    console.log('======================================');
    console.log(`🏆 Total collected: ${total} listings`);
    console.log('🔗 View results: http://localhost:3000/admin/scraping');
    
    return { success: total > 1000, total };
  }
}

// Auto-execute
new ScreenshotBasedExtractor().executeExtraction().catch(console.error);