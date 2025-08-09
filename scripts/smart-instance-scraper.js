// scripts/smart-instance-scraper.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class SmartInstanceScraper {
  constructor(configPath) {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.extractedListings = new Map();
    this.smartMetrics = {
      successRate: 1.0,
      averageDelay: (this.config.delayRange[0] + this.config.delayRange[1]) / 2,
      errorCount: 0,
      successCount: 0,
      adaptiveDelayMultiplier: 1.0,
      qualityScore: 1.0,
      lastOptimization: new Date()
    };
    
    this.userAgentProfiles = this.buildUserAgentProfiles();
    this.currentUserAgentIndex = 0;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  buildUserAgentProfiles() {
    const profiles = {
      chrome_windows: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      safari_mac: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
      ],
      firefox_linux: [
        'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:119.0) Gecko/20100101 Firefox/119.0',
        'Mozilla/5.0 (X11; Linux x86_64; rv:118.0) Gecko/20100101 Firefox/118.0'
      ],
      edge_windows: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
      ]
    };
    
    return profiles[this.config.userAgentProfile] || profiles.chrome_windows;
  }

  getSmartUserAgent() {
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgentProfiles.length;
    return this.userAgentProfiles[this.currentUserAgentIndex];
  }

  calculateSmartDelay() {
    const baseDelay = (this.config.delayRange[0] + this.config.delayRange[1]) / 2;
    
    // Adjust delay based on success rate
    let adaptiveMultiplier = 1.0;
    
    if (this.smartMetrics.successRate < 0.7) {
      adaptiveMultiplier = 2.0; // Double delay if success rate is low
    } else if (this.smartMetrics.successRate < 0.8) {
      adaptiveMultiplier = 1.5; // 50% more delay
    } else if (this.smartMetrics.successRate > 0.95) {
      adaptiveMultiplier = 0.8; // Slightly faster if very successful
    }
    
    // Adjust based on recent errors
    if (this.smartMetrics.errorCount > 3) {
      adaptiveMultiplier *= 1.5;
    }
    
    this.smartMetrics.adaptiveDelayMultiplier = adaptiveMultiplier;
    const finalDelay = baseDelay * adaptiveMultiplier;
    
    // Add random jitter (±20%)
    const jitter = finalDelay * 0.2 * (Math.random() - 0.5);
    
    return Math.max(15000, finalDelay + jitter); // Minimum 15 seconds
  }

  updateSmartMetrics(success, quality = 1.0) {
    if (success) {
      this.smartMetrics.successCount++;
      this.smartMetrics.errorCount = Math.max(0, this.smartMetrics.errorCount - 1);
    } else {
      this.smartMetrics.errorCount++;
    }
    
    const totalAttempts = this.smartMetrics.successCount + this.smartMetrics.errorCount;
    this.smartMetrics.successRate = this.smartMetrics.successCount / Math.max(1, totalAttempts);
    this.smartMetrics.qualityScore = (this.smartMetrics.qualityScore * 0.9) + (quality * 0.1);
    
    // Perform optimization every 10 attempts
    if (totalAttempts % 10 === 0) {
      this.optimizeParameters();
    }
  }

  optimizeParameters() {
    console.log(`🧠 [${this.config.id}] Smart optimization:`);
    console.log(`   Success Rate: ${(this.smartMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`   Quality Score: ${(this.smartMetrics.qualityScore * 100).toFixed(1)}%`);
    console.log(`   Delay Multiplier: ${this.smartMetrics.adaptiveDelayMultiplier.toFixed(2)}x`);
    
    this.smartMetrics.lastOptimization = new Date();
  }

  async executeSmartScraping() {
    console.log(`🤖 SMART INSTANCE SCRAPER: ${this.config.id}`);
    console.log(`🎯 Profile: ${this.config.userAgentProfile}`);
    console.log(`📄 Page Range: ${this.config.pageRange[0]}-${this.config.pageRange[1]}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps'
      ]
    });
    
    let page = this.config.pageRange[0];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 5;
    
    while (consecutiveFailures < maxConsecutiveFailures && page <= this.config.pageRange[1]) {
      const smartDelay = this.calculateSmartDelay();
      
      console.log(`[${this.config.id}] ⏳ Smart delay: ${(smartDelay/1000).toFixed(1)}s (Page ${page})`);
      
      if (page > this.config.pageRange[0]) {
        await new Promise(resolve => setTimeout(resolve, smartDelay));
      }
      
      let pageSuccess = false;
      let retryAttempt = 0;
      const maxRetries = 3;
      
      while (!pageSuccess && retryAttempt < maxRetries) {
        try {
          console.log(`[${this.config.id}] 🔍 Processing page ${page} (attempt ${retryAttempt + 1})`);
          
          const browserPage = await browser.newPage();
          
          // Smart browser settings
          await browserPage.setUserAgent(this.getSmartUserAgent());
          await browserPage.setViewport({
            width: 1366 + Math.floor(Math.random() * 300),
            height: 768 + Math.floor(Math.random() * 200)
          });
          
          await browserPage.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
          });
          
          const response = await browserPage.goto(
            `https://flippa.com/search?filter[property_type][]=website&page=${page}`,
            { waitUntil: 'networkidle2', timeout: 60000 }
          );
          
          if (response.status() === 429) {
            console.log(`[${this.config.id}] ❌ HTTP 429 - Adapting strategy`);
            await browserPage.close();
            this.updateSmartMetrics(false);
            retryAttempt++;
            
            // Exponential backoff for 429s
            const backoffDelay = 120000 * Math.pow(2, retryAttempt);
            console.log(`[${this.config.id}] ⏳ Backoff: ${(backoffDelay/1000/60).toFixed(1)} minutes`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          if (!response.ok()) {
            throw new Error(`HTTP ${response.status()}`);
          }
          
          // Human-like random delay
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 4000));
          
          // Smart extraction with quality scoring
          const extractionResult = await browserPage.evaluate(() => {
            const priceElements = [];
            document.querySelectorAll('*').forEach(el => {
              const text = el.textContent || '';
              if (/\$[\d,]+/.test(text) && text.length < 500 && text.length > 10) {
                priceElements.push(el);
              }
            });
            
            if (priceElements.length === 0) return { listings: [], quality: 0 };
            
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
            
            const listings = containers.slice(0, 25).map((container, index) => {
              const listing = {
                id: `smart_${Date.now()}_${index}`,
                confidence: 0,
                qualityMetrics: {}
              };
              
              const fullText = container.textContent || '';
              
              // Price extraction with quality scoring
              const priceMatch = fullText.match(/\$([0-9,]+)/);
              if (priceMatch) {
                const price = parseInt(priceMatch[1].replace(/,/g, ''));
                if (price > 0 && price < 10000000) {
                  listing.price = price;
                  listing.confidence += 30;
                  listing.qualityMetrics.hasPrice = true;
                }
              }
              
              // Enhanced title extraction
              const titleCandidates = [];
              container.querySelectorAll('h1, h2, h3, h4, a[href], strong').forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length > 15 && text.length < 200 && !text.includes('$') && !/^\d+$/.test(text)) {
                  titleCandidates.push({
                    text: text,
                    score: text.length + (el.tagName === 'H1' ? 50 : el.tagName === 'H2' ? 30 : 10)
                  });
                }
              });
              
              if (titleCandidates.length > 0) {
                const bestTitle = titleCandidates.sort((a, b) => b.score - a.score)[0];
                listing.title = bestTitle.text;
                listing.confidence += 30;
                listing.qualityMetrics.hasTitle = true;
                listing.qualityMetrics.titleLength = bestTitle.text.length;
              }
              
              // Enhanced revenue extraction
              const revenuePatterns = [
                /revenue[:\s]*\$?([0-9,]+)/i,
                /profit[:\s]*\$?([0-9,]+)/i,
                /\$([0-9,]+)\s*\/\s*mo/i,
                /monthly[:\s]*\$?([0-9,]+)/i,
                /net[:\s]*income[:\s]*\$?([0-9,]+)/i
              ];
              
              for (const pattern of revenuePatterns) {
                const match = fullText.match(pattern);
                if (match) {
                  const revenue = parseInt(match[1].replace(/,/g, ''));
                  if (revenue > 0 && revenue < 500000) {
                    listing.monthlyRevenue = revenue;
                    listing.confidence += 25;
                    listing.qualityMetrics.hasRevenue = true;
                    break;
                  }
                }
              }
              
              // Enhanced URL extraction
              const links = container.querySelectorAll('a[href]');
              for (const link of links) {
                if (link.href && (link.href.includes('flippa.com') || /\/\d+/.test(link.href))) {
                  listing.url = link.href;
                  const idMatch = link.href.match(/\/(\d+)/);
                  if (idMatch) {
                    listing.id = idMatch[1];
                  }
                  listing.confidence += 15;
                  listing.qualityMetrics.hasURL = true;
                  break;
                }
              }
              
              // Calculate quality score
              const qualityFactors = Object.values(listing.qualityMetrics).filter(Boolean).length;
              listing.qualityScore = qualityFactors / 4; // 4 possible quality factors
              
              return listing.confidence >= 45 ? listing : null;
            }).filter(Boolean);
            
            // Calculate overall page quality
            const avgQuality = listings.length > 0 ? 
              listings.reduce((sum, l) => sum + l.qualityScore, 0) / listings.length : 0;
            
            return { listings, quality: avgQuality };
          });
          
          await browserPage.close();
          
          if (extractionResult.listings.length > 0) {
            pageSuccess = true;
            consecutiveFailures = 0;
            this.updateSmartMetrics(true, extractionResult.quality);
            
            extractionResult.listings.forEach(listing => {
              const key = listing.id || listing.url || `${page}_${Math.random()}`;
              this.extractedListings.set(key, listing);
            });
            
            console.log(`[${this.config.id}] ✅ Page ${page}: +${extractionResult.listings.length} listings (Quality: ${(extractionResult.quality * 100).toFixed(0)}%)`);
          } else {
            console.log(`[${this.config.id}] ⚠️ Page ${page}: No listings found (attempt ${retryAttempt + 1})`);
            this.updateSmartMetrics(false);
            retryAttempt++;
          }
          
        } catch (error) {
          console.error(`[${this.config.id}] ❌ Page ${page} attempt ${retryAttempt + 1} failed:`, error.message);
          this.updateSmartMetrics(false);
          retryAttempt++;
          
          if (retryAttempt < maxRetries) {
            const errorDelay = 30000 * retryAttempt;
            await new Promise(resolve => setTimeout(resolve, errorDelay));
          }
        }
      }
      
      if (!pageSuccess) {
        consecutiveFailures++;
        console.log(`[${this.config.id}] ❌ Page ${page} failed completely (${consecutiveFailures}/${maxConsecutiveFailures})`);
      }
      
      page++;
    }
    
    await browser.close();
    await this.saveSmartResults();
    return this.generateSmartReport();
  }

  async saveSmartResults() {
    const listings = Array.from(this.extractedListings.values());
    
    if (listings.length === 0) {
      console.log(`[${this.config.id}] ⚠️ No listings to save`);
      return;
    }
    
    console.log(`[${this.config.id}] 💾 Saving ${listings.length} listings...`);
    
    try {
      const dbListings = listings.map((listing, index) => ({
        listing_id: listing.id || `${this.config.id}_${Date.now()}_${index}`,
        title: listing.title || '',
        price: listing.price || null,
        monthly_profit: listing.monthlyRevenue || null,
        monthly_revenue: listing.monthlyRevenue || null,
        multiple: listing.price && listing.monthlyRevenue ? 
          parseFloat((listing.price / (listing.monthlyRevenue * 12)).toFixed(1)) : null,
        url: listing.url || '',
        raw_data: {
          source: `smart_instance_${this.config.id}`,
          confidence: listing.confidence,
          qualityScore: listing.qualityScore,
          qualityMetrics: listing.qualityMetrics,
          instanceId: this.config.id,
          smartMetrics: this.smartMetrics,
          timestamp: new Date().toISOString(),
          ...listing
        }
      }));
      
      // Save in small batches
      const batchSize = 25;
      let saved = 0;
      
      for (let i = 0; i < dbListings.length; i += batchSize) {
        const batch = dbListings.slice(i, i + batchSize);
        const { error } = await this.supabase.from('flippa_listings').insert(batch);
        
        if (!error) {
          saved += batch.length;
          console.log(`[${this.config.id}] 💾 Saved: ${saved}/${dbListings.length}`);
        } else {
          console.error(`[${this.config.id}] ❌ Save error:`, error.message);
        }
      }
      
      console.log(`[${this.config.id}] 🎉 Successfully saved ${saved} listings!`);
    } catch (error) {
      console.error(`[${this.config.id}] Database error:`, error);
    }
  }

  generateSmartReport() {
    console.log(`\n🤖 [${this.config.id}] SMART SCRAPING COMPLETE!`);
    console.log('═'.repeat(50));
    console.log(`📊 Listings Found: ${this.extractedListings.size}`);
    console.log(`📈 Success Rate: ${(this.smartMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`🧠 Quality Score: ${(this.smartMetrics.qualityScore * 100).toFixed(1)}%`);
    console.log(`⏱️ Adaptive Delay: ${this.smartMetrics.adaptiveDelayMultiplier.toFixed(2)}x`);
    console.log(`❌ Error Count: ${this.smartMetrics.errorCount}`);
    console.log(`✅ Success Count: ${this.smartMetrics.successCount}`);
    
    return {
      success: this.extractedListings.size > 0,
      total: this.extractedListings.size,
      metrics: this.smartMetrics
    };
  }
}

// Execute smart instance scraper
const configPath = process.argv[2];
if (!configPath) {
  console.error('❌ Configuration path required');
  process.exit(1);
}

new SmartInstanceScraper(configPath).executeSmartScraping().catch(console.error);