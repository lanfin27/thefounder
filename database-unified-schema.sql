-- unified-schema.sql
-- Single source of truth for all database tables

-- Drop existing tables to avoid conflicts
DROP TABLE IF EXISTS scraped_data CASCADE;
DROP TABLE IF EXISTS scraping_sessions CASCADE;
DROP TABLE IF EXISTS flippa_listings CASCADE;

-- Core scraping sessions table
CREATE TABLE scraping_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  method TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'pending',
  total_listings INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  failed_extractions INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  success_rate INTEGER DEFAULT 0,
  processing_time BIGINT DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Flippa listings table (simplified)
CREATE TABLE flippa_listings (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES scraping_sessions(session_id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT,
  asking_price BIGINT,
  monthly_revenue BIGINT,
  monthly_profit BIGINT,
  age_months INTEGER,
  page_views_monthly BIGINT,
  category TEXT,
  description TEXT,
  technologies TEXT[],
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_scraping_sessions_status ON scraping_sessions(status);
CREATE INDEX idx_scraping_sessions_created_at ON scraping_sessions(created_at DESC);
CREATE INDEX idx_flippa_listings_session_id ON flippa_listings(session_id);
CREATE INDEX idx_flippa_listings_scraped_at ON flippa_listings(scraped_at DESC);
CREATE INDEX idx_flippa_listings_asking_price ON flippa_listings(asking_price DESC);

-- Enable Row Level Security
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flippa_listings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all operations for service role" ON scraping_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow all operations for service role" ON flippa_listings FOR ALL TO service_role USING (true);
CREATE POLICY "Allow authenticated read access" ON scraping_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON flippa_listings FOR SELECT TO authenticated USING (true);
