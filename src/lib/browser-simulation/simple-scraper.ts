// simple-scraper.ts
// Simplified browser automation fallback system for immediate functionality

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';

export interface SimpleScrapeConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
  delays?: {
    navigation: number;
    interaction: number;
    reading: number;
  };
}

export interface ScrapedListing {
  id: string;
  title: string;
  price: number | null;
  monthly_revenue: number | null;
  monthly_profit: number | null;
  multiple: number | null;
  category: string;
  url: string;
  description: string;
  scraped_at: string;
}

export interface ScrapeResult {
  success: boolean;
  listings: ScrapedListing[];
  totalFound: number;
  errors: string[];
  duration: number;
}

export class SimpleBrowserScraper extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: SimpleScrapeConfig;
  private isActive: boolean = false;

  constructor(config: SimpleScrapeConfig = {}) {
    super();
    this.config = {
      headless: true,
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      delays: {
        navigation: 2000,
        interaction: 1000,
        reading: 1500
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing simple browser scraper...');
      
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1366,768'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: this.config.userAgent,
        viewport: this.config.viewport,
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      // Basic stealth mode - simple overrides
      await this.context.addInitScript(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Add realistic plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      this.page = await this.context.newPage();
      
      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout!);
      
      console.log('Simple browser scraper initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize simple browser scraper:', error);
      throw error;
    }
  }

  async scrapeFlippaListings(targetUrl: string, maxListings: number = 100): Promise<ScrapeResult> {
    const startTime = Date.now();
    const result: ScrapeResult = {
      success: false,
      listings: [],
      totalFound: 0,
      errors: [],
      duration: 0
    };

    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    try {
      this.isActive = true;
      console.log(`Starting to scrape Flippa listings from: ${targetUrl}`);
      this.emit('started', { targetUrl, maxListings });

      let currentPage = 1;
      let totalScraped = 0;

      while (totalScraped < maxListings && this.isActive) {
        try {
          const pageUrl = this.buildPageUrl(targetUrl, currentPage);
          console.log(`Scraping page ${currentPage}: ${pageUrl}`);

          // Navigate to page with human-like delay
          await this.navigateWithDelay(pageUrl);

          // Wait for listings to load
          await this.waitForListings();

          // Extract listing URLs from current page
          const listingUrls = await this.extractListingUrls();
          
          if (listingUrls.length === 0) {
            console.log('No more listings found, stopping pagination');
            break;
          }

          result.totalFound += listingUrls.length;
          this.emit('pageProcessed', { page: currentPage, listingsFound: listingUrls.length });

          // Scrape individual listings
          for (const listingUrl of listingUrls) {
            if (totalScraped >= maxListings || !this.isActive) break;

            try {
              const listing = await this.scrapeIndividualListing(listingUrl);
              if (listing) {
                result.listings.push(listing);
                totalScraped++;
                
                this.emit('listingScraped', { 
                  listing, 
                  progress: totalScraped,
                  target: maxListings 
                });
                
                console.log(`Scraped listing ${totalScraped}/${maxListings}: ${listing.title}`);
              }

              // Human-like delay between listings
              await this.humanDelay(this.config.delays!.reading);

            } catch (listingError) {
              const errorMsg = `Error scraping listing ${listingUrl}: ${listingError}`;
              console.error(errorMsg);
              result.errors.push(errorMsg);
            }
          }

          currentPage++;
          
          // Delay between pages
          await this.humanDelay(this.config.delays!.navigation);

        } catch (pageError) {
          const errorMsg = `Error processing page ${currentPage}: ${pageError}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          break;
        }
      }

      result.success = result.listings.length > 0;
      result.duration = Date.now() - startTime;

      console.log(`Scraping completed: ${result.listings.length} listings in ${result.duration}ms`);
      this.emit('completed', result);

    } catch (error) {
      const errorMsg = `Scraping failed: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      result.duration = Date.now() - startTime;
      this.emit('error', error);
    } finally {
      this.isActive = false;
    }

    return result;
  }

  private buildPageUrl(baseUrl: string, page: number): string {
    const url = new URL(baseUrl);
    url.searchParams.set('page[number]', page.toString());
    return url.toString();
  }

  private async navigateWithDelay(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not available');

    // Navigate with timeout
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: this.config.timeout 
    });

    // Human-like delay after navigation
    await this.humanDelay(this.config.delays!.navigation);
  }

  private async waitForListings(): Promise<void> {
    if (!this.page) throw new Error('Page not available');

    try {
      // Wait for listing cards to appear
      await this.page.waitForSelector('[data-testid="listing-card"], .listing-card, .card', { 
        timeout: 10000 
      });
    } catch (error) {
      // Fallback: wait for any content
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    }
  }

  private async extractListingUrls(): Promise<string[]> {
    if (!this.page) throw new Error('Page not available');

    try {
      const urls = await this.page.evaluate(() => {
        const selectors = [
          '[data-testid="listing-card"] a[href]',
          '.listing-card a[href]',
          '.card a[href*="/listings/"]',
          'a[href*="/listings/"]'
        ];

        const links: string[] = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const href = (element as HTMLAnchorElement).href;
            if (href && href.includes('/listings/') && !links.includes(href)) {
              links.push(href);
            }
          }
          if (links.length > 0) break; // Stop at first successful selector
        }

        return links;
      });

      return urls.slice(0, 24); // Limit to reasonable number per page
    } catch (error) {
      console.error('Error extracting listing URLs:', error);
      return [];
    }
  }

  private async scrapeIndividualListing(url: string): Promise<ScrapedListing | null> {
    if (!this.page) throw new Error('Page not available');

    try {
      console.log(`Scraping individual listing: ${url}`);
      
      // Navigate to listing page
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout 
      });

      // Human-like delay for page reading
      await this.humanDelay(this.config.delays!.reading);

      // Extract listing data using simple selectors
      const listingData = await this.page.evaluate(() => {
        // Helper function to extract text safely
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        // Helper function to extract number from text
        const extractNumber = (text: string): number | null => {
          const match = text.match(/[\d,]+\.?\d*/);
          if (match) {
            const cleanNumber = match[0].replace(/,/g, '');
            const parsed = parseFloat(cleanNumber);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        };

        // Try multiple selectors for each field
        const titleSelectors = ['h1', '.title', '[data-test="title"]', '.listing-title'];
        const priceSelectors = ['.price', '[data-test="price"]', '.asking-price', '.list-price'];
        const revenueSelectors = ['.revenue', '[data-test="revenue"]', '.monthly-revenue'];
        const profitSelectors = ['.profit', '[data-test="profit"]', '.monthly-profit'];
        const categorySelectors = ['.category', '[data-test="category"]', '.business-type'];
        const descriptionSelectors = ['.description', '[data-test="description"]', '.listing-description'];

        let title = '';
        let priceText = '';
        let revenueText = '';
        let profitText = '';
        let category = '';
        let description = '';

        // Extract title
        for (const selector of titleSelectors) {
          title = getText(selector);
          if (title) break;
        }

        // Extract price
        for (const selector of priceSelectors) {
          priceText = getText(selector);
          if (priceText) break;
        }

        // Extract revenue
        for (const selector of revenueSelectors) {
          revenueText = getText(selector);
          if (revenueText) break;
        }

        // Extract profit
        for (const selector of profitSelectors) {
          profitText = getText(selector);
          if (profitText) break;
        }

        // Extract category
        for (const selector of categorySelectors) {
          category = getText(selector);
          if (category) break;
        }

        // Extract description
        for (const selector of descriptionSelectors) {
          description = getText(selector);
          if (description) break;
        }

        // Fallback: get any text that looks like price/revenue
        if (!priceText || !revenueText) {
          const allText = document.body.innerText;
          const priceMatches = allText.match(/\$[\d,]+/g);
          if (priceMatches && priceMatches.length >= 1 && !priceText) {
            priceText = priceMatches[0];
          }
          if (priceMatches && priceMatches.length >= 2 && !revenueText) {
            revenueText = priceMatches[1];
          }
        }

        return {
          title: title || document.title || 'Untitled Listing',
          priceText,
          revenueText,
          profitText,
          category: category || 'Business',
          description: description || 'No description available'
        };
      });

      // Process the extracted data
      const listing: ScrapedListing = {
        id: this.generateListingId(url),
        title: listingData.title,
        price: this.extractNumber(listingData.priceText),
        monthly_revenue: this.extractNumber(listingData.revenueText),
        monthly_profit: this.extractNumber(listingData.profitText),
        multiple: this.calculateMultiple(
          this.extractNumber(listingData.priceText),
          this.extractNumber(listingData.revenueText)
        ),
        category: listingData.category,
        url,
        description: listingData.description,
        scraped_at: new Date().toISOString()
      };

      return listing;

    } catch (error) {
      console.error(`Error scraping listing ${url}:`, error);
      return null;
    }
  }

  private generateListingId(url: string): string {
    const match = url.match(/\/listings\/([^\/\?]+)/);
    return match ? match[1] : `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractNumber(text: string): number | null {
    if (!text) return null;
    
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
      const cleanNumber = match[0].replace(/,/g, '');
      const parsed = parseFloat(cleanNumber);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private calculateMultiple(price: number | null, revenue: number | null): number | null {
    if (price && revenue && revenue > 0) {
      return Math.round((price / (revenue * 12)) * 10) / 10;
    }
    return null;
  }

  private async humanDelay(baseMs: number): Promise<void> {
    const variance = baseMs * 0.3; // 30% variance
    const actualDelay = baseMs + (Math.random() - 0.5) * variance;
    await new Promise(resolve => setTimeout(resolve, Math.max(500, actualDelay)));
  }

  async stop(): Promise<void> {
    this.isActive = false;
    console.log('Stopping simple browser scraper...');
    this.emit('stopped');
  }

  async cleanup(): Promise<void> {
    try {
      this.isActive = false;
      
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      console.log('Simple browser scraper cleaned up');
      this.emit('cleanup');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  getStatus() {
    return {
      active: this.isActive,
      initialized: !!this.browser,
      hasPage: !!this.page
    };
  }
}

export default SimpleBrowserScraper;