-- create-table-if-not-exists.sql
-- Create scraping_sessions table with all required columns from scratch

-- Drop and recreate the table with all required columns
DROP TABLE IF EXISTS scraping_sessions CASCADE;

CREATE TABLE scraping_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  method TEXT,
  status TEXT DEFAULT 'pending',
  total_listings INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  failed_extractions INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 0,
  success_rate INTEGER DEFAULT 0,
  extraction_rate NUMERIC(8,2) DEFAULT 0.0,
  processing_time BIGINT DEFAULT 0,
  stealth_level TEXT DEFAULT 'basic',
  browser_type TEXT DEFAULT 'chromium',
  browser_library TEXT DEFAULT 'playwright',
  persona_name TEXT,
  session_type TEXT DEFAULT 'standard',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  error_messages TEXT[],
  final_metrics JSONB,
  fallbacks_used TEXT[],
  interaction_count INTEGER DEFAULT 0,
  captcha_solved INTEGER DEFAULT 0,
  stealth_features_applied TEXT[],
  user_agent TEXT,
  viewport_size TEXT DEFAULT '1366x768',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_scraping_sessions_session_id ON scraping_sessions(session_id);
CREATE INDEX idx_scraping_sessions_created_at ON scraping_sessions(created_at DESC);
CREATE INDEX idx_scraping_sessions_status ON scraping_sessions(status);
CREATE INDEX idx_scraping_sessions_method ON scraping_sessions(method);
CREATE INDEX idx_scraping_sessions_session_type ON scraping_sessions(session_type);
CREATE INDEX idx_scraping_sessions_browser_library ON scraping_sessions(browser_library);
CREATE INDEX idx_scraping_sessions_stealth_level ON scraping_sessions(stealth_level);
CREATE INDEX idx_scraping_sessions_last_activity ON scraping_sessions(last_activity DESC);
CREATE INDEX idx_scraping_sessions_extraction_rate ON scraping_sessions(extraction_rate DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view scraping sessions" ON scraping_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage scraping sessions" ON scraping_sessions
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow authenticated users to insert scraping sessions" ON scraping_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update scraping sessions" ON scraping_sessions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create scraped_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS scraped_data (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES scraping_sessions(session_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  data JSONB NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL,
  extraction_method TEXT,
  page_number INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  stealth_features TEXT[],
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for scraped_data
CREATE INDEX IF NOT EXISTS idx_scraped_data_session_id ON scraped_data(session_id);
CREATE INDEX IF NOT EXISTS idx_scraped_data_url ON scraped_data(url);
CREATE INDEX IF NOT EXISTS idx_scraped_data_scraped_at ON scraped_data(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_data_source ON scraped_data(source);
CREATE INDEX IF NOT EXISTS idx_scraped_data_success ON scraped_data(success);

-- Enable RLS on scraped_data
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;

-- Create policies for scraped_data
CREATE POLICY "Allow authenticated users to view scraped data" ON scraped_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage scraped data" ON scraped_data
  FOR ALL
  TO service_role
  USING (true);

-- Create enhanced view
CREATE OR REPLACE VIEW scraping_sessions_enhanced AS
SELECT 
  *,
  -- Calculate success rate
  CASE 
    WHEN (successful_extractions + failed_extractions) > 0 
    THEN ROUND((successful_extractions::numeric / (successful_extractions + failed_extractions)::numeric) * 100, 2)
    ELSE 0.0 
  END as success_rate_percentage,
  
  -- Calculate duration in minutes
  CASE 
    WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 60
    WHEN processing_time > 0
    THEN processing_time::numeric / 1000 / 60
    ELSE 0.0
  END as duration_minutes,
  
  -- Status categories
  CASE 
    WHEN status IN ('completed', 'success') THEN 'completed'
    WHEN status IN ('running', 'in_progress', 'active') THEN 'active'
    WHEN status IN ('error', 'failed') THEN 'failed'
    WHEN status IN ('pending', 'initializing') THEN 'pending'
    ELSE 'unknown'
  END as status_category,
  
  -- Performance tier
  CASE 
    WHEN extraction_rate >= 100 THEN 'high'
    WHEN extraction_rate >= 50 THEN 'medium'
    WHEN extraction_rate >= 20 THEN 'low'
    ELSE 'very_low'
  END as performance_tier

FROM scraping_sessions;

-- Create trigger to update last_activity automatically
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = CURRENT_TIMESTAMP;
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_activity ON scraping_sessions;
CREATE TRIGGER trigger_update_last_activity
  BEFORE UPDATE ON scraping_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- Add comments for documentation
COMMENT ON TABLE scraping_sessions IS 'Enhanced scraping sessions table with support for browser automation, stealth features, and comprehensive metrics';
COMMENT ON COLUMN scraping_sessions.failed_extractions IS 'Number of failed extraction attempts during the session';
COMMENT ON COLUMN scraping_sessions.successful_extractions IS 'Number of successful extractions during the session';
COMMENT ON COLUMN scraping_sessions.extraction_rate IS 'Items extracted per minute';
COMMENT ON COLUMN scraping_sessions.stealth_level IS 'Stealth level used: none, basic, enhanced, advanced, maximum';
COMMENT ON COLUMN scraping_sessions.browser_library IS 'Browser automation library: playwright, puppeteer';
COMMENT ON COLUMN scraping_sessions.session_type IS 'Type of scraping session: standard, high-performance, premium, enhanced';