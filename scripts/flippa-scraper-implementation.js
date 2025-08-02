// FLIPPA SCRAPER IMPLEMENTATION FOR THEFOUNDER
// Based on comprehensive analysis of 5,635 real Flippa listings

const puppeteer = require('puppeteer');
const FlippaScrapingStrategy = require('./flippa-scraper-strategy');

class FlippaScraperPro {
  constructor(options = {}) {
    this.strategy = FlippaScrapingStrategy;
    this.options = {
      headless: true,
      maxConcurrent: 5,
      retryAttempts: 3,
      timeout: 30000,
      ...options
    };
    
    // Statistics tracking
    this.stats = {
      totalScraped: 0,
      successful: 0,
      failed: 0,
      verified: 0,
      categories: {},
      monetizations: {}
    };
  }

  async initialize() {
    console.log('🚀 Initializing Flippa Scraper Pro...');
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched successfully');
  }

  async scrapeListingsPage(url = 'https://flippa.com/search') {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      console.log(`📄 Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.options.timeout });
      
      // Wait for listings to load
      await page.waitForSelector('[id^="listing-"], .listing-card', { timeout: 10000 });
      
      // Extract all listings on the page
      const listings = await page.evaluate((strategyStr) => {
        const strategy = eval(`(${strategyStr})`);
        const results = [];
        
        // Find all listing elements
        const listingElements = document.querySelectorAll('[id^="listing-"], .listing-card, .search-result-item');
        console.log(`Found ${listingElements.length} listing elements`);
        
        listingElements.forEach((element, index) => {
          try {
            const listing = {};
            
            // Extract critical fields
            Object.entries(strategy.fieldMapping.critical).forEach(([field, config]) => {
              try {
                const value = extractField(element, config);
                if (value !== null && value !== undefined) {
                  listing[field] = value;
                }
              } catch (e) {
                console.warn(`Failed to extract ${field}:`, e.message);
              }
            });
            
            // Extract important fields
            Object.entries(strategy.fieldMapping.important).forEach(([field, config]) => {
              try {
                const value = extractField(element, config);
                if (value !== null && value !== undefined) {
                  listing[field] = value;
                }
              } catch (e) {
                // Important fields can fail silently
              }
            });
            
            // Extract verification fields
            Object.entries(strategy.fieldMapping.verification).forEach(([field, config]) => {
              try {
                const value = extractField(element, config);
                listing[field] = value || false;
              } catch (e) {
                listing[field] = false;
              }
            });
            
            // Extract key data items
            const keyDataElements = element.querySelectorAll('.key-data-item, .listing-detail, .property-detail');
            const keyData = [];
            keyDataElements.forEach(kd => {
              const label = kd.querySelector('.label, .detail-label, dt')?.textContent?.trim();
              const value = kd.querySelector('.value, .detail-value, dd')?.textContent?.trim();
              if (label && value) {
                keyData.push({ label, value });
                
                // Map to specific fields
                const fieldName = label.toLowerCase().replace(/\s+/g, '_');
                if (!listing[fieldName]) {
                  listing[fieldName] = value;
                }
              }
            });
            if (keyData.length > 0) {
              listing.key_data = keyData;
            }
            
            // Extract integrations
            const integrationElements = element.querySelectorAll('.integration-icon, .tech-icon, .platform-badge');
            const integrations = [];
            integrationElements.forEach(int => {
              const name = int.getAttribute('alt') || int.getAttribute('title') || int.textContent?.trim();
              if (name) integrations.push(name.toLowerCase());
            });
            if (integrations.length > 0) {
              listing.integrations = [...new Set(integrations)];
            }
            
            // Add listing URL if ID is found
            if (listing.id) {
              listing.listing_url = `https://flippa.com/${listing.id}`;
            }
            
            // Add extraction metadata
            listing._extracted_at = new Date().toISOString();
            listing._quality_score = calculateQualityScore(listing);
            
            results.push(listing);
          } catch (error) {
            console.error(`Error extracting listing ${index}:`, error);
          }
        });
        
        // Helper function to extract fields
        function extractField(element, config) {
          let value = null;
          
          if (config.selector) {
            const el = element.querySelector(config.selector);
            if (!el) return config.default || null;
            
            if (config.text) {
              value = el.textContent?.trim();
            } else if (config.attribute) {
              value = el.getAttribute(config.attribute);
            } else if (config.exists) {
              value = !!el;
            } else if (config.parse && typeof config.parse === 'function') {
              value = config.parse(el);
            } else {
              value = el.textContent?.trim();
            }
          }
          
          if (config.parse && typeof config.parse === 'function' && typeof value === 'string') {
            value = config.parse(value);
          }
          
          return value;
        }
        
        // Calculate quality score
        function calculateQualityScore(listing) {
          let score = 0;
          const requiredFields = ['id', 'title', 'price', 'category'];
          
          // Check required fields
          requiredFields.forEach(field => {
            if (listing[field]) score += 20;
          });
          
          // Verification bonuses
          if (listing.has_verified_traffic) score += 10;
          if (listing.has_verified_revenue) score += 10;
          if (listing.manually_vetted) score += 10;
          
          // Financial data bonus
          if (listing.revenue_average > 0) score += 5;
          if (listing.profit_average > 0) score += 5;
          
          return Math.min(score, 100);
        }
        
        return results;
      }, this.strategy.toString());
      
      // Update statistics
      listings.forEach(listing => {
        this.stats.totalScraped++;
        if (listing._quality_score >= 60) {
          this.stats.successful++;
        }
        if (listing.has_verified_traffic || listing.has_verified_revenue) {
          this.stats.verified++;
        }
        if (listing.category) {
          this.stats.categories[listing.category] = (this.stats.categories[listing.category] || 0) + 1;
        }
        if (listing.monetization) {
          this.stats.monetizations[listing.monetization] = (this.stats.monetizations[listing.monetization] || 0) + 1;
        }
      });
      
      console.log(`✅ Extracted ${listings.length} listings from page`);
      return listings;
      
    } catch (error) {
      console.error('❌ Error scraping listings page:', error);
      this.stats.failed++;
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeListingDetails(listingUrl) {
    const page = await this.browser.newPage();
    
    try {
      console.log(`📋 Scraping details from ${listingUrl}`);
      await page.goto(listingUrl, { waitUntil: 'networkidle2' });
      
      // Wait for main content to load
      await page.waitForSelector('.listing-header, .property-header, h1', { timeout: 10000 });
      
      const details = await page.evaluate(() => {
        const data = {};
        
        // Extract detailed information
        const extractors = {
          // Business details
          description: '.description, .listing-description, .property-description',
          detailed_financials: '.financials-section, .financial-details',
          traffic_details: '.traffic-section, .analytics-data',
          
          // Seller information
          seller_name: '.seller-name, .owner-name',
          seller_reputation: '.seller-rating, .reputation-score',
          response_time: '.response-time, .seller-response',
          
          // Additional metrics
          growth_rate: '.growth-rate, .growth-percentage',
          customer_metrics: '.customer-data, .user-metrics',
          competitive_advantages: '.advantages, .key-features',
          
          // Assets included
          included_assets: '.included-assets, .what-included',
          training_support: '.training-offered, .support-details',
          
          // Risk factors
          risks: '.risk-factors, .considerations',
          opportunities: '.growth-opportunities, .potential'
        };
        
        Object.entries(extractors).forEach(([field, selector]) => {
          const element = document.querySelector(selector);
          if (element) {
            data[field] = element.textContent?.trim();
          }
        });
        
        // Extract all images
        const images = [];
        document.querySelectorAll('.listing-image, .gallery-image, .screenshot').forEach(img => {
          const src = img.src || img.dataset.src;
          if (src) images.push(src);
        });
        if (images.length > 0) {
          data.images = images;
        }
        
        // Extract Q&A if available
        const qaSection = document.querySelector('.qa-section, .questions-answers');
        if (qaSection) {
          const qa = [];
          qaSection.querySelectorAll('.qa-item, .question-answer').forEach(item => {
            const question = item.querySelector('.question')?.textContent?.trim();
            const answer = item.querySelector('.answer')?.textContent?.trim();
            if (question && answer) {
              qa.push({ question, answer });
            }
          });
          if (qa.length > 0) {
            data.qa = qa;
          }
        }
        
        return data;
      });
      
      console.log('✅ Successfully extracted listing details');
      return details;
      
    } catch (error) {
      console.error('❌ Error scraping listing details:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeWithPagination(startUrl, maxPages = 10) {
    const allListings = [];
    let currentPage = 1;
    let nextUrl = startUrl;
    
    while (currentPage <= maxPages && nextUrl) {
      console.log(`\n📄 Scraping page ${currentPage}/${maxPages}`);
      
      try {
        const listings = await this.scrapeListingsPage(nextUrl);
        allListings.push(...listings);
        
        // Find next page URL
        const page = await this.browser.newPage();
        await page.goto(nextUrl, { waitUntil: 'networkidle2' });
        
        nextUrl = await page.evaluate(() => {
          const nextButton = document.querySelector('.pagination .next, a[rel="next"], .next-page');
          return nextButton ? nextButton.href : null;
        });
        
        await page.close();
        
        if (!nextUrl) {
          console.log('✅ Reached last page');
          break;
        }
        
        currentPage++;
        
        // Add delay between pages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error on page ${currentPage}:`, error);
        break;
      }
    }
    
    return allListings;
  }

  transformForTheFounder(listings) {
    console.log(`\n🔄 Transforming ${listings.length} listings for TheFounder...`);
    
    return listings.map(listing => {
      const transformed = {};
      
      // Apply field mapping
      Object.entries(this.strategy.thefounderIntegration.schemaMapping).forEach(([tfField, flippaField]) => {
        if (listing[flippaField] !== undefined) {
          transformed[tfField] = listing[flippaField];
          
          // Apply transformations if defined
          const transformer = this.strategy.thefounderIntegration.transformations[tfField];
          if (transformer) {
            transformed[tfField] = transformer(transformed[tfField]);
          }
        }
      });
      
      // Add quality score
      transformed.quality_score = this.strategy.thefounderIntegration.qualityScore(transformed);
      
      // Add metadata
      transformed.source = 'flippa';
      transformed.scraped_at = new Date().toISOString();
      transformed.raw_data = listing;
      
      return transformed;
    });
  }

  async generateReport() {
    console.log('\n📊 SCRAPING REPORT');
    console.log('='.repeat(50));
    console.log(`Total Listings Scraped: ${this.stats.totalScraped}`);
    console.log(`Successfully Extracted: ${this.stats.successful} (${(this.stats.successful/this.stats.totalScraped*100).toFixed(1)}%)`);
    console.log(`Verified Listings: ${this.stats.verified} (${(this.stats.verified/this.stats.totalScraped*100).toFixed(1)}%)`);
    console.log(`Failed Extractions: ${this.stats.failed}`);
    
    console.log('\n📂 Categories Distribution:');
    Object.entries(this.stats.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} (${(count/this.stats.totalScraped*100).toFixed(1)}%)`);
      });
    
    console.log('\n💰 Monetization Methods:');
    Object.entries(this.stats.monetizations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([method, count]) => {
        console.log(`   ${method}: ${count} (${(count/this.stats.totalScraped*100).toFixed(1)}%)`);
      });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Example usage
async function runScraper() {
  const scraper = new FlippaScraperPro({
    headless: false, // Set to true for production
    maxConcurrent: 3
  });
  
  try {
    await scraper.initialize();
    
    // Scrape multiple pages
    const listings = await scraper.scrapeWithPagination('https://flippa.com/search', 5);
    
    // Transform for TheFounder
    const transformedListings = scraper.transformForTheFounder(listings);
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      'flippa-scraped-data.json',
      JSON.stringify(transformedListings, null, 2)
    );
    
    // Generate report
    await scraper.generateReport();
    
    console.log(`\n✅ Saved ${transformedListings.length} listings to flippa-scraped-data.json`);
    
  } catch (error) {
    console.error('❌ Scraper error:', error);
  } finally {
    await scraper.close();
  }
}

// Export for use in other modules
module.exports = FlippaScraperPro;

// Run if called directly
if (require.main === module) {
  runScraper();
}