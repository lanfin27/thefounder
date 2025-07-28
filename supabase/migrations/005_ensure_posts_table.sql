-- Ensure posts table exists with correct schema
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT,
  cover TEXT,
  author TEXT,
  category TEXT CHECK (category IN ('뉴스레터', 'SaaS', '블로그', '창업')),
  tags TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('초안', '검토중', '발행')),
  published_date TIMESTAMP,
  reading_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_published_date ON posts(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Enable RLS if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Service role can insert posts" ON posts;
DROP POLICY IF EXISTS "Service role can update posts" ON posts;
DROP POLICY IF EXISTS "Service role can delete posts" ON posts;

-- Recreate RLS Policies
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (status = '발행');

CREATE POLICY "Service role can insert posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update posts" ON posts
  FOR UPDATE WITH CHECK (true);

CREATE POLICY "Service role can delete posts" ON posts
  FOR DELETE USING (true);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();