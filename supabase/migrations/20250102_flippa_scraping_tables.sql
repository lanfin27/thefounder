-- Phase 2: Flippa Scraping System Tables
-- =========================================

-- 1. Raw Flippa listings data
CREATE TABLE IF NOT EXISTS flippa_listings (
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
  view_count INTEGER DEFAULT 0,
  watch_count INTEGER DEFAULT 0,
  bid_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  seller_rating DECIMAL(3,2),
  
  -- Scraping metadata
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  scraping_job_id UUID,
  data_quality_score INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX idx_flippa_industry ON flippa_listings(industry) WHERE is_active = TRUE;
CREATE INDEX idx_flippa_category ON flippa_listings(primary_category) WHERE is_active = TRUE;
CREATE INDEX idx_flippa_price ON flippa_listings(asking_price);
CREATE INDEX idx_flippa_multiples ON flippa_listings(revenue_multiple, profit_multiple) WHERE revenue_multiple IS NOT NULL;
CREATE INDEX idx_flippa_listing_date ON flippa_listings(listing_date DESC);
CREATE INDEX idx_flippa_scraped_at ON flippa_listings(scraped_at DESC);

-- 2. Category mapping table
CREATE TABLE IF NOT EXISTS flippa_categories (
  id SERIAL PRIMARY KEY,
  flippa_category VARCHAR(100) NOT NULL,
  flippa_slug VARCHAR(100) UNIQUE NOT NULL,
  our_industry VARCHAR(100) NOT NULL,
  parent_category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  listing_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert initial category mappings
INSERT INTO flippa_categories (flippa_category, flippa_slug, our_industry) VALUES
  ('SaaS', 'saas', 'SaaS'),
  ('E-commerce', 'ecommerce', 'E-commerce'),
  ('Content', 'content', 'Content Sites'),
  ('Apps', 'apps', 'Mobile Apps'),
  ('Marketplace', 'marketplace', 'Marketplace'),
  ('Newsletter', 'newsletter', 'Newsletter'),
  ('Education', 'education', 'EdTech'),
  ('Dropshipping', 'dropshipping', 'Dropshipping'),
  ('Agency', 'agency', 'Digital Agency'),
  ('Course', 'course', 'Online Course'),
  ('Affiliate', 'affiliate', 'Affiliate Sites'),
  ('Directory', 'directory', 'Directory Sites'),
  ('Social', 'social', 'Social Networks'),
  ('Gaming', 'gaming', 'Gaming'),
  ('Crypto', 'crypto', 'Crypto/Blockchain')
ON CONFLICT (flippa_slug) DO NOTHING;

-- 3. Scraping job management
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('category_scan', 'listing_scan', 'detail_fetch', 'statistics_calc')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  target_url TEXT,
  
  -- Progress tracking
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED,
  
  -- Error handling
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  config JSONB,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for job tracking
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status, created_at DESC);
CREATE INDEX idx_scraping_jobs_type ON scraping_jobs(job_type, status);

-- 4. Daily statistics snapshot
CREATE TABLE IF NOT EXISTS industry_statistics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  industry VARCHAR(100) NOT NULL,
  
  -- Volume metrics
  total_listings INTEGER NOT NULL DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  sold_listings INTEGER DEFAULT 0,
  
  -- Price metrics
  avg_asking_price BIGINT,
  median_asking_price BIGINT,
  min_asking_price BIGINT,
  max_asking_price BIGINT,
  
  -- Revenue multiple metrics
  avg_revenue_multiple DECIMAL(10,2),
  median_revenue_multiple DECIMAL(10,2),
  p25_revenue_multiple DECIMAL(10,2),
  p75_revenue_multiple DECIMAL(10,2),
  
  -- Profit multiple metrics
  avg_profit_multiple DECIMAL(10,2),
  median_profit_multiple DECIMAL(10,2),
  p25_profit_multiple DECIMAL(10,2),
  p75_profit_multiple DECIMAL(10,2),
  
  -- Trends (calculated from previous days)
  change_24h DECIMAL(10,2),
  change_7d DECIMAL(10,2),
  change_30d DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(date, industry)
);

-- Indexes for statistics queries
CREATE INDEX idx_industry_stats_date ON industry_statistics_daily(date DESC, industry);
CREATE INDEX idx_industry_stats_industry ON industry_statistics_daily(industry, date DESC);

-- 5. Scraping metrics table for monitoring
CREATE TABLE IF NOT EXISTS scraping_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  tags JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_scraping_metrics_type ON scraping_metrics(metric_type, recorded_at DESC);

-- Functions and triggers

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
CREATE TRIGGER update_flippa_listings_updated_at BEFORE UPDATE ON flippa_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flippa_categories_updated_at BEFORE UPDATE ON flippa_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_jobs_updated_at BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_statistics_daily_updated_at BEFORE UPDATE ON industry_statistics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_listing_quality_score(listing flippa_listings)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 100;
BEGIN
  -- Check required fields
  IF listing.title IS NULL OR listing.title = '' THEN score := score - 20; END IF;
  IF listing.asking_price IS NULL OR listing.asking_price = 0 THEN score := score - 30; END IF;
  IF listing.primary_category IS NULL THEN score := score - 10; END IF;
  IF listing.industry IS NULL THEN score := score - 10; END IF;
  
  -- Check financial data completeness
  IF listing.monthly_revenue IS NULL THEN score := score - 5; END IF;
  IF listing.monthly_profit IS NULL THEN score := score - 5; END IF;
  
  -- Check multiple validity
  IF listing.profit_multiple IS NOT NULL THEN
    IF listing.profit_multiple < 0.1 OR listing.profit_multiple > 100 THEN
      score := score - 10;
    END IF;
  END IF;
  
  -- Check if verified
  IF listing.is_verified THEN score := score + 10; END IF;
  
  -- Ensure score is between 0 and 100
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Function to update industry statistics from listings
CREATE OR REPLACE FUNCTION update_industry_statistics(target_date DATE)
RETURNS void AS $$
DECLARE
  industry_rec RECORD;
BEGIN
  -- Loop through each industry
  FOR industry_rec IN 
    SELECT DISTINCT industry 
    FROM flippa_listings 
    WHERE is_active = TRUE 
      AND industry IS NOT NULL
  LOOP
    -- Calculate and insert/update statistics
    INSERT INTO industry_statistics_daily (
      date,
      industry,
      total_listings,
      new_listings,
      avg_asking_price,
      median_asking_price,
      min_asking_price,
      max_asking_price,
      avg_revenue_multiple,
      median_revenue_multiple,
      avg_profit_multiple,
      median_profit_multiple
    )
    SELECT
      target_date,
      industry_rec.industry,
      COUNT(*),
      COUNT(*) FILTER (WHERE DATE(listing_date) = target_date),
      AVG(asking_price)::BIGINT,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY asking_price)::BIGINT,
      MIN(asking_price),
      MAX(asking_price),
      AVG(revenue_multiple) FILTER (WHERE revenue_multiple > 0 AND revenue_multiple < 100),
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue_multiple) FILTER (WHERE revenue_multiple > 0 AND revenue_multiple < 100),
      AVG(profit_multiple) FILTER (WHERE profit_multiple > 0 AND profit_multiple < 100),
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY profit_multiple) FILTER (WHERE profit_multiple > 0 AND profit_multiple < 100)
    FROM flippa_listings
    WHERE industry = industry_rec.industry
      AND is_active = TRUE
      AND scraped_at::DATE = target_date
    ON CONFLICT (date, industry) DO UPDATE SET
      total_listings = EXCLUDED.total_listings,
      new_listings = EXCLUDED.new_listings,
      avg_asking_price = EXCLUDED.avg_asking_price,
      median_asking_price = EXCLUDED.median_asking_price,
      min_asking_price = EXCLUDED.min_asking_price,
      max_asking_price = EXCLUDED.max_asking_price,
      avg_revenue_multiple = EXCLUDED.avg_revenue_multiple,
      median_revenue_multiple = EXCLUDED.median_revenue_multiple,
      avg_profit_multiple = EXCLUDED.avg_profit_multiple,
      median_profit_multiple = EXCLUDED.median_profit_multiple,
      updated_at = NOW();
  END LOOP;
  
  -- Update the main time series table for backwards compatibility
  INSERT INTO industry_multiples_timeseries (
    industry,
    date,
    avg_profit_multiple,
    avg_revenue_multiple,
    transaction_count,
    total_volume
  )
  SELECT
    industry,
    date,
    avg_profit_multiple,
    avg_revenue_multiple,
    total_listings,
    avg_asking_price * total_listings
  FROM industry_statistics_daily
  WHERE date = target_date
  ON CONFLICT (industry, date) DO UPDATE SET
    avg_profit_multiple = EXCLUDED.avg_profit_multiple,
    avg_revenue_multiple = EXCLUDED.avg_revenue_multiple,
    transaction_count = EXCLUDED.transaction_count,
    total_volume = EXCLUDED.total_volume,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE flippa_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flippa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_statistics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access for listings and statistics
CREATE POLICY "Public can view active listings" ON flippa_listings
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view categories" ON flippa_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view statistics" ON industry_statistics_daily
  FOR SELECT USING (true);

-- Admin access for scraping jobs (requires authenticated user with admin role)
CREATE POLICY "Admins can manage scraping jobs" ON scraping_jobs
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can view metrics" ON scraping_metrics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );