-- Create posts table for caching Notion content
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT,
  cover TEXT,
  author TEXT,
  category TEXT CHECK (category IN ('뉴스레터', 'SaaS', '블로그', '창업')),
  tags TEXT[],
  is_premium BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('초안', '검토중', '발행')),
  published_date TIMESTAMP,
  reading_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_published_date ON posts(published_date DESC);
CREATE INDEX idx_posts_status ON posts(status);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (status = '발행');

CREATE POLICY "Service role can insert posts" ON posts
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can update posts" ON posts
  FOR UPDATE WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can delete posts" ON posts
  FOR DELETE USING (
    auth.role() = 'service_role' OR 
    auth.jwt() ->> 'role' = 'service_role'
  );