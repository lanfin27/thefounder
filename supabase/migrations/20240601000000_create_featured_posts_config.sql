-- Create table for featured posts configuration
CREATE TABLE IF NOT EXISTS featured_posts_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 1: Main (Large), 2-4: Sub (Small)
  focal_point_x DECIMAL(5,2) DEFAULT 50, -- Percentage (0-100)
  focal_point_y DECIMAL(5,2) DEFAULT 50, -- Percentage (0-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(position) -- Ensure only one post per position
);

-- Add RLS policies
ALTER TABLE featured_posts_config ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access" ON featured_posts_config
  FOR SELECT USING (true);

-- Allow full access to authenticated users (admin check should be done in application layer or via custom claim)
CREATE POLICY "Allow authenticated full access" ON featured_posts_config
  FOR ALL USING (auth.role() = 'authenticated');
