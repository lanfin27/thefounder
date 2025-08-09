-- Create scraping_sessions table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS scraping_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  total_listings INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  processing_time BIGINT DEFAULT 0,
  method VARCHAR(100) DEFAULT 'standard',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_created_at ON scraping_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_session_id ON scraping_sessions(session_id);

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

-- Grant permissions
GRANT ALL ON scraping_sessions TO service_role;
GRANT SELECT ON scraping_sessions TO authenticated;