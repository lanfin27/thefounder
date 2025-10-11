// Flippa scraping type definitions

// Raw scraped data from Flippa
export interface FlippaRawListing {
  listingId: string
  title: string
  url: string
  askingPrice: number
  monthlyRevenue?: number
  annualRevenue?: number
  monthlyProfit?: number
  annualProfit?: number
  category?: string
  subCategory?: string
  industry?: string
  businessType?: string
  monetizationModel?: string
  siteAgeMonths?: number
  monthlyVisitors?: number
  pageViews?: number
  trafficSources?: TrafficSource[]
  listingDate?: Date
  lastUpdated?: Date
  viewCount?: number
  watchCount?: number
  bidCount?: number
  isVerified?: boolean
  sellerRating?: number
  description?: string
  highlights?: string[]
  attachments?: string[]
  rawHtml?: string
}

// Traffic source breakdown
export interface TrafficSource {
  source: string
  percentage: number
  trend?: 'up' | 'down' | 'stable'
}

export interface FlippaListing {
  // Database fields
  id?: string
  
  // Core identification
  listingId: string
  title: string
  url: string
  
  // Financial data
  askingPrice: number
  monthlyRevenue: number
  annualRevenue: number
  monthlyProfit: number
  annualProfit: number
  
  // Calculated multiples
  revenueMultiple: number | null
  profitMultiple: number | null
  
  // Categorization
  primaryCategory: string
  subCategory?: string
  industry: string
  businessType: string
  monetizationModel: string
  
  // Business details
  siteAgeMonths?: number
  monthlyVisitors?: number
  pageViews?: number
  trafficSources?: TrafficSource[]
  
  // Listing metadata
  listingDate: Date
  lastUpdated: Date
  viewCount: number
  watchCount: number
  bidCount: number
  isVerified: boolean
  sellerRating?: number
  
  // Additional fields
  description?: string
  highlights?: string[]
  keyMetrics?: Record<string, any>
  attachments?: string[]
  
  // Scraping metadata
  scrapedAt?: Date
  scrapingJobId?: string
  dataQualityScore?: number
  isActive?: boolean
  rawData?: Record<string, any>
}

export interface FlippaCategory {
  name: string
  slug: string
  count: number
  parentCategory?: string
  subCategories?: FlippaCategory[]
}

export interface ScrapingJob {
  id: string
  type: 'category_scan' | 'listing_scan' | 'detail_fetch' | 'statistics_calc'
  status: 'pending' | 'running' | 'completed' | 'failed'
  targetUrl?: string
  totalItems?: number
  processedItems: number
  successCount: number
  errorCount: number
  startedAt?: Date
  completedAt?: Date
  lastError?: string
  retryCount: number
  config?: Record<string, any>
  results?: Record<string, any>
}

export interface IndustryStatistics {
  industry: string
  date: Date
  
  // Volume metrics
  totalListings: number
  newListings: number
  soldListings: number
  
  // Price metrics
  avgAskingPrice: number
  medianAskingPrice: number
  minAskingPrice: number
  maxAskingPrice: number
  
  // Multiple metrics
  avgRevenueMultiple: number
  medianRevenueMultiple: number
  p25RevenueMultiple: number
  p75RevenueMultiple: number
  
  avgProfitMultiple: number
  medianProfitMultiple: number
  p25ProfitMultiple: number
  p75ProfitMultiple: number
  
  // Trends
  change24h: number
  change7d: number
  change30d: number
}

export interface CategoryMapping {
  flippaCategory: string
  flippaSlug: string
  ourIndustry: string
  isActive: boolean
}

// Target categories for initial implementation
export const TARGET_CATEGORIES: CategoryMapping[] = [
  { flippaCategory: 'SaaS', flippaSlug: 'saas', ourIndustry: 'SaaS', isActive: true },
  { flippaCategory: 'E-commerce', flippaSlug: 'ecommerce', ourIndustry: 'E-commerce', isActive: true },
  { flippaCategory: 'Content', flippaSlug: 'content', ourIndustry: 'Content Sites', isActive: true },
  { flippaCategory: 'Apps', flippaSlug: 'apps', ourIndustry: 'Mobile Apps', isActive: true },
  { flippaCategory: 'Marketplace', flippaSlug: 'marketplace', ourIndustry: 'Marketplace', isActive: true },
  { flippaCategory: 'Newsletter', flippaSlug: 'newsletter', ourIndustry: 'Newsletter', isActive: true },
  { flippaCategory: 'Education', flippaSlug: 'education', ourIndustry: 'EdTech', isActive: true },
  { flippaCategory: 'Dropshipping', flippaSlug: 'dropshipping', ourIndustry: 'Dropshipping', isActive: true },
  { flippaCategory: 'Agency', flippaSlug: 'agency', ourIndustry: 'Digital Agency', isActive: true },
  { flippaCategory: 'Course', flippaSlug: 'course', ourIndustry: 'Online Course', isActive: true },
  { flippaCategory: 'Affiliate', flippaSlug: 'affiliate', ourIndustry: 'Affiliate Sites', isActive: true },
  { flippaCategory: 'Directory', flippaSlug: 'directory', ourIndustry: 'Directory Sites', isActive: true },
  { flippaCategory: 'Social', flippaSlug: 'social', ourIndustry: 'Social Networks', isActive: true },
  { flippaCategory: 'Gaming', flippaSlug: 'gaming', ourIndustry: 'Gaming', isActive: true },
  { flippaCategory: 'Crypto', flippaSlug: 'crypto', ourIndustry: 'Crypto/Blockchain', isActive: true }
]

// Additional type definitions

// Scraper options
export interface ScraperOptions {
  headless?: boolean
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  useProxy?: boolean
  proxyConfig?: ProxyConfig
  userAgent?: string
  viewport?: { width: number; height: number }
  maxConcurrent?: number
  delayBetweenRequests?: { min: number; max: number }
}

// Proxy configuration
export interface ProxyConfig {
  server: string
  username?: string
  password?: string
  rotateOnError: boolean
}

// Browser page context
export interface PageContext {
  url: string
  retryCount: number
  startTime: number
  userAgent: string
  viewport: { width: number; height: number }
  proxy?: ProxyConfig
}

// Queue job data
export interface QueueJobData {
  jobId: string
  jobType: ScrapingJob['type']
  config: Record<string, any>
  priority?: number
  attempts?: number
}

// Data validation result
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  dataQualityScore: number
}

// Listing selector configuration
export interface ListingSelectors {
  container: string
  title: string
  price: string
  revenue?: string
  profit?: string
  multiple?: string
  category?: string
  metrics?: string
  verified?: string
  views?: string
  bids?: string
  age?: string
  nextPage?: string
}

// API response types
export interface ScrapingApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: Date
    duration?: number
    count?: number
  }
}