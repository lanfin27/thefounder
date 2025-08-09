// scripts/anti-rate-limit-scraper.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class AntiRateLimitScraper {
  constructor() {
    this.extractedListings = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
    this.currentUserAgentIndex = 0;
    this.failedAttempts = 0;
    this.successfulPages = 0;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  getRandomUserAgent() {
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return this.userAgents[this.currentUserAgentIndex];
  }

  calculateDelay(attempt = 0) {
    // Progressive backoff: start with 30 seconds, increase on failures
    const baseDelay = 30000; // 30 seconds base
    const backoffMultiplier = Math.min(this.failedAttempts, 5); // Max 5x backoff
    const randomJitter = Math.random() * 10000; // 0-10 seconds random
    
    return baseDelay + (backoffMultiplier * 15000) + randomJitter;
  }

  async createStealthBrowser() {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', 
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });
    
    return browser;
  }

  async executeAntiRateLimitExtraction() {
    console.log('🛡️ ANTI-RATE-LIMIT SCRAPER STARTING');
    console.log('🎯 Strategy: Stealth mode with progressive delays');
    console.log('📊 Existing database has 475 listings - will append new ones\n');
    
    const browser = await this.createStealthBrowser();
    let page = 1;
    let consecutiveFailures = 0;
    const maxPages = 100;
    const maxConsecutiveFailures = 5;

    while (consecutiveFailures < maxConsecutiveFailures && page <= maxPages) {
      const delay = this.calculateDelay();
      console.log(`\n⏳ Waiting ${(delay/1000).toFixed(1)}s before page ${page}...`);
      
      if (page > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      let pageSuccess = false;
      let retryAttempt = 0;
      const maxRetries = 3;

      while (!pageSuccess && retryAttempt < maxRetries) {
        try {
          console.log(`🔍 Processing page ${page} (attempt ${retryAttempt + 1}/${maxRetries})...`);
          
          const browserPage = await browser.newPage();
          
          // Set random user agent
          await browserPage.setUserAgent(this.getRandomUserAgent());
          
          // Set viewport to mimic real browser
          await browserPage.setViewport({
            width: 1366 + Math.floor(Math.random() * 200),
            height: 768 + Math.floor(Math.random() * 200)
          });

          // Set additional headers to look more human
          await browserPage.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          });

          // Navigate with timeout
          const response = await browserPage.goto(
            `https://flippa.com/search?filter[property_type][]=website&page=${page}`, 
            {
              waitUntil: 'networkidle2',
              timeout: 60000
            }
          );

          // Check for rate limiting
          if (response.status() === 429) {
            console.log(`❌ Page ${page}: HTTP 429 - Rate limited (attempt ${retryAttempt + 1})`);
            await browserPage.close();
            
            this.failedAttempts++;
            retryAttempt++;
            
            // Exponential backoff for retries
            const retryDelay = 60000 * Math.pow(2, retryAttempt); // 1min, 2min, 4min
            console.log(`⏳ Rate limited - waiting ${(retryDelay/1000/60).toFixed(1)} minutes...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            continue;
          }

          if (!response.ok()) {
            throw new Error(`HTTP ${response.status()}`);
          }

          // Add random human-like delay
          await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));

          // Extract listings using our proven method
          const listings = await browserPage.evaluate(() => {
            // Find elements with dollar signs (most reliable approach)
            const priceElements = [];
            document.querySelectorAll('*').forEach(el => {
              const text = el.textContent || '';
              if (/\$[\d,]+/.test(text) && text.length < 500 && text.length > 10) {
                priceElements.push(el);
              }
            });

            if (priceElements.length === 0) return [];

            // Build containers from price elements  
            const containers = [];
            priceElements.forEach(priceEl => {
              let container = priceEl;
              for (let i = 0; i < 6; i++) {
                if (container.parentElement) {
                  container = container.parentElement;
                  const containerText = container.textContent || '';
                  if (containerText.length > 100 && containerText.length < 2000) {
                    break;
                  }
                }
              }
              if (!containers.includes(container)) {
                containers.push(container);
              }
            });

            return containers.slice(0, 25).map((container, index) => {
              const listing = {
                id: `stealth_${Date.now()}_${index}`,
                confidence: 0
              };

              const fullText = container.textContent || '';

              // Extract price
              const priceMatch = fullText.match(/\$([0-9,]+)/);
              if (priceMatch) {
                const price = parseInt(priceMatch[1].replace(/,/g, ''));
                if (price > 0 && price < 10000000) {
                  listing.price = price;
                  listing.confidence += 30;
                }
              }

              // Extract title
              const titleCandidates = [];
              container.querySelectorAll('h1, h2, h3, h4, a[href], strong').forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length > 15 && text.length < 200 && !text.includes('$')) {
                  titleCandidates.push(text);
                }
              });

              if (titleCandidates.length > 0) {
                listing.title = titleCandidates.sort((a, b) => b.length - a.length)[0];
                listing.confidence += 30;
              }

              // Extract revenue
              const revenuePatterns = [
                /revenue[:\s]*\$?([0-9,]+)/i,
                /profit[:\s]*\$?([0-9,]+)/i,
                /\$([0-9,]+)\s*\/\s*mo/i
              ];

              for (const pattern of revenuePatterns) {
                const match = fullText.match(pattern);
                if (match) {
                  const revenue = parseInt(match[1].replace(/,/g, ''));
                  if (revenue > 0 && revenue < 500000) {
                    listing.monthlyRevenue = revenue;
                    listing.confidence += 25;
                    break;
                  }
                }
              }

              // Extract URL
              const links = container.querySelectorAll('a[href]');
              for (const link of links) {
                if (link.href && link.href.includes('flippa.com')) {
                  listing.url = link.href;
                  const idMatch = link.href.match(/\/(\d+)/);
                  if (idMatch) {
                    listing.id = idMatch[1];
                  }
                  listing.confidence += 15;
                  break;
                }
              }

              return listing.confidence >= 45 ? listing : null;
            }).filter(Boolean);
          });

          await browserPage.close();

          if (listings.length > 0) {
            pageSuccess = true;
            consecutiveFailures = 0;
            this.failedAttempts = Math.max(0, this.failedAttempts - 1); // Reduce failure count on success
            this.successfulPages++;

            listings.forEach(listing => {
              const key = listing.id || listing.url || `${page}_${Math.random()}`;
              this.extractedListings.set(key, listing);
            });

            console.log(`✅ Page ${page}: +${listings.length} listings (Total: ${this.extractedListings.size})`);
            console.log(`📊 Success rate: ${((this.successfulPages / page) * 100).toFixed(1)}%`);
          } else {
            console.log(`⚠️ Page ${page}: No listings found (attempt ${retryAttempt + 1})`);
            retryAttempt++;
          }

        } catch (error) {
          console.error(`❌ Page ${page} attempt ${retryAttempt + 1} failed:`, error.message);
          retryAttempt++;
          this.failedAttempts++;
          
          // Progressive delay on errors
          if (retryAttempt < maxRetries) {
            const errorDelay = 30000 * retryAttempt;
            console.log(`⏳ Error delay: ${errorDelay/1000}s`);
            await new Promise(resolve => setTimeout(resolve, errorDelay));
          }
        }
      }

      if (!pageSuccess) {
        consecutiveFailures++;
        console.log(`❌ Page ${page} failed completely (${consecutiveFailures}/${maxConsecutiveFailures})`);
      }

      page++;
    }

    await browser.close();
    await this.saveResults();
    return this.generateReport();
  }

  async saveResults() {
    const listings = Array.from(this.extractedListings.values());
    
    console.log('\n🛡️ ANTI-RATE-LIMIT RESULTS:');
    console.log('============================');
    
    const quality = {
      total: listings.length,
      withTitle: listings.filter(l => l.title && l.title.length > 5).length,
      withPrice: listings.filter(l => l.price && l.price > 0).length,
      withRevenue: listings.filter(l => l.monthlyRevenue && l.monthlyRevenue > 0).length,
      withURL: listings.filter(l => l.url && l.url.includes('flippa')).length
    };

    const rates = {
      title: quality.total > 0 ? (quality.withTitle / quality.total * 100).toFixed(1) : '0.0',
      price: quality.total > 0 ? (quality.withPrice / quality.total * 100).toFixed(1) : '0.0',
      revenue: quality.total > 0 ? (quality.withRevenue / quality.total * 100).toFixed(1) : '0.0',
      url: quality.total > 0 ? (quality.withURL / quality.total * 100).toFixed(1) : '0.0'
    };

    console.log(`📋 Total: ${quality.total} listings`);
    console.log(`📝 Title: ${rates.title}%`);
    console.log(`💰 Price: ${rates.price}%`);
    console.log(`🔗 URL: ${rates.url}%`);
    console.log(`📈 Revenue: ${rates.revenue}%`);
    console.log(`📊 Successful pages: ${this.successfulPages}`);
    console.log(`❌ Failed attempts: ${this.failedAttempts}`);

    if (quality.total === 0) {
      console.log('\n❌ NO NEW LISTINGS - RATE LIMITING TOO STRONG');
      console.log('💡 Recommendations:');
      console.log('   1. Try again in 2-4 hours when traffic is lower');
      console.log('   2. Use existing 475 listings in database');
      console.log('   3. Consider using proxy service');
      return;
    }

    // Append to existing database (don't clear)
    try {
      const dbListings = listings.map((listing, index) => ({
        listing_id: listing.id || `stealth_${Date.now()}_${index}`,
        title: listing.title || '',
        price: listing.price || null,
        monthly_profit: listing.monthlyRevenue || null,
        monthly_revenue: listing.monthlyRevenue || null,
        multiple: listing.price && listing.monthlyRevenue ? 
          parseFloat((listing.price / (listing.monthlyRevenue * 12)).toFixed(1)) : null,
        url: listing.url || '',
        raw_data: {
          source: 'anti_rate_limit_scraper',
          confidence: listing.confidence,
          timestamp: new Date().toISOString(),
          ...listing
        }
      }));

      // Save in small batches to avoid timeouts
      const batchSize = 50;
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

      console.log(`\n🎉 Added ${saved} new listings to existing database!`);
    } catch (error) {
      console.error('Database error:', error);
    }

    // Save backup
    fs.writeFileSync(`anti-rate-limit-backup-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      quality,
      rates,
      listings: listings.slice(0, 20) // Sample for review
    }, null, 2));
  }

  generateReport() {
    console.log('\n🛡️ ANTI-RATE-LIMIT SCRAPER COMPLETE!');
    console.log('=====================================');
    console.log(`📊 New listings: ${this.extractedListings.size}`);
    console.log(`✅ Successful pages: ${this.successfulPages}`);
    console.log(`❌ Failed attempts: ${this.failedAttempts}`);
    console.log('📋 Status: Working around Flippa rate limits');
    console.log('🔗 View: http://localhost:3000/admin/scraping');
    
    return { success: this.extractedListings.size > 0, total: this.extractedListings.size };
  }
}

// Execute
new AntiRateLimitScraper().executeAntiRateLimitExtraction().catch(console.error);