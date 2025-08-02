// Flippa Scraper Engine V2 - Optimized based on live analysis
// Target: 95%+ success rate matching Apify standard

const { chromium } = require('playwright');
const winston = require('winston');
const _ = require('lodash');

class FlippaScraperEngineV2 {
  constructor(options = {}) {
    this.config = {
      maxRetries: 3,
      timeout: 120000,
      qualityThreshold: 40, // Lower to capture more listings
      targetSuccessRate: 95,
      concurrent: 5,
      ...options
    };
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/flippa-scraper-v2.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    this.metrics = {
      totalAttempts: 0,
      successfulExtractions: 0,
      qualityScores: [],
      processingTimes: []
    };
  }

  async scrapeWithOptimizedApproach(url, options = {}) {
    const startTime = Date.now();
    this.logger.info('Starting optimized Flippa scraping', { url, options });
    
    let browser;
    try {
      browser = await this.launchOptimizedBrowser();
      const page = await browser.newPage();
      
      await this.optimizePageForScraping(page);
      await this.navigateWithRetry(page, url);
      
      if (options.applyFilters) {
        await this.applyFilters(page, options);
      }
      
      // Extract with new optimized approach
      const listings = await this.extractListingsV2(page);
      
      // Validate and enhance
      const validatedListings = this.validateAndEnhance(listings);
      
      // Update metrics
      this.updateMetrics(validatedListings, Date.now() - startTime);
      
      this.logger.info('Scraping completed', {
        listingsExtracted: validatedListings.length,
        averageQuality: this.calculateAverageQuality(validatedListings),
        processingTime: Date.now() - startTime
      });
      
      return validatedListings;
      
    } catch (error) {
      this.logger.error('Scraping failed', { error: error.message, url });
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  async launchOptimizedBrowser() {
    return await chromium.launch({
      headless: this.config.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  }

  async optimizePageForScraping(page) {
    // Block unnecessary resources
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await page.setDefaultTimeout(this.config.timeout);
    await page.setDefaultNavigationTimeout(this.config.timeout);
    
    // Add stealth measures
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }

  async navigateWithRetry(page, url, attempt = 1) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });
      
      // Wait for Angular to load
      try {
        await page.waitForFunction(() => document.body.classList.contains('AngularPageReady--searchController'), {
          timeout: 30000
        });
      } catch (e) {
        this.logger.warn('Angular ready class not found, continuing...');
      }
      
      // Wait for listings to appear
      await page.waitForSelector('div[id^="listing-"]', {
        timeout: 30000
      });
      
      await page.waitForTimeout(2000); // Let page stabilize
      
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        this.logger.warn(`Navigation attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(Math.pow(2, attempt) * 1000);
        return this.navigateWithRetry(page, url, attempt + 1);
      }
      throw error;
    }
  }

  async applyFilters(page, options) {
    // Apply filters if needed
    if (options.filterRecentlySold) {
      try {
        const checkbox = page.locator('label:has-text("Recently Sold") input[type="checkbox"]').first();
        if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
          await checkbox.click();
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        this.logger.warn('Could not apply Recently Sold filter');
      }
    }
  }

  async extractListingsV2(page) {
    const currentTimestamp = new Date().toISOString();
    const source = 'flippa';
    
    const listings = await page.evaluate(({ timestamp, source }) => {
      const results = [];
      
      // Use the correct selector based on our analysis
      const listingElements = document.querySelectorAll('div[id^="listing-"]');
      
      console.log(`Found ${listingElements.length} listing elements`);
      
      listingElements.forEach((element, index) => {
        try {
          const listing = {
            _extractionIndex: index,
            _extractionTimestamp: timestamp,
            source: source
          };
          
          // Extract ID from element ID
          listing.id = element.id.replace('listing-', '');
          
          // Get main link
          const mainLink = element.querySelector('a[href^="/"]');
          if (mainLink) {
            listing.listing_url = `https://flippa.com${mainLink.getAttribute('href')}`;
          }
          
          // Extract title from description paragraph
          const descriptionP = element.querySelector('p.tw-text-gray-900');
          if (descriptionP) {
            const descText = descriptionP.textContent.trim();
            // Use first part of description as title (before comma or period)
            const titleMatch = descText.match(/^([^,.]+)/);
            listing.title = titleMatch ? titleMatch[1].trim() : descText.substring(0, 60);
          } else {
            listing.title = `Listing #${listing.id}`;
          }
          
          // Extract price - look for the asking price in multiple locations
          const priceSelectors = [
            'span.tw-text-xl',
            'span.tw-text-2xl', 
            'div.tw-text-xl',
            'span[class*="text-xl"]'
          ];
          
          for (const selector of priceSelectors) {
            const priceElement = element.querySelector(selector);
            if (priceElement) {
              const priceText = priceElement.textContent;
              const priceMatch = priceText.match(/\$?([\d,]+)/);
              if (priceMatch) {
                listing.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
          
          // If no price found, look in the full text for patterns like "USD $X"
          if (!listing.price) {
            const fullText = element.textContent;
            const usdMatch = fullText.match(/USD\s*\$?([\d,]+)(?!\s*p\/mo)/);
            if (usdMatch) {
              listing.price = parseFloat(usdMatch[1].replace(/,/g, ''));
            }
          }
          
          // Extract monthly profit/revenue - find divs containing "p/mo"
          const monthlyDivs = element.querySelectorAll('div.tw-text-gray-800');
          for (const div of monthlyDivs) {
            if (div.textContent.includes('p/mo')) {
              const monthlyMatch = div.textContent.match(/\$?([\d,]+)/);
              if (monthlyMatch) {
                const monthlyValue = parseFloat(monthlyMatch[1].replace(/,/g, ''));
                listing.profit_average = monthlyValue;
                listing.revenue_average = monthlyValue; // Often shows profit as main metric
                break;
              }
            }
          }
          
          // Extract category and property type
          const categoryDivs = element.querySelectorAll('div.tw-text-gray-800.tw-text-sm.tw-font-semibold');
          categoryDivs.forEach(div => {
            const text = div.textContent.trim();
            const prevSibling = div.previousElementSibling;
            
            if (prevSibling && prevSibling.textContent.includes('Industry')) {
              listing.category = text;
            } else if (text && ['Content', 'SaaS', 'Ecommerce', 'App', 'Service'].some(t => text.includes(t))) {
              listing.property_type = text;
            } else if (prevSibling && prevSibling.textContent.includes('Monetization')) {
              listing.monetization = text;
            }
          });
          
          // Extract multiple
          const multipleElements = element.querySelectorAll('span.ng-binding');
          multipleElements.forEach(span => {
            const text = span.textContent.trim();
            const profitMultipleMatch = text.match(/([\d.]+)x\s*Profit/i);
            const revenueMultipleMatch = text.match(/([\d.]+)x\s*Revenue/i);
            
            if (profitMultipleMatch) {
              listing.profit_multiple = parseFloat(profitMultipleMatch[1]);
              if (!listing.multiple) listing.multiple = listing.profit_multiple;
            }
            if (revenueMultipleMatch) {
              listing.revenue_multiple = parseFloat(revenueMultipleMatch[1]);
            }
          });
          
          // Extract location
          const locationSpan = element.querySelector('span.ng-binding');
          if (locationSpan && locationSpan.parentElement?.querySelector('.tw-items-center')) {
            const locationText = locationSpan.textContent.trim();
            if (locationText && !locationText.match(/\d+x|Multiple/)) {
              listing.country_name = locationText;
            }
          }
          
          // Extract verification badges
          listing.has_verified_traffic = element.textContent.includes('Verified Traffic');
          listing.has_verified_revenue = element.textContent.includes('Verified Revenue');
          listing.manually_vetted = element.textContent.includes('Verified Listing');
          listing.super_seller = element.textContent.includes('Super Seller');
          listing.broker_seller = element.textContent.includes('Broker');
          listing.managed_by_flippa = element.textContent.includes('Managed by Flippa');
          listing.sponsored = element.textContent.includes('Sponsored');
          listing.editors_choice = element.textContent.includes("Editor's Choice");
          
          // Extract site age
          const ageDiv = element.querySelector('div.tw-text-gray-800:has-text("years")');
          if (ageDiv) {
            const ageMatch = ageDiv.textContent.match(/(\d+)\s*years?/);
            if (ageMatch) {
              listing.established_years = parseInt(ageMatch[1]);
            }
          }
          
          // Calculate confidence score
          listing._extractionConfidence = calculateConfidence(listing);
          
          if (listing._extractionConfidence > 30) {
            results.push(listing);
          }
          
        } catch (error) {
          console.error(`Error extracting listing ${index}:`, error.message);
        }
      });
      
      function calculateConfidence(listing) {
        let score = 0;
        
        // Core fields (weighted)
        if (listing.id) score += 15;
        if (listing.title && listing.title !== `Listing #${listing.id}`) score += 20;
        if (listing.price > 0) score += 15;
        if (listing.listing_url) score += 10;
        
        // Business fields
        if (listing.category) score += 5;
        if (listing.property_type) score += 5;
        if (listing.monetization) score += 5;
        if (listing.country_name) score += 5;
        
        // Financial fields
        if (listing.revenue_average || listing.profit_average) score += 10;
        if (listing.multiple || listing.profit_multiple) score += 5;
        
        // Trust indicators
        if (listing.has_verified_traffic || listing.has_verified_revenue || listing.manually_vetted) score += 5;
        
        return score;
      }
      
      console.log(`✅ Successfully extracted ${results.length} listings`);
      return results;
      
    }, { timestamp: currentTimestamp, source });
    
    return listings;
  }

  validateAndEnhance(listings) {
    return listings.map(listing => {
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(listing);
      const isValid = qualityScore >= this.config.qualityThreshold;
      
      // Enhance data
      if (listing.price && listing.profit_average && listing.profit_average > 0) {
        listing._calculated_multiple = (listing.price / (listing.profit_average * 12)).toFixed(2);
      }
      
      // Add metadata
      listing.scraped_at = new Date().toISOString();
      listing.source = 'flippa';
      
      return {
        ...listing,
        _qualityScore: qualityScore,
        _isValid: isValid,
        _validationTimestamp: new Date().toISOString()
      };
    }).filter(listing => listing._isValid);
  }

  calculateQualityScore(listing) {
    let score = 0;
    
    // Core fields (40%)
    if (listing.id) score += 10;
    if (listing.title && listing.title.length > 10) score += 15;
    if (listing.price > 0) score += 10;
    if (listing.listing_url) score += 5;
    
    // Financial data (30%)
    if (listing.revenue_average > 0 || listing.profit_average > 0) score += 20;
    if (listing.multiple || listing.profit_multiple) score += 10;
    
    // Business classification (20%)
    if (listing.category) score += 10;
    if (listing.property_type) score += 5;
    if (listing.monetization) score += 5;
    
    // Trust indicators (10%)
    if (listing.manually_vetted || listing.has_verified_revenue) score += 5;
    if (listing.super_seller || listing.broker_seller) score += 5;
    
    return Math.min(score, 100);
  }

  calculateAverageQuality(listings) {
    if (!listings.length) return 0;
    return listings.reduce((sum, l) => sum + l._qualityScore, 0) / listings.length;
  }

  updateMetrics(listings, processingTime) {
    this.metrics.totalAttempts++;
    this.metrics.successfulExtractions += listings.length;
    this.metrics.qualityScores.push(...listings.map(l => l._qualityScore));
    this.metrics.processingTimes.push(processingTime);
  }

  getPerformanceReport() {
    const avgQuality = this.metrics.qualityScores.length > 0 ?
      this.metrics.qualityScores.reduce((a, b) => a + b, 0) / this.metrics.qualityScores.length : 0;
    
    const avgProcessingTime = this.metrics.processingTimes.length > 0 ?
      this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length : 0;
    
    // Expected 25 listings per page (based on analysis)
    const expectedListingsPerAttempt = 25;
    const expectedExtractions = this.metrics.totalAttempts * expectedListingsPerAttempt;
    const successRate = expectedExtractions > 0 ? 
      (this.metrics.successfulExtractions / expectedExtractions) * 100 : 0;
    
    return {
      successRate: successRate.toFixed(1) + '%',
      averageQuality: avgQuality.toFixed(1),
      averageProcessingTime: avgProcessingTime.toFixed(0) + 'ms',
      totalExtractions: this.metrics.successfulExtractions,
      extractionRate: this.metrics.totalAttempts > 0 ? 
        (this.metrics.successfulExtractions / this.metrics.totalAttempts).toFixed(1) : '0',
      meetsApifyStandard: successRate >= 95 && avgQuality >= 80
    };
  }
}

module.exports = FlippaScraperEngineV2;