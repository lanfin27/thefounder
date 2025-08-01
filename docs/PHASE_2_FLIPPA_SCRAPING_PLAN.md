# Phase 2: Flippa Scraping System Implementation Plan

## Executive Summary

Transform TheFounder from mock data to real-time Flippa marketplace data, providing accurate industry multiples and valuation insights for Korean startup founders.

## 1. Technical Architecture

### A. Scraping Technology Stack

```typescript
// Recommended Stack
{
  "scraper": "Playwright",        // Better anti-detection than Puppeteer
  "queue": "Bull",                // Robust job queue with Redis
  "parser": "Cheerio",            // Fast HTML parsing
  "storage": "Supabase",          // Existing database
  "monitoring": "Winston + Sentry", // Logging and error tracking
  "proxy": "Bright Data",         // Residential proxies
  "scheduler": "node-cron"        // Cron job scheduling
}
```

### B. System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cron Jobs     │────▶│  Scraping Queue  │────▶│    Playwright   │
│  (Scheduler)    │     │   (Bull/Redis)   │     │    (Browser)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Supabase DB   │◀────│  Data Processor  │◀────│   HTML Parser   │
│  (PostgreSQL)   │     │  (Validation)    │     │   (Cheerio)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   Statistics     │
                        │   Calculator     │
                        └──────────────────┘
```

## 2. Database Schema Expansion

### A. New Tables

```sql
-- Raw Flippa listing data
CREATE TABLE flippa_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id VARCHAR(100) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Financial metrics
  asking_price BIGINT NOT NULL,
  monthly_revenue BIGINT,
  annual_revenue BIGINT,
  monthly_profit BIGINT,
  annual_profit BIGINT,
  
  -- Calculated multiples
  revenue_multiple DECIMAL(10,2),
  profit_multiple DECIMAL(10,2),
  
  -- Categorization
  primary_category VARCHAR(100),
  sub_category VARCHAR(100),
  industry VARCHAR(100),
  business_type VARCHAR(50),
  monetization_model VARCHAR(100),
  
  -- Business details
  site_age_months INTEGER,
  monthly_visitors INTEGER,
  page_views INTEGER,
  traffic_sources JSONB,
  
  -- Listing metadata
  listing_date TIMESTAMP,
  last_updated TIMESTAMP,
  view_count INTEGER,
  watch_count INTEGER,
  bid_count INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  seller_rating DECIMAL(3,2),
  
  -- Scraping metadata
  scraped_at TIMESTAMP DEFAULT NOW(),
  scraping_job_id UUID,
  data_quality_score INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  raw_data JSONB,
  
  -- Indexes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_flippa_industry ON flippa_listings(industry);
CREATE INDEX idx_flippa_category ON flippa_listings(primary_category);
CREATE INDEX idx_flippa_price ON flippa_listings(asking_price);
CREATE INDEX idx_flippa_multiples ON flippa_listings(revenue_multiple, profit_multiple);
CREATE INDEX idx_flippa_active ON flippa_listings(is_active, industry);
CREATE INDEX idx_flippa_listing_date ON flippa_listings(listing_date DESC);

-- Category mapping table
CREATE TABLE flippa_categories (
  id SERIAL PRIMARY KEY,
  flippa_category VARCHAR(100),
  flippa_slug VARCHAR(100),
  our_industry VARCHAR(100),
  parent_category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  listing_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Scraping job management
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL, -- 'category_scan', 'detail_fetch', 'statistics_calc'
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  target_url TEXT,
  
  -- Progress tracking
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Error handling
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  config JSONB,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily statistics snapshot
CREATE TABLE industry_statistics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  industry VARCHAR(100) NOT NULL,
  
  -- Volume metrics
  total_listings INTEGER,
  new_listings INTEGER,
  sold_listings INTEGER,
  
  -- Price metrics
  avg_asking_price BIGINT,
  median_asking_price BIGINT,
  min_asking_price BIGINT,
  max_asking_price BIGINT,
  
  -- Multiple metrics
  avg_revenue_multiple DECIMAL(10,2),
  median_revenue_multiple DECIMAL(10,2),
  p25_revenue_multiple DECIMAL(10,2),
  p75_revenue_multiple DECIMAL(10,2),
  
  avg_profit_multiple DECIMAL(10,2),
  median_profit_multiple DECIMAL(10,2),
  p25_profit_multiple DECIMAL(10,2),
  p75_profit_multiple DECIMAL(10,2),
  
  -- Trends
  change_24h DECIMAL(10,2),
  change_7d DECIMAL(10,2),
  change_30d DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, industry)
);
```

### B. Migration from Mock to Real Data

```sql
-- Backup existing mock data
CREATE TABLE industry_multiples_timeseries_mock AS 
SELECT * FROM industry_multiples_timeseries;

-- Update time series table with real data
INSERT INTO industry_multiples_timeseries (
  industry, 
  date, 
  avg_profit_multiple,
  avg_revenue_multiple,
  transaction_count,
  total_volume,
  high_multiple,
  low_multiple
)
SELECT 
  industry,
  date,
  avg_profit_multiple,
  avg_revenue_multiple,
  total_listings as transaction_count,
  avg_asking_price * total_listings as total_volume,
  p75_profit_multiple as high_multiple,
  p25_profit_multiple as low_multiple
FROM industry_statistics_daily
ON CONFLICT (industry, date) 
DO UPDATE SET
  avg_profit_multiple = EXCLUDED.avg_profit_multiple,
  avg_revenue_multiple = EXCLUDED.avg_revenue_multiple,
  transaction_count = EXCLUDED.transaction_count,
  total_volume = EXCLUDED.total_volume,
  updated_at = NOW();
```

## 3. Scraping Implementation

### A. Core Scraper Module

```typescript
// src/lib/scraping/flippa/scraper.ts
import { chromium, Browser, Page } from 'playwright';
import { createClient } from '@/lib/supabase/admin';
import pLimit from 'p-limit';
import { logger } from '@/lib/logger';

interface ScraperConfig {
  headless: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  userAgent: string;
  viewport: { width: number; height: number };
  timeout: number;
  retryAttempts: number;
  delayBetweenRequests: number;
}

export class FlippaScraper {
  private browser: Browser | null = null;
  private config: ScraperConfig;
  private supabase = createClient();
  private limit = pLimit(3); // Max 3 concurrent pages

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      headless: true,
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      timeout: 30000,
      retryAttempts: 3,
      delayBetweenRequests: 2000,
      ...config
    };
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: this.config.headless,
      proxy: this.config.proxy,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
  }

  async scrapeCategories(): Promise<FlippaCategory[]> {
    const page = await this.browser!.newPage();
    await this.setupPage(page);
    
    try {
      await page.goto('https://flippa.com/search', {
        waitUntil: 'networkidle'
      });

      // Extract categories from filters
      const categories = await page.evaluate(() => {
        const categoryElements = document.querySelectorAll('[data-category]');
        return Array.from(categoryElements).map(el => ({
          name: el.textContent?.trim() || '',
          slug: el.getAttribute('data-category') || '',
          count: parseInt(el.querySelector('.count')?.textContent || '0')
        }));
      });

      // Save to database
      await this.saveCategories(categories);
      return categories;
      
    } finally {
      await page.close();
    }
  }

  async scrapeListings(category: string, page: number = 1): Promise<FlippaListing[]> {
    const pageInstance = await this.browser!.newPage();
    await this.setupPage(pageInstance);
    
    try {
      const url = `https://flippa.com/search?category=${category}&page=${page}`;
      await pageInstance.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for listings to load
      await pageInstance.waitForSelector('.listing-card', { timeout: 10000 });
      
      const listings = await pageInstance.evaluate(() => {
        const cards = document.querySelectorAll('.listing-card');
        return Array.from(cards).map(card => {
          const getPrice = (text: string) => {
            const match = text.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : 0;
          };

          return {
            listingId: card.getAttribute('data-listing-id') || '',
            title: card.querySelector('.title')?.textContent?.trim() || '',
            url: card.querySelector('a')?.href || '',
            askingPrice: getPrice(card.querySelector('.price')?.textContent || ''),
            monthlyRevenue: getPrice(card.querySelector('.revenue')?.textContent || ''),
            monthlyProfit: getPrice(card.querySelector('.profit')?.textContent || ''),
            category: card.querySelector('.category')?.textContent?.trim() || '',
            viewCount: parseInt(card.querySelector('.views')?.textContent || '0'),
            bidCount: parseInt(card.querySelector('.bids')?.textContent || '0')
          };
        });
      });

      // Save listings with calculated multiples
      await this.saveListings(listings.map(listing => ({
        ...listing,
        annualRevenue: listing.monthlyRevenue * 12,
        annualProfit: listing.monthlyProfit * 12,
        revenueMultiple: listing.monthlyRevenue > 0 
          ? listing.askingPrice / (listing.monthlyRevenue * 12) 
          : null,
        profitMultiple: listing.monthlyProfit > 0 
          ? listing.askingPrice / (listing.monthlyProfit * 12) 
          : null
      })));

      return listings;
      
    } catch (error) {
      logger.error('Scraping error:', { category, page, error });
      throw error;
    } finally {
      await pageInstance.close();
    }
  }

  private async setupPage(page: Page) {
    await page.setUserAgent(this.config.userAgent);
    await page.setViewportSize(this.config.viewport);
    
    // Anti-detection measures
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    // Random mouse movements
    page.on('load', async () => {
      await page.mouse.move(
        Math.random() * 1000,
        Math.random() * 800
      );
    });
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

### B. Job Queue System

```typescript
// src/lib/scraping/queue/scraping-queue.ts
import Bull from 'bull';
import { FlippaScraper } from '../flippa/scraper';
import { createClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const scrapingQueue = new Bull('flippa-scraping', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Process category scanning
scrapingQueue.process('scan-categories', async (job) => {
  const scraper = new FlippaScraper();
  const supabase = createClient();
  
  try {
    await scraper.initialize();
    
    // Update job status
    await supabase.from('scraping_jobs').update({
      status: 'running',
      started_at: new Date()
    }).eq('id', job.data.jobId);
    
    const categories = await scraper.scrapeCategories();
    
    // Queue listing scraping for each category
    for (const category of categories) {
      await scrapingQueue.add('scan-listings', {
        category: category.slug,
        categoryName: category.name,
        estimatedCount: category.count
      }, {
        delay: Math.random() * 60000 // Random delay up to 1 minute
      });
    }
    
    await supabase.from('scraping_jobs').update({
      status: 'completed',
      completed_at: new Date(),
      results: { categoriesFound: categories.length }
    }).eq('id', job.data.jobId);
    
  } catch (error) {
    logger.error('Category scan failed:', error);
    throw error;
  } finally {
    await scraper.close();
  }
});

// Process listing scanning
scrapingQueue.process('scan-listings', 2, async (job) => {
  const { category, page = 1 } = job.data;
  const scraper = new FlippaScraper();
  
  try {
    await scraper.initialize();
    const listings = await scraper.scrapeListings(category, page);
    
    // Queue detail fetching for each listing
    for (const listing of listings) {
      await scrapingQueue.add('fetch-details', {
        listingId: listing.listingId,
        url: listing.url
      }, {
        priority: listing.askingPrice > 100000 ? 1 : 2
      });
    }
    
    // Check if there are more pages
    if (listings.length === 30) { // Assuming 30 per page
      await scrapingQueue.add('scan-listings', {
        ...job.data,
        page: page + 1
      }, {
        delay: 5000
      });
    }
    
  } finally {
    await scraper.close();
  }
});
```

### C. Statistics Calculator

```typescript
// src/lib/scraping/statistics/calculator.ts
import { createClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export class StatisticsCalculator {
  private supabase = createClient();

  async calculateDailyStatistics(date: Date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Get all industries
    const { data: industries } = await this.supabase
      .from('flippa_categories')
      .select('our_industry')
      .eq('is_active', true);

    for (const { our_industry } of industries || []) {
      try {
        // Get listings for this industry
        const { data: listings } = await this.supabase
          .from('flippa_listings')
          .select('*')
          .eq('industry', our_industry)
          .eq('is_active', true)
          .gte('scraped_at', dateStr)
          .lt('scraped_at', `${dateStr}T23:59:59`);

        if (!listings || listings.length === 0) continue;

        // Calculate statistics
        const stats = this.calculateStats(listings);
        
        // Save to daily statistics
        await this.supabase
          .from('industry_statistics_daily')
          .upsert({
            date: dateStr,
            industry: our_industry,
            ...stats
          });

        // Update time series for charts
        await this.updateTimeSeries(our_industry, dateStr, stats);
        
      } catch (error) {
        logger.error(`Statistics calculation failed for ${our_industry}:`, error);
      }
    }
  }

  private calculateStats(listings: any[]) {
    const prices = listings.map(l => l.asking_price).filter(p => p > 0);
    const revenueMultiples = listings
      .map(l => l.revenue_multiple)
      .filter(m => m !== null && m > 0 && m < 100); // Remove outliers
    const profitMultiples = listings
      .map(l => l.profit_multiple)
      .filter(m => m !== null && m > 0 && m < 100);

    return {
      total_listings: listings.length,
      new_listings: listings.filter(l => {
        const listingDate = new Date(l.listing_date);
        const today = new Date();
        return listingDate.toDateString() === today.toDateString();
      }).length,
      
      // Price statistics
      avg_asking_price: this.average(prices),
      median_asking_price: this.median(prices),
      min_asking_price: Math.min(...prices),
      max_asking_price: Math.max(...prices),
      
      // Revenue multiple statistics
      avg_revenue_multiple: this.average(revenueMultiples),
      median_revenue_multiple: this.median(revenueMultiples),
      p25_revenue_multiple: this.percentile(revenueMultiples, 25),
      p75_revenue_multiple: this.percentile(revenueMultiples, 75),
      
      // Profit multiple statistics  
      avg_profit_multiple: this.average(profitMultiples),
      median_profit_multiple: this.median(profitMultiples),
      p25_profit_multiple: this.percentile(profitMultiples, 25),
      p75_profit_multiple: this.percentile(profitMultiples, 75)
    };
  }

  private average(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private async updateTimeSeries(industry: string, date: string, stats: any) {
    await this.supabase
      .from('industry_multiples_timeseries')
      .upsert({
        industry,
        date,
        avg_profit_multiple: stats.avg_profit_multiple,
        avg_revenue_multiple: stats.avg_revenue_multiple,
        transaction_count: stats.total_listings,
        total_volume: stats.avg_asking_price * stats.total_listings,
        high_multiple: stats.p75_profit_multiple,
        low_multiple: stats.p25_profit_multiple
      });
  }
}
```

## 4. API Updates

### A. Enhanced Chart API

```typescript
// src/app/api/public/industry-charts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const source = searchParams.get('source') || 'auto'; // 'real', 'mock', 'auto'
    
    const supabase = await createClient();
    let data;
    let usingRealData = false;

    if (source !== 'mock') {
      try {
        // Try real data first
        const { data: realData, error } = await supabase
          .from('industry_statistics_daily')
          .select('*')
          .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('date', { ascending: false });

        if (!error && realData && realData.length > 0) {
          data = processRealData(realData);
          usingRealData = true;
        }
      } catch (error) {
        logger.error('Failed to fetch real data:', error);
      }
    }

    // Fall back to mock data if needed
    if (!data || data.length === 0) {
      data = generateMockData(days);
    }

    return NextResponse.json({
      success: true,
      data,
      lastUpdated: new Date().toISOString(),
      dataSource: usingRealData ? 'flippa' : 'mock',
      meta: {
        days,
        totalIndustries: data.length,
        dataQuality: usingRealData ? calculateDataQuality(data) : 0
      }
    });

  } catch (error) {
    logger.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chart data'
    }, { status: 500 });
  }
}
```

## 5. Implementation Timeline

### Week 1: Foundation
- **Day 1-2**: Environment setup, dependencies, database migrations
- **Day 3-4**: Basic Flippa scraper with category discovery  
- **Day 5**: Job queue system with Bull/Redis

### Week 2: Core Scraping
- **Day 1-2**: Listing collection pipeline
- **Day 3-4**: Detail page scraping
- **Day 5**: Data validation and quality checks

### Week 3: Processing & Integration
- **Day 1-2**: Statistics calculator
- **Day 3-4**: API updates to use real data
- **Day 5**: Admin monitoring dashboard

### Week 4: Polish & Deploy
- **Day 1-2**: Performance optimization
- **Day 3-4**: Error handling and retries
- **Day 5**: Production deployment

## 6. Risk Mitigation

### A. Technical Risks
- **Rate Limiting**: Implement exponential backoff and proxy rotation
- **IP Blocking**: Use residential proxies and randomize behavior
- **Data Quality**: Add validation and anomaly detection
- **Performance**: Use job queues and database indexes

### B. Legal Compliance
- **Respect robots.txt**: Check and follow Flippa's robots.txt
- **Rate Limits**: Maximum 1 request per 2 seconds per IP
- **Terms of Service**: Review and comply with Flippa ToS
- **Data Privacy**: Don't scrape personal seller information

## 7. Success Metrics

### KPIs
- Scraping success rate: >95%
- Data freshness: <24 hours
- API response time: <200ms
- Data quality score: >90%
- Industry coverage: 15+ categories

### Monitoring
- Real-time scraping job status
- Data quality dashboards
- Error rate tracking
- Performance metrics
- Cost per listing scraped

## 8. Next Steps

1. **Install dependencies**:
```bash
npm install playwright bull ioredis cheerio p-limit winston
npm install --save-dev @types/bull
```

2. **Set up Redis** for job queue

3. **Create database migrations**

4. **Build proof of concept** scraper

5. **Test on single category**

6. **Scale to production**

---

This plan provides a comprehensive roadmap for transitioning from mock data to real Flippa marketplace data, ensuring TheFounder provides accurate, real-time valuation insights for Korean startup founders.