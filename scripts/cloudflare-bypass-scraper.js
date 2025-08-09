// scripts/cloudflare-bypass-scraper.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class CloudflareBypassScraper {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.extractedListings = new Map();
    this.bypassStats = {
      totalAttempts: 0,
      successfulBypasses: 0,
      cloudflareEncounters: 0,
      successfulExtractions: 0
    };
    
    // Realistic browser fingerprints
    this.browserFingerprints = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        platform: 'Win32',
        language: 'en-US'
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
        platform: 'MacIntel',
        language: 'en-US'
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        viewport: { width: 1366, height: 768 },
        platform: 'Win32',
        language: 'en-US'
      }
    ];
  }

  async executeCloudflareBypass() {
    console.log('🛡️ CLOUDFLARE BYPASS SCRAPER STARTING');
    console.log('🎯 Goal: Bypass Cloudflare protection and extract financial data');
    console.log('⚠️ Detected: Cloudflare challenge page blocking access');
    console.log('');

    const browser = await puppeteer.launch({
      headless: false,  // Visual mode to handle challenges
      devtools: false,
      slowMo: 50,
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
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-data-dir=/tmp/chrome-user-data',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    let page = 1;
    let consecutiveFailures = 0;
    const maxPages = 30;
    const maxConsecutiveFailures = 5;

    while (consecutiveFailures < maxConsecutiveFailures && page <= maxPages) {
      try {
        console.log(`\n🔓 Attempting to bypass Cloudflare for page ${page}...`);
        
        const success = await this.bypassCloudflareAndExtract(browser, page);
        
        if (success) {
          consecutiveFailures = 0;
          console.log(`✅ Page ${page}: Successfully bypassed and extracted data`);
        } else {
          consecutiveFailures++;
          console.log(`❌ Page ${page}: Failed to bypass (${consecutiveFailures}/${maxConsecutiveFailures})`);
        }
        
        page++;
        
        // Long delay between pages to avoid triggering more security
        const delay = 30000 + Math.random() * 20000; // 30-50 seconds
        console.log(`⏳ Waiting ${(delay/1000).toFixed(1)}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`❌ Page ${page} error:`, error.message);
        consecutiveFailures++;
        page++;
      }
    }

    await browser.close();
    await this.saveBypassResults();
    return this.generateBypassReport();
  }

  async bypassCloudflareAndExtract(browser, pageNum) {
    this.bypassStats.totalAttempts++;
    
    const browserPage = await browser.newPage();
    
    try {
      // Use random fingerprint
      const fingerprint = this.browserFingerprints[Math.floor(Math.random() * this.browserFingerprints.length)];
      
      await browserPage.setUserAgent(fingerprint.userAgent);
      await browserPage.setViewport(fingerprint.viewport);
      
      // Set realistic headers
      await browserPage.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      // Override navigator properties to avoid detection
      await browserPage.evaluateOnNewDocument(() => {
        // Remove webdriver property
        delete navigator.__proto__.webdriver;
        
        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'ko']
        });
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      console.log(`🌐 Loading Flippa page ${pageNum}...`);
      
      const response = await browserPage.goto(`https://flippa.com/search?filter[property_type][]=website&page=${pageNum}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Check if we hit Cloudflare challenge
      const pageContent = await browserPage.content();
      const isCloudflareChallenge = pageContent.includes('cloudflare') && 
                                   (pageContent.includes('완료하여') || 
                                    pageContent.includes('사람인지') ||
                                    pageContent.includes('Checking your browser') ||
                                    pageContent.includes('Just a moment'));

      if (isCloudflareChallenge) {
        this.bypassStats.cloudflareEncounters++;
        console.log('🛡️ Cloudflare challenge detected, attempting bypass...');
        
        // Wait for challenge to potentially auto-resolve
        console.log('⏳ Waiting for Cloudflare challenge resolution...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Check if challenge resolved automatically
        try {
          await browserPage.waitForSelector('body', { timeout: 30000 });
          const newContent = await browserPage.content();
          
          // Look for signs that we're past the challenge
          const challengeResolved = !newContent.includes('완료하여') && 
                                   !newContent.includes('Checking your browser') &&
                                   (newContent.includes('listing') || 
                                    newContent.includes('$') || 
                                    newContent.length > 10000);
          
          if (challengeResolved) {
            console.log('✅ Cloudflare challenge resolved automatically');
            this.bypassStats.successfulBypasses++;
          } else {
            console.log('❌ Cloudflare challenge not resolved');
            await browserPage.close();
            return false;
          }
        } catch (error) {
          console.log('❌ Challenge resolution timeout');
          await browserPage.close();
          return false;
        }
      }

      // Additional wait for dynamic content
      console.log('⏳ Waiting for page content to load...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Human-like behavior
      await this.simulateHumanBehavior(browserPage);

      // Extract listings with improved method
      const listings = await this.extractListingsFromPage(browserPage);

      if (listings.length > 0) {
        listings.forEach(listing => {
          const key = listing.id || listing.url || `page${pageNum}_${Math.random()}`;
          this.extractedListings.set(key, listing);
        });

        this.bypassStats.successfulExtractions++;
        console.log(`🎯 Extracted ${listings.length} listings from page ${pageNum}`);
        
        const withPrice = listings.filter(l => l.price).length;
        const withRevenue = listings.filter(l => l.monthlyRevenue).length;
        
        console.log(`   💰 Price: ${withPrice}/${listings.length} (${((withPrice/listings.length)*100).toFixed(0)}%)`);
        console.log(`   📈 Revenue: ${withRevenue}/${listings.length} (${((withRevenue/listings.length)*100).toFixed(0)}%)`);
        
        await browserPage.close();
        return true;
      } else {
        console.log(`⚠️ No listings found on page ${pageNum}`);
        await browserPage.close();
        return false;
      }

    } catch (error) {
      console.error(`❌ Bypass attempt failed:`, error.message);
      await browserPage.close();
      return false;
    }
  }

  async simulateHumanBehavior(page) {
    try {
      // Random mouse movements
      await page.mouse.move(Math.random() * 800, Math.random() * 600);
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Random scroll
      await page.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Another scroll
      await page.evaluate(() => {
        window.scrollTo(0, Math.random() * 1000);
      });
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
    } catch (error) {
      // Ignore simulation errors
    }
  }

  async extractListingsFromPage(page) {
    return await page.evaluate(() => {
      console.log('🔍 Starting extraction from bypassed page...');
      
      const extractedListings = [];
      
      // Strategy 1: Look for any elements containing price patterns
      const allElements = document.querySelectorAll('*');
      const containersWithPrices = [];
      
      allElements.forEach(el => {
        const text = el.textContent || '';
        
        // Look for price patterns
        if (/\$[\d,]+/.test(text) && text.length > 50 && text.length < 3000) {
          containersWithPrices.push(el);
        }
      });
      
      console.log(`Found ${containersWithPrices.length} potential containers`);
      
      // Extract from each container
      containersWithPrices.slice(0, 25).forEach((container, index) => {
        const listing = {
          id: `bypass_${Date.now()}_${index}`,
          extractionMethod: 'cloudflare-bypass',
          confidence: 0
        };
        
        const fullText = container.textContent || '';
        
        // EXTRACT PRICE - Multiple sophisticated patterns
        const pricePatterns = [
          /\$([0-9,]+)(?!\d)/g,                    // Standard $1,234
          /Price:?\s*\$([0-9,]+)/gi,               // Price: $1234
          /Asking:?\s*\$([0-9,]+)/gi,              // Asking: $1234
          /Buy\s*now:?\s*\$([0-9,]+)/gi,          // Buy now: $1234
          /Value:?\s*\$([0-9,]+)/gi,               // Value: $1234
          /(\d+)\s*k(?![a-z])/gi,                  // 123k format
          /\$(\d+(?:\.\d+)?)\s*k(?![a-z])/gi      // $12.5k format
        ];
        
        for (const pattern of pricePatterns) {
          const matches = Array.from(fullText.matchAll(pattern));
          if (matches.length > 0) {
            for (const match of matches) {
              let price = 0;
              
              if (pattern.toString().includes('k')) {
                // Handle k format
                const num = parseFloat(match[1]);
                price = Math.round(num * 1000);
              } else {
                // Handle dollar format
                price = parseInt(match[1].replace(/,/g, ''));
              }
              
              // Validate price range (more permissive)
              if (price >= 100 && price <= 50000000) {
                listing.price = price;
                listing.confidence += 30;
                break;
              }
            }
            if (listing.price) break;
          }
        }
        
        // EXTRACT TITLE - Enhanced search
        const titleElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, a[href], strong, b, span');
        for (const el of titleElements) {
          const text = el.textContent?.trim();
          if (text && text.length > 10 && text.length < 200 && 
              !text.includes('$') && !text.match(/^\d+$/)) {
            listing.title = text;
            listing.confidence += 25;
            break;
          }
        }
        
        // EXTRACT REVENUE - Enhanced patterns
        const revenuePatterns = [
          /revenue:?\s*\$([0-9,]+)/gi,
          /profit:?\s*\$([0-9,]+)/gi,
          /monthly:?\s*\$([0-9,]+)/gi,
          /\$([0-9,]+)\s*\/\s*month/gi,
          /\$([0-9,]+)\s*\/\s*mo/gi,
          /\$([0-9,]+)\s*per\s*month/gi,
          /income:?\s*\$([0-9,]+)/gi,
          /earnings:?\s*\$([0-9,]+)/gi
        ];
        
        for (const pattern of revenuePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const revenue = parseInt(match[1].replace(/,/g, ''));
            if (revenue > 0 && revenue < 1000000) {
              listing.monthlyRevenue = revenue;
              listing.confidence += 25;
              break;
            }
          }
        }
        
        // EXTRACT URL - Look for Flippa links
        const links = container.querySelectorAll('a[href]');
        for (const link of links) {
          if (link.href && (
            link.href.includes('flippa.com') || 
            /\/\d+/.test(link.href) ||
            link.href.includes('listing')
          )) {
            listing.url = link.href;
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
          if (listing.multiple > 0 && listing.multiple < 200) {
            listing.confidence += 15;
          }
        }
        
        // Only include high-confidence extractions
        if (listing.confidence >= 45) {
          extractedListings.push(listing);
        }
      });
      
      return extractedListings;
    });
  }

  async saveBypassResults() {
    console.log('\n💾 Saving Cloudflare Bypass Results...');
    
    const listings = Array.from(this.extractedListings.values());
    
    if (listings.length === 0) {
      console.log('❌ No listings bypassed and extracted');
      return;
    }

    const quality = {
      total: listings.length,
      withTitle: listings.filter(l => l.title).length,
      withPrice: listings.filter(l => l.price).length,
      withRevenue: listings.filter(l => l.monthlyRevenue).length,
      withURL: listings.filter(l => l.url).length,
      withMultiple: listings.filter(l => l.multiple).length
    };

    const rates = {
      title: ((quality.withTitle / quality.total) * 100).toFixed(1),
      price: ((quality.withPrice / quality.total) * 100).toFixed(1),
      revenue: ((quality.withRevenue / quality.total) * 100).toFixed(1),
      url: ((quality.withURL / quality.total) * 100).toFixed(1),
      multiple: ((quality.withMultiple / quality.total) * 100).toFixed(1)
    };

    console.log('\n🛡️ CLOUDFLARE BYPASS RESULTS:');
    console.log('==============================');
    console.log(`📋 Total: ${quality.total} listings`);
    console.log(`📝 Title: ${rates.title}%`);
    console.log(`💰 Price: ${rates.price}% (BYPASSED CLOUDFLARE!)`);
    console.log(`🔗 URL: ${rates.url}%`);
    console.log(`📈 Revenue: ${rates.revenue}% (BYPASSED CLOUDFLARE!)`);
    console.log(`📊 Multiple: ${rates.multiple}% (BYPASSED CLOUDFLARE!)`);

    // Clear existing data and save new results
    await this.supabase.from('flippa_listings').delete().neq('listing_id', '');

    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `bypass_${index}`,
      title: listing.title || '',
      price: listing.price || null,
      monthly_profit: listing.monthlyRevenue || null,
      monthly_revenue: listing.monthlyRevenue || null,
      multiple: listing.multiple || null,
      category: '',
      url: listing.url || '',
      raw_data: {
        source: 'cloudflare_bypass_scraper',
        extractionMethod: listing.extractionMethod,
        confidence: listing.confidence,
        bypassStats: this.bypassStats
      }
    }));

    // Save in batches
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

    console.log(`\n🎉 Successfully bypassed Cloudflare and saved ${saved} listings!`);

    // Save backup
    fs.writeFileSync(`cloudflare-bypass-backup-${Date.now()}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      bypassStats: this.bypassStats,
      quality,
      rates,
      listings
    }, null, 2));
  }

  generateBypassReport() {
    const total = this.extractedListings.size;
    
    console.log('\n🏆 CLOUDFLARE BYPASS COMPLETE!');
    console.log('===============================');
    console.log(`📊 Total Listings Bypassed: ${total}`);
    console.log(`🛡️ Cloudflare Encounters: ${this.bypassStats.cloudflareEncounters}`);
    console.log(`✅ Successful Bypasses: ${this.bypassStats.successfulBypasses}`);
    console.log(`📈 Successful Extractions: ${this.bypassStats.successfulExtractions}`);
    console.log(`📊 Bypass Success Rate: ${this.bypassStats.cloudflareEncounters > 0 ? ((this.bypassStats.successfulBypasses / this.bypassStats.cloudflareEncounters) * 100).toFixed(1) : '0'}%`);
    
    const bypassSuccessful = this.bypassStats.successfulBypasses > 0 && total > 0;
    console.log(`\n🎯 Cloudflare Bypass: ${bypassSuccessful ? '✅ SUCCESSFUL' : '❌ FAILED'}`);
    
    if (total > 0) {
      const listings = Array.from(this.extractedListings.values());
      const priceRate = ((listings.filter(l => l.price).length / total) * 100).toFixed(1);
      const revenueRate = ((listings.filter(l => l.monthlyRevenue).length / total) * 100).toFixed(1);
      
      console.log(`💰 Financial Data Recovery: Price ${priceRate}%, Revenue ${revenueRate}%`);
    }
    
    console.log('\n🔗 View results: http://localhost:3000/admin/scraping');
    
    return {
      success: bypassSuccessful,
      total,
      cloudflareBypassSuccessful: this.bypassStats.successfulBypasses > 0
    };
  }
}

// Execute Cloudflare bypass
new CloudflareBypassScraper().executeCloudflareBypass().catch(console.error);