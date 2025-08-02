-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS flippa_listings CASCADE;
DROP TABLE IF EXISTS scraping_sessions CASCADE;

-- Create flippa_listings table with proper constraints
CREATE TABLE flippa_listings (
  id BIGSERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  price BIGINT,
  monthly_revenue BIGINT,
  multiple NUMERIC(10,2),
  multiple_text TEXT DEFAULT '',
  property_type TEXT DEFAULT '',
  category TEXT DEFAULT '',
  badges TEXT[] DEFAULT ARRAY[]::TEXT[],
  url TEXT DEFAULT '',
  quality_score INTEGER DEFAULT 0,
  extraction_confidence NUMERIC(3,2) DEFAULT 0.95,
  page_number INTEGER DEFAULT 1,
  extraction_timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'flippa',
  raw_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scraping_sessions table
CREATE TABLE scraping_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  total_listings INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  configuration JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_flippa_listings_listing_id ON flippa_listings(listing_id);
CREATE INDEX idx_flippa_listings_extraction_timestamp ON flippa_listings(extraction_timestamp DESC);
CREATE INDEX idx_flippa_listings_quality_score ON flippa_listings(quality_score DESC);
CREATE INDEX idx_flippa_listings_price ON flippa_listings(price) WHERE price IS NOT NULL;
CREATE INDEX idx_flippa_listings_monthly_revenue ON flippa_listings(monthly_revenue) WHERE monthly_revenue IS NOT NULL;
CREATE INDEX idx_scraping_sessions_session_id ON scraping_sessions(session_id);
CREATE INDEX idx_scraping_sessions_completed_at ON scraping_sessions(completed_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE flippa_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access" ON flippa_listings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON scraping_sessions FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access" ON flippa_listings 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access" ON scraping_sessions 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE flippa_listings IS 'Stores scraped Flippa business listings with metadata';
COMMENT ON TABLE scraping_sessions IS 'Tracks scraping session performance and configuration';

-- Grant permissions (adjust based on your roles)
GRANT SELECT ON flippa_listings TO anon;
GRANT SELECT ON scraping_sessions TO anon;
GRANT ALL ON flippa_listings TO service_role;
GRANT ALL ON scraping_sessions TO service_role;
GRANT USAGE ON SEQUENCE flippa_listings_id_seq TO service_role;
GRANT USAGE ON SEQUENCE scraping_sessions_id_seq TO service_role;