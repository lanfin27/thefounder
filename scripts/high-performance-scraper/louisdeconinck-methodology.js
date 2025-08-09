// scripts/high-performance-scraper/louisdeconinck-methodology.js
// Implementation of louisdeconinck/flippa-scraper-api methodology

const puppeteer = require('puppeteer');
const axios = require('axios');
const { performance } = require('perf_hooks');

class LouisDeconinckMethodology {
  constructor(config = {}) {
    this.config = {
      maxResults: 5000,
      maxConcurrency: 10,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 5000,
      defaultPageSize: 30,
      maxPages: 200, // Flippa limitation
      ...config
    };
    
    // Session pool for maintaining state
    this.sessionPool = {
      sessions: new Map(),
      maxPoolSize: 1000,
      sessionOptions: {
        maxAgeSecs: 3600,
        maxUsageCount: 50
      }
    };
    
    // Proxy configuration
    this.proxyConfig = {
      useResidentialProxies: true,
      rotationInterval: 50, // requests per proxy
      proxyList: this.generateProxyList()
    };
    
    // Request queue for systematic processing
    this.requestQueue = [];
    this.processedUrls = new Set();
    
    // Performance tracking
    this.stats = {
      totalExtracted: 0,
      successRate: 0,
      startTime: null,
      errors: []
    };
  }

  async execute(input = {}) {
    console.log('🚀 Starting LouisDeconinck Methodology Implementation');
    console.log('===================================================\n');
    
    this.stats.startTime = Date.now();
    
    const {
      keyword = '',
      sorting = 'newest',
      filter_by_url = null,
      max_results = this.config.maxResults
    } = input;
    
    try {
      // Step 1: Initialize browser with anti-detection measures
      const browser = await this.initializeBrowser();
      
      // Step 2: Create session pool
      await this.initializeSessionPool(browser);
      
      // Step 3: Build search URL
      const searchUrl = filter_by_url || this.buildSearchUrl(keyword, sorting);
      
      // Step 4: Execute systematic extraction
      const listings = await this.systematicExtraction(searchUrl, max_results);
      
      // Step 5: Generate report
      const report = this.generateReport(listings);
      
      await browser.close();
      
      return {
        success: true,
        listings,
        report
      };
      
    } catch (error) {
      console.error('❌ Execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async initializeBrowser() {
    console.log('🌐 Initializing browser with anti-detection...');
    
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--start-maximized'
    ];
    
    // Add proxy if available
    if (this.proxyConfig.useResidentialProxies) {
      const proxy = this.getNextProxy();
      if (proxy) {
        args.push(`--proxy-server=${proxy}`);
      }
    }
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args,
      defaultViewport: null,
      ignoreHTTPSErrors: true
    });
    
    return browser;
  }

  async initializeSessionPool(browser) {
    console.log('🔄 Creating session pool...');
    
    // Create multiple sessions for parallel processing
    for (let i = 0; i < Math.min(this.config.maxConcurrency, 10); i++) {
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      
      // Apply anti-detection measures
      await this.applyAntiDetection(page);
      
      // Store session
      this.sessionPool.sessions.set(`session_${i}`, {
        context,
        page,
        usageCount: 0,
        createdAt: Date.now()
      });
    }
    
    console.log(`✅ Created ${this.sessionPool.sessions.size} sessions`);
  }

  async applyAntiDetection(page) {
    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Mock chrome object
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {}
      };
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
      };
    });
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Enable request interception for efficiency
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  buildSearchUrl(keyword, sorting) {
    const baseUrl = 'https://flippa.com/search';
    const params = new URLSearchParams();
    
    // Add filters
    params.append('filter[property_type][]', 'website');
    params.append('filter[status]', 'open');
    
    // Add keyword if provided
    if (keyword) {
      params.append('q', keyword);
    }
    
    // Add sorting
    const sortMap = {
      'newest': '-created_at',
      'ending_soon': 'ends_at',
      'most_active': '-bid_count',
      'lowest_price': 'price',
      'highest_price': '-price'
    };
    
    if (sortMap[sorting]) {
      params.append('sort', sortMap[sorting]);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  async systematicExtraction(searchUrl, maxResults) {
    console.log(`\n📊 Starting systematic extraction (target: ${maxResults} listings)...`);
    console.log(`URL: ${searchUrl}\n`);
    
    const allListings = [];
    let currentPage = 1;
    let hasMore = true;
    
    // Strategy 1: API-based extraction (fastest)
    const apiListings = await this.extractViaAPI(maxResults);
    allListings.push(...apiListings);
    
    if (allListings.length >= maxResults) {
      return allListings.slice(0, maxResults);
    }
    
    // Strategy 2: Browser-based extraction (fallback)
    while (hasMore && allListings.length < maxResults && currentPage <= this.config.maxPages) {
      try {
        const session = this.getAvailableSession();
        if (!session) {
          console.log('⚠️ No available sessions, creating new one...');
          continue;
        }
        
        const pageUrl = `${searchUrl}&page=${currentPage}`;
        console.log(`📄 Processing page ${currentPage}...`);
        
        const listings = await this.extractPageListings(session.page, pageUrl);
        
        if (listings.length === 0) {
          hasMore = false;
        } else {
          allListings.push(...listings);
          console.log(`✅ Extracted ${listings.length} listings (Total: ${allListings.length})`);
        }
        
        currentPage++;
        session.usageCount++;
        
        // Rate limiting
        await this.smartDelay();
        
      } catch (error) {
        console.error(`❌ Error on page ${currentPage}:`, error.message);
        this.stats.errors.push({ page: currentPage, error: error.message });
        
        // Retry with different session
        if (this.stats.errors.length < 10) {
          await this.rotateSession();
        } else {
          break;
        }
      }
    }
    
    return allListings.slice(0, maxResults);
  }

  async extractViaAPI(maxResults) {
    console.log('🚀 Attempting API extraction...');
    
    const listings = [];
    let page = 1;
    const pageSize = 100; // Maximum allowed
    
    while (listings.length < maxResults && page <= this.config.maxPages) {
      try {
        const response = await axios.get('https://flippa.com/v3/listings', {
          params: {
            'filter[property_type][]': 'website',
            'filter[status]': 'open',
            'page[number]': page,
            'page[size]': pageSize,
            'sort': '-created_at'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 30000
        });
        
        if (response.data && response.data.data) {
          const pageListings = response.data.data;
          listings.push(...this.transformAPIListings(pageListings));
          
          console.log(`✅ API page ${page}: ${pageListings.length} listings`);
          
          if (pageListings.length < pageSize) {
            break; // No more pages
          }
          
          page++;
          await this.smartDelay(200); // Faster for API
        } else {
          break;
        }
        
      } catch (error) {
        console.log('❌ API extraction failed:', error.message);
        break;
      }
    }
    
    return listings;
  }

  async extractPageListings(page, url) {
    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for listings to load
    await page.waitForSelector('a[href*="/"][href*="-"]', {
      timeout: 10000
    }).catch(() => {});
    
    // Additional wait for dynamic content
    await page.waitForTimeout(2000);
    
    // Extract listings using jQuery-like selectors
    const listings = await page.evaluate(() => {
      const results = [];
      
      // Method 1: Find all listing links
      const listingLinks = document.querySelectorAll('a[href*="/"][href*="-"]');
      
      listingLinks.forEach(link => {
        if (link.href.includes('flippa.com/') && 
            !link.href.includes('/search') && 
            !link.href.includes('/login') &&
            link.href.match(/\/\d{7,}/)) {
          
          // Find parent container
          let container = link.closest('article') || link.closest('div[class*="card"]') || link.parentElement;
          
          // Extract data
          const listing = {
            id: link.href.match(/\/(\d{7,})/)?.[1],
            listing_url: link.href,
            title: link.textContent.trim() || container.querySelector('h3')?.textContent.trim(),
            thumbnail_url: container.querySelector('img')?.src
          };
          
          // Extract price
          const priceText = container.textContent.match(/\$[\d,]+/);
          if (priceText) {
            listing.price = parseInt(priceText[0].replace(/[$,]/g, ''));
          }
          
          // Extract other data points
          const dataTexts = container.textContent.split(/\s+/);
          dataTexts.forEach((text, index) => {
            if (text.includes('bid')) {
              listing.bid_count = parseInt(dataTexts[index - 1]) || 0;
            }
            if (text.includes('Revenue')) {
              listing.revenue_average = parseInt(dataTexts[index + 1]?.replace(/[$,]/g, '')) || 0;
            }
            if (text.includes('Profit')) {
              listing.profit_average = parseInt(dataTexts[index + 1]?.replace(/[$,]/g, '')) || 0;
            }
          });
          
          // Detect verified badges
          listing.has_verified_traffic = container.innerHTML.includes('verified') && container.innerHTML.includes('traffic');
          listing.has_verified_revenue = container.innerHTML.includes('verified') && container.innerHTML.includes('revenue');
          
          if (listing.id && !results.find(r => r.id === listing.id)) {
            results.push(listing);
          }
        }
      });
      
      return results;
    });
    
    return listings;
  }

  transformAPIListings(apiListings) {
    // Transform to match louisdeconinck output format
    return apiListings.map(listing => ({
      id: listing.id,
      listing_url: `https://flippa.com/${listing.id}`,
      title: listing.title || listing.property_name,
      price: listing.current_price || listing.buy_it_now_price || 0,
      bid_count: listing.bid_count || 0,
      sale_method: listing.sale_method || 'auction',
      status: listing.status,
      category: listing.industry || listing.property_type,
      monetization: listing.revenue_sources?.join(', ') || '',
      profit_average: listing.profit_per_month || listing.average_profit || 0,
      revenue_multiple: listing.revenue_multiple || 0,
      has_verified_traffic: listing.has_verified_traffic || false,
      has_verified_revenue: listing.has_verified_revenue || false,
      established_at: listing.established_at,
      country_name: listing.seller_location || '',
      primary_platform: listing.property_type,
      thumbnail_url: listing.thumbnail_url || ''
    }));
  }

  getAvailableSession() {
    // Get least used session
    let bestSession = null;
    let minUsage = Infinity;
    
    for (const [id, session] of this.sessionPool.sessions) {
      if (session.usageCount < minUsage && session.usageCount < this.sessionPool.sessionOptions.maxUsageCount) {
        bestSession = session;
        minUsage = session.usageCount;
      }
    }
    
    return bestSession;
  }

  async rotateSession() {
    console.log('🔄 Rotating session...');
    
    // Remove oldest session
    const oldestSession = Array.from(this.sessionPool.sessions.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    
    if (oldestSession) {
      await oldestSession[1].context.close();
      this.sessionPool.sessions.delete(oldestSession[0]);
    }
    
    // Create new session
    // Implementation would create new browser context
  }

  async smartDelay(baseDelay = 500) {
    // Implement human-like delays
    const randomFactor = 0.5 + Math.random(); // 0.5x to 1.5x
    const delay = baseDelay * randomFactor;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  generateProxyList() {
    // In real implementation, this would return actual proxy list
    return [
      'http://proxy1.residential.com:8080',
      'http://proxy2.residential.com:8080',
      'http://proxy3.residential.com:8080'
    ];
  }

  getNextProxy() {
    if (!this.proxyConfig.proxyList.length) return null;
    
    const proxyIndex = Math.floor(Math.random() * this.proxyConfig.proxyList.length);
    return this.proxyConfig.proxyList[proxyIndex];
  }

  generateReport(listings) {
    const duration = (Date.now() - this.stats.startTime) / 1000;
    const successRate = listings.length > 0 ? 
      ((listings.length / (listings.length + this.stats.errors.length)) * 100).toFixed(1) : 0;
    
    const report = {
      totalListings: listings.length,
      duration: `${duration.toFixed(2)}s`,
      listingsPerMinute: Math.round((listings.length / duration) * 60),
      successRate: `${successRate}%`,
      errors: this.stats.errors.length,
      avgDataCompleteness: this.calculateDataCompleteness(listings)
    };
    
    console.log('\n📊 EXTRACTION REPORT');
    console.log('===================');
    console.log(`Total Listings: ${report.totalListings}`);
    console.log(`Duration: ${report.duration}`);
    console.log(`Rate: ${report.listingsPerMinute} listings/minute`);
    console.log(`Success Rate: ${report.successRate}`);
    console.log(`Data Completeness: ${report.avgDataCompleteness}%`);
    
    return report;
  }

  calculateDataCompleteness(listings) {
    if (listings.length === 0) return 0;
    
    const requiredFields = [
      'id', 'listing_url', 'title', 'price', 'category',
      'has_verified_traffic', 'has_verified_revenue'
    ];
    
    let totalCompleteness = 0;
    
    listings.forEach(listing => {
      const filledFields = requiredFields.filter(field => 
        listing[field] !== undefined && listing[field] !== null && listing[field] !== ''
      ).length;
      
      totalCompleteness += (filledFields / requiredFields.length) * 100;
    });
    
    return (totalCompleteness / listings.length).toFixed(1);
  }
}

module.exports = LouisDeconinckMethodology;