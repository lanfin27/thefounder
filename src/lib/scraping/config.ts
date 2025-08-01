// Scraping configuration

export const SCRAPING_CONFIG = {
  // Browser settings
  browser: {
    headless: process.env.NODE_ENV === 'production',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  },

  // Request settings
  request: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 5000,
    delayBetweenRequests: {
      min: 2000,
      max: 5000
    }
  },

  // Rate limiting
  rateLimit: {
    maxConcurrent: 3,
    requestsPerMinute: 20,
    requestsPerHour: 800,
    requestsPerDay: 10000
  },

  // User agents pool
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ],

  // Viewport sizes
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1600, height: 900 }
  ],

  // Proxy settings (if using)
  proxy: {
    enabled: process.env.USE_PROXY === 'true',
    server: process.env.PROXY_SERVER,
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD,
    rotateOnError: true
  },

  // Data quality thresholds
  dataQuality: {
    minProfitMultiple: 0.1,
    maxProfitMultiple: 100,
    minRevenueMultiple: 0.1,
    maxRevenueMultiple: 50,
    minAskingPrice: 100,
    maxAskingPrice: 100000000,
    requiredFields: [
      'listingId',
      'title',
      'askingPrice',
      'primaryCategory'
    ]
  },

  // Job queue settings
  queue: {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    }
  },

  // Flippa specific
  flippa: {
    baseUrl: 'https://flippa.com',
    searchUrl: 'https://flippa.com/search',
    listingsPerPage: 30,
    maxPagesPerCategory: 100,
    selectors: {
      listingCard: '.listing-card',
      title: '.listing-card__title',
      price: '.listing-card__price',
      revenue: '[data-metric="revenue"]',
      profit: '[data-metric="profit"]',
      category: '.listing-card__category',
      views: '.listing-card__views',
      bids: '.listing-card__bids',
      nextPage: '.pagination__next'
    }
  },

  // Monitoring
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    errorReporting: process.env.NODE_ENV === 'production',
    metricsEnabled: true,
    alertThresholds: {
      errorRate: 0.1, // 10%
      successRate: 0.9, // 90%
      avgResponseTime: 5000 // 5 seconds
    }
  }
}

// Helper functions
export function getRandomUserAgent(): string {
  const agents = SCRAPING_CONFIG.userAgents
  return agents[Math.floor(Math.random() * agents.length)]
}

export function getRandomViewport() {
  const viewports = SCRAPING_CONFIG.viewports
  return viewports[Math.floor(Math.random() * viewports.length)]
}

export function getRandomDelay(): number {
  const { min, max } = SCRAPING_CONFIG.request.delayBetweenRequests
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function isValidListing(listing: any): boolean {
  const { requiredFields, minAskingPrice, maxAskingPrice } = SCRAPING_CONFIG.dataQuality
  
  // Check required fields
  for (const field of requiredFields) {
    if (!listing[field]) return false
  }
  
  // Check price range
  if (listing.askingPrice < minAskingPrice || listing.askingPrice > maxAskingPrice) {
    return false
  }
  
  // Check multiples if present
  if (listing.profitMultiple !== null) {
    const { minProfitMultiple, maxProfitMultiple } = SCRAPING_CONFIG.dataQuality
    if (listing.profitMultiple < minProfitMultiple || listing.profitMultiple > maxProfitMultiple) {
      return false
    }
  }
  
  return true
}