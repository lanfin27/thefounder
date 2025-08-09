-- Create scraping_sessions table for tracking scraping performance
CREATE TABLE IF NOT EXISTS scraping_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  total_listings INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  success_rate INTEGER DEFAULT 0,
  processing_time BIGINT DEFAULT 0,
  method TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_scraping_sessions_session_id ON scraping_sessions(session_id);
CREATE INDEX idx_scraping_sessions_created_at ON scraping_sessions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view scraping sessions
CREATE POLICY "Allow authenticated users to view scraping sessions" ON scraping_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow service role to manage scraping sessions
CREATE POLICY "Allow service role to manage scraping sessions" ON scraping_sessions
  FOR ALL
  TO service_role
  USING (true);