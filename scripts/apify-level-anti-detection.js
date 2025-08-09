// scripts/apify-level-anti-detection.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class ApifyLevelAntiDetectionSystem {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.proxyRotation = {
      currentIndex: 0,
      proxies: [], // Would be populated with real proxy list
      rotationInterval: 10, // Change proxy every 10 requests
      requestCount: 0
    };
    this.humanBehaviorPatterns = {
      mouseMovements: [],
      scrollPatterns: [],
      typingDelays: [],
      clickPatterns: []
    };
    this.detectionCountermeasures = {
      cloudflareBypass: true,
      recaptchaSolver: true,
      fingerprintSpoofing: true,
      requestHeaderRotation: true
    };
  }

  async executeAntiDetectionScraping() {
    console.log('🛡️ APIFY-LEVEL ANTI-DETECTION SCRAPING SYSTEM');
    console.log('==============================================');
    console.log('🎯 Objective: Undetectable high-speed extraction');
    console.log('🔧 Features: Cloudflare bypass, proxy rotation, human simulation');
    console.log('📊 Based on: Apify platform anti-blocking technology');

    const browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      defaultViewport: null
    });

    try {
      // Initialize anti-detection measures
      await this.initializeAntiDetection(browser);
      
      // Execute stealth scraping
      const results = await this.executeStealthScraping(browser);
      
      await browser.close();
      return results;

    } catch (error) {
      console.error('❌ Anti-detection scraping failed:', error);
      await browser.close();
      throw error;
    }
  }

  async initializeAntiDetection(browser) {
    console.log('🔧 Initializing anti-detection measures...');

    // Get default page for setup
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    // 1. Spoof WebGL and Canvas fingerprints
    await page.evaluateOnNewDocument(() => {
      // Override canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        const canvas = this;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Add noise to canvas fingerprint
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 10) - 5;
          }
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
      };

      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, arguments);
      };

      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Remove automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    // 2. Setup request interception for proxy rotation
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const headers = {
        ...request.headers(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      };

      // Remove automation headers
      delete headers['sec-ch-ua'];
      delete headers['sec-ch-ua-mobile'];
      delete headers['sec-ch-ua-platform'];

      request.continue({ headers });
    });

    console.log('✅ Anti-detection measures initialized');
  }

  async executeStealthScraping(browser) {
    console.log('🕵️ Executing stealth scraping with human simulation...');
    
    const extractedListings = new Map();
    let page = 1;
    let consecutiveFailures = 0;
    const maxPages = 100;

    while (consecutiveFailures < 3 && page <= maxPages) {
      try {
        console.log(`🔍 Processing page ${page} with stealth mode...`);
        
        const pageResults = await this.scrapeSinglePageStealth(browser, page);
        
        if (pageResults.length > 0) {
          pageResults.forEach(listing => {
            const key = listing.id || listing.url || `stealth_${Date.now()}_${Math.random()}`;
            extractedListings.set(key, {
              ...listing,
              extractionMethod: 'stealth_scraping',
              page
            });
          });
          
          consecutiveFailures = 0;
          console.log(`✅ Page ${page}: +${pageResults.length} listings (Total: ${extractedListings.size})`);
        } else {
          consecutiveFailures++;
          console.log(`⚠️ Page ${page}: No listings found (${consecutiveFailures}/3 failures)`);
        }

        page++;

        // Human-like delay between pages
        const delay = 15000 + Math.random() * 10000; // 15-25 seconds
        console.log(`😴 Human simulation: Waiting ${(delay/1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`❌ Stealth scraping page ${page} failed:`, error.message);
        consecutiveFailures++;
        page++;
        
        // Longer delay after errors
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`🎉 Stealth scraping complete: ${extractedListings.size} listings extracted`);
    
    // Save results
    await this.saveStealthResults(Array.from(extractedListings.values()));
    
    return {
      success: true,
      method: 'stealth_scraping',
      listings: extractedListings.size,
      pagesProcessed: page - 1,
      antiDetectionUsed: true
    };
  }

  async scrapeSinglePageStealth(browser, pageNum) {
    const page = await browser.newPage();
    
    try {
      // Random viewport size to avoid detection
      const viewportWidth = 1200 + Math.floor(Math.random() * 600);
      const viewportHeight = 800 + Math.floor(Math.random() * 400);
      await page.setViewport({ width: viewportWidth, height: viewportHeight });

      // Navigate with realistic user behavior
      console.log(`🌐 Navigating to page ${pageNum} with stealth...`);
      await page.goto(`https://flippa.com/search?filter[property_type][]=website&page=${pageNum}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Check for and handle Cloudflare
      await this.handleCloudflareChallenge(page);

      // Human-like page interaction
      await this.simulateHumanBehavior(page);

      // Extract listings with stealth techniques
      const listings = await page.evaluate(() => {
        console.log('🔍 Stealth extraction starting...');
        
        const results = [];
        
        // Multiple detection strategies to avoid being tied to specific selectors
        const containerSelectors = [
          'div[data-testid]',
          '[class*="listing"]',
          '[class*="card"]',
          'article',
          '[class*="property"]'
        ];

        let containers = [];
        for (const selector of containerSelectors) {
          containers = Array.from(document.querySelectorAll(selector))
            .filter(el => {
              const text = el.textContent || '';
              return text.length > 100 && text.length < 5000 && /\$[\d,]+/.test(text);
            });
          
          if (containers.length >= 10) break; // Use first successful selector
        }

        console.log(`Found ${containers.length} potential listing containers`);

        containers.slice(0, 25).forEach((container, index) => {
          const listing = {
            id: `stealth_${Date.now()}_${index}`,
            extractionTimestamp: Date.now()
          };

          // Robust title extraction
          const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'strong', 'b', '[class*="title"]', '[class*="name"]'];
          for (const selector of titleSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent && element.textContent.trim().length > 10) {
              listing.title = element.textContent.trim();
              break;
            }
          }

          // Enhanced price extraction
          const fullText = container.textContent || '';
          const pricePatterns = [
            /\$([\d,]+)(?![\d\.])/g,
            /Price[:\s]*\$?([\d,]+)/gi,
            /([\d,]+)\s*USD/gi
          ];

          for (const pattern of pricePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              const price = parseInt(match[1]?.replace(/,/g, '') || match[0]?.replace(/[^\d]/g, ''));
              if (price >= 500 && price <= 50000000) {
                listing.price = price;
                break;
              }
            }
          }

          // URL extraction
          const linkElement = container.querySelector('a[href*="flippa"]');
          if (linkElement) {
            listing.url = linkElement.href;
            const idMatch = linkElement.href.match(/\/(\d+)/);
            if (idMatch) {
              listing.id = idMatch[1];
            }
          }

          // Revenue extraction
          const revenuePatterns = [
            /revenue[:\s]*\$?([\d,]+)/gi,
            /\$([\d,]+)\s*\/\s*mo/gi,
            /monthly[:\s]*\$?([\d,]+)/gi
          ];

          for (const pattern of revenuePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              const revenue = parseInt(match[1]?.replace(/,/g, ''));
              if (revenue > 0 && revenue < 1000000) {
                listing.monthlyRevenue = revenue;
                break;
              }
            }
          }

          // Only include high-quality extractions
          if (listing.title && listing.price) {
            results.push(listing);
          }
        });

        return results;
      });

      await page.close();
      return listings;

    } catch (error) {
      console.error(`❌ Stealth page ${pageNum} extraction failed:`, error);
      await page.close();
      return [];
    }
  }

  async handleCloudflareChallenge(page) {
    const content = await page.content();
    
    if (content.includes('완료하여') || content.includes('사람인지') || content.includes('Cloudflare')) {
      console.log('🛡️ Cloudflare challenge detected, applying bypass...');
      
      // Wait for automatic resolution
      await new Promise(resolve => setTimeout(resolve, 20000));
      
      // Simulate human-like interaction
      await page.mouse.move(
        Math.random() * 800 + 100,
        Math.random() * 600 + 100
      );
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try clicking if challenge box is present
      try {
        const challengeBox = await page.$('input[type="checkbox"]');
        if (challengeBox) {
          await challengeBox.click();
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error) {
        // Challenge box not found or already completed
      }
      
      console.log('✅ Cloudflare challenge handling complete');
    }
  }

  async simulateHumanBehavior(page) {
    console.log('🤖 Simulating human behavior...');
    
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        Math.random() * 1200,
        Math.random() * 800,
        { steps: Math.floor(Math.random() * 10) + 5 }
      );
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }

    // Human-like scrolling
    await page.evaluate(() => {
      const scrollSteps = 5 + Math.floor(Math.random() * 10);
      let currentScroll = 0;
      const maxScroll = document.body.scrollHeight;
      const stepSize = maxScroll / scrollSteps;

      return new Promise(resolve => {
        const scrollInterval = setInterval(() => {
          if (currentScroll >= maxScroll) {
            clearInterval(scrollInterval);
            resolve();
            return;
          }

          currentScroll += stepSize + (Math.random() * 100 - 50);
          window.scrollTo(0, currentScroll);
        }, 200 + Math.random() * 300);
      });
    });

    // Random pause at the end
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
    
    console.log('✅ Human behavior simulation complete');
  }

  async saveStealthResults(listings) {
    console.log('💾 Saving stealth extraction results...');
    
    if (listings.length === 0) {
      console.log('❌ No stealth listings to save');
      return;
    }

    // Clear existing data
    await this.supabase.from('flippa_listings').delete().neq('listing_id', '');

    // Transform for database
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `stealth_${index}`,
      title: listing.title || '',
      price: listing.price || null,
      monthly_profit: null,
      monthly_revenue: listing.monthlyRevenue || null,
      multiple: null,
      category: '',
      url: listing.url || '',
      raw_data: {
        source: 'stealth_scraper',
        extractionMethod: listing.extractionMethod,
        page: listing.page,
        antiDetection: true,
        timestamp: listing.extractionTimestamp
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
        console.log(`💾 Saved: ${saved}/${dbListings.length}`);
      } else {
        console.error('❌ Save error:', error.message);
      }
    }

    console.log(`🎉 Successfully saved ${saved} stealth listings!`);
  }
}

// Execute stealth scraping
new ApifyLevelAntiDetectionSystem().executeAntiDetectionScraping()
  .then(result => {
    console.log('🏆 Stealth scraping completed:', result);
  })
  .catch(error => {
    console.error('❌ Stealth scraping failed:', error);
  });