// Core Flippa scraper implementation

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import pLimit from 'p-limit'
import { SCRAPING_CONFIG, getRandomUserAgent, getRandomViewport, getRandomDelay } from '../config'
import { logger, scrapingLogger, PerformanceTracker } from '../utils/logger'
import { ListingValidator } from './validator'
import type { 
  FlippaRawListing, 
  FlippaCategory, 
  ScraperOptions, 
  PageContext,
  ListingSelectors 
} from './types'

export class FlippaScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private options: ScraperOptions
  private limiter: ReturnType<typeof pLimit>
  private selectors: ListingSelectors

  constructor(options: ScraperOptions = {}) {
    this.options = {
      headless: SCRAPING_CONFIG.browser.headless,
      timeout: SCRAPING_CONFIG.request.timeout,
      retryAttempts: SCRAPING_CONFIG.request.retryAttempts,
      retryDelay: SCRAPING_CONFIG.request.retryDelay,
      maxConcurrent: SCRAPING_CONFIG.rateLimit.maxConcurrent,
      delayBetweenRequests: SCRAPING_CONFIG.request.delayBetweenRequests,
      ...options
    }

    this.limiter = pLimit(this.options.maxConcurrent || 3)
    this.selectors = {
      container: SCRAPING_CONFIG.flippa.selectors.listingCard,
      ...SCRAPING_CONFIG.flippa.selectors
    } as ListingSelectors
  }

  /**
   * Initialize browser
   */
  async initialize() {
    try {
      const browserArgs = [...SCRAPING_CONFIG.browser.args]
      
      // Add proxy if configured
      if (this.options.useProxy && this.options.proxyConfig) {
        browserArgs.push(`--proxy-server=${this.options.proxyConfig.server}`)
      }

      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: browserArgs
      })

      const contextOptions: any = {
        userAgent: this.options.userAgent || getRandomUserAgent(),
        viewport: this.options.viewport || getRandomViewport(),
        ignoreHTTPSErrors: true
      }

      // Add proxy auth if configured
      if (this.options.useProxy && this.options.proxyConfig?.username) {
        contextOptions.httpCredentials = {
          username: this.options.proxyConfig.username,
          password: this.options.proxyConfig.password || ''
        }
      }

      this.context = await this.browser.newContext(contextOptions)

      logger.info('Flippa scraper initialized', {
        headless: this.options.headless,
        userAgent: contextOptions.userAgent,
        viewport: contextOptions.viewport
      })
    } catch (error) {
      logger.error('Failed to initialize scraper', error)
      throw error
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Scrape categories from Flippa
   */
  async scrapeCategories(): Promise<FlippaCategory[]> {
    const perf = new PerformanceTracker()
    const categories: FlippaCategory[] = []

    try {
      const page = await this.createPage()
      await page.goto(`${SCRAPING_CONFIG.flippa.baseUrl}/search`, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      })

      perf.checkpoint('page_loaded')

      // Wait for category filters to load
      await page.waitForSelector('[data-testid="category-filter"]', {
        timeout: 10000
      })

      // Extract categories
      const categoryElements = await page.$$('[data-testid="category-filter"] [data-category]')
      
      for (const element of categoryElements) {
        const name = await element.textContent()
        const slug = await element.getAttribute('data-category')
        const countText = await element.$eval('.count', el => el.textContent || '0')
        const count = parseInt(countText.replace(/[^\d]/g, ''), 10)

        if (name && slug) {
          categories.push({
            name: name.trim(),
            slug,
            count,
            parentCategory: undefined,
            subCategories: []
          })
        }
      }

      scrapingLogger.categoryScanned('all', categories.length)
      perf.finish()

      await page.close()
      return categories
    } catch (error) {
      logger.error('Failed to scrape categories', error)
      throw error
    }
  }

  /**
   * Scrape listings from a specific category
   */
  async scrapeListings(
    category: string, 
    maxPages: number = 1
  ): Promise<FlippaRawListing[]> {
    const perf = new PerformanceTracker()
    const allListings: FlippaRawListing[] = []
    
    scrapingLogger.jobStarted('listing_scan', category, { maxPages })

    try {
      for (let page = 1; page <= maxPages; page++) {
        const listings = await this.scrapeListingPage(category, page)
        allListings.push(...listings)

        if (listings.length < SCRAPING_CONFIG.flippa.listingsPerPage) {
          // No more pages
          break
        }

        // Delay between pages
        await this.delay()
      }

      const validation = ListingValidator.validateBatch(allListings)
      
      scrapingLogger.jobCompleted('listing_scan', category, {
        total: allListings.length,
        valid: validation.valid.length,
        invalid: validation.invalid.length
      })

      perf.finish()
      return allListings
    } catch (error) {
      scrapingLogger.jobFailed('listing_scan', category, error)
      throw error
    }
  }

  /**
   * Scrape a single page of listings
   */
  private async scrapeListingPage(
    category: string, 
    pageNumber: number
  ): Promise<FlippaRawListing[]> {
    const page = await this.createPage()
    const listings: FlippaRawListing[] = []

    try {
      const url = `${SCRAPING_CONFIG.flippa.searchUrl}?filter[property_type]=${category}&page=${pageNumber}`
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      })

      // Wait for listings to load
      await page.waitForSelector(this.selectors.container, {
        timeout: 10000
      })

      const listingElements = await page.$$(this.selectors.container)

      for (const element of listingElements) {
        try {
          const listing = await this.extractListingData(element, category)
          if (listing) {
            listings.push(listing)
          }
        } catch (error) {
          logger.warn('Failed to extract listing', { error })
        }
      }

      logger.info(`Scraped ${listings.length} listings from page ${pageNumber}`, {
        category,
        pageNumber
      })

      await page.close()
      return listings
    } catch (error) {
      await page.close()
      throw error
    }
  }

  /**
   * Extract data from a listing element
   */
  private async extractListingData(
    element: any, 
    category: string
  ): Promise<FlippaRawListing | null> {
    try {
      // Extract basic info
      const titleElement = await element.$(this.selectors.title)
      const title = await titleElement?.textContent()
      const url = await titleElement?.$eval('a', (el: any) => el.href)
      const listingId = this.extractListingId(url)

      if (!title || !url || !listingId) return null

      // Extract price
      const priceText = await element.$eval(
        this.selectors.price, 
        (el: any) => el.textContent || '0'
      )
      const askingPrice = this.parsePrice(priceText)

      // Extract financial metrics
      const revenueText = await element.$eval(
        this.selectors.revenue || '[data-metric="revenue"]',
        (el: any) => el.textContent || '0'
      ).catch(() => '0')
      const profitText = await element.$eval(
        this.selectors.profit || '[data-metric="profit"]',
        (el: any) => el.textContent || '0'
      ).catch(() => '0')

      const monthlyRevenue = this.parsePrice(revenueText)
      const monthlyProfit = this.parsePrice(profitText)

      // Extract metadata
      const viewsText = await element.$eval(
        this.selectors.views || '.views',
        (el: any) => el.textContent || '0'
      ).catch(() => '0')
      const bidsText = await element.$eval(
        this.selectors.bids || '.bids',
        (el: any) => el.textContent || '0'
      ).catch(() => '0')

      const viewCount = parseInt(viewsText.replace(/[^\d]/g, ''), 10)
      const bidCount = parseInt(bidsText.replace(/[^\d]/g, ''), 10)

      // Check if verified
      const isVerified = await element.$(this.selectors.verified || '.verified-badge')
        .then((el: any) => !!el)
        .catch(() => false)

      const listing: FlippaRawListing = {
        listingId,
        title,
        url,
        askingPrice,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        monthlyProfit,
        annualProfit: monthlyProfit * 12,
        category,
        industry: category,
        viewCount,
        bidCount,
        isVerified,
        listingDate: new Date(),
        lastUpdated: new Date()
      }

      scrapingLogger.listingScraped(listingId, category, askingPrice)
      return listing
    } catch (error) {
      logger.error('Failed to extract listing data', error)
      return null
    }
  }

  /**
   * Scrape detailed listing information
   */
  async scrapeListingDetails(url: string): Promise<FlippaRawListing | null> {
    const page = await this.createPage()

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      })

      // Extract detailed information
      const listingId = this.extractListingId(url)
      
      // Wait for main content
      await page.waitForSelector('[data-testid="listing-header"]', {
        timeout: 10000
      })

      const title = await page.$eval('h1', el => el.textContent || '')
      
      // Extract all financial metrics
      const metrics = await page.evaluate(() => {
        const extractMetric = (selector: string): number => {
          const el = document.querySelector(selector)
          if (!el) return 0
          const text = el.textContent || '0'
          return parseInt(text.replace(/[^\d]/g, ''), 10)
        }

        return {
          askingPrice: extractMetric('[data-metric="asking-price"]'),
          monthlyRevenue: extractMetric('[data-metric="monthly-revenue"]'),
          monthlyProfit: extractMetric('[data-metric="monthly-profit"]'),
          monthlyVisitors: extractMetric('[data-metric="monthly-visitors"]'),
          pageViews: extractMetric('[data-metric="page-views"]'),
          siteAge: extractMetric('[data-metric="site-age"]')
        }
      })

      // Extract description and highlights
      const description = await page.$eval(
        '[data-testid="listing-description"]',
        el => el.textContent || ''
      ).catch(() => '')

      const highlights = await page.$$eval(
        '[data-testid="listing-highlights"] li',
        elements => elements.map(el => el.textContent || '').filter(Boolean)
      ).catch(() => [])

      // Extract traffic sources
      const trafficSources = await page.$$eval(
        '[data-testid="traffic-sources"] [data-source]',
        elements => elements.map(el => ({
          source: el.getAttribute('data-source') || '',
          percentage: parseInt(el.getAttribute('data-percentage') || '0', 10)
        }))
      ).catch(() => [])

      const listing: FlippaRawListing = {
        listingId,
        title,
        url,
        ...metrics,
        annualRevenue: metrics.monthlyRevenue * 12,
        annualProfit: metrics.monthlyProfit * 12,
        siteAgeMonths: metrics.siteAge,
        description,
        highlights,
        trafficSources,
        lastUpdated: new Date()
      }

      await page.close()
      return listing
    } catch (error) {
      logger.error('Failed to scrape listing details', { url, error })
      await page.close()
      return null
    }
  }

  /**
   * Create a new page with context
   */
  private async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not initialized')
    }

    const page = await this.context.newPage()
    
    // Set default timeout
    page.setDefaultTimeout(this.options.timeout || 30000)
    
    // Block unnecessary resources
    await page.route('**/*', route => {
      const resourceType = route.request().resourceType()
      if (['image', 'media', 'font'].includes(resourceType)) {
        route.abort()
      } else {
        route.continue()
      }
    })

    return page
  }

  /**
   * Extract listing ID from URL
   */
  private extractListingId(url: string): string {
    const match = url.match(/\/(\d+)(?:-|$)/)
    return match ? match[1] : ''
  }

  /**
   * Parse price from text
   */
  private parsePrice(text: string): number {
    const cleaned = text.replace(/[^\d.]/g, '')
    const price = parseFloat(cleaned)
    return isNaN(price) ? 0 : Math.round(price)
  }

  /**
   * Delay between requests
   */
  private async delay() {
    const delayMs = getRandomDelay()
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  /**
   * Retry with exponential backoff
   */
  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = this.options.retryAttempts || 3
  ): Promise<T> {
    let lastError: any

    for (let i = 0; i < retries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        const delay = (this.options.retryDelay || 5000) * Math.pow(2, i)
        logger.warn(`Retry attempt ${i + 1}/${retries} after ${delay}ms`, { error })
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }
}