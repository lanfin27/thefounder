-- Create flippa_listings table
CREATE TABLE IF NOT EXISTS flippa_listings (
  id BIGSERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL,
  title TEXT,
  price BIGINT,
  monthly_revenue BIGINT,
  multiple DECIMAL(10,2),
  multiple_text TEXT,
  property_type TEXT,
  category TEXT,
  badges TEXT[] DEFAULT '{}',
  url TEXT,
  quality_score INTEGER DEFAULT 0,
  extraction_confidence DECIMAL(3,2) DEFAULT 0.95,
  page_number INTEGER DEFAULT 1,
  extraction_timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'flippa',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scraping_sessions table
CREATE TABLE IF NOT EXISTS scraping_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  total_listings INTEGER,
  pages_processed INTEGER,
  success_rate DECIMAL,
  processing_time INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_flippa_listings_listing_id ON flippa_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_extraction_timestamp ON flippa_listings(extraction_timestamp);
CREATE INDEX IF NOT EXISTS idx_flippa_listings_quality_score ON flippa_listings(quality_score);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_session_id ON scraping_sessions(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE flippa_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Public read access" ON flippa_listings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON scraping_sessions FOR SELECT USING (true);

-- Add unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_flippa_listings_unique ON flippa_listings(listing_id, extraction_timestamp);