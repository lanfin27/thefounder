-- Add claps and comments_count columns to posts table
-- Migration: 20251111_add_claps_and_comments

-- Add columns if they don't exist
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS claps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_claps ON posts(claps DESC);
CREATE INDEX IF NOT EXISTS idx_posts_comments_count ON posts(comments_count DESC);

-- Create post_claps table for tracking individual user claps
CREATE TABLE IF NOT EXISTS post_claps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  clap_count INTEGER DEFAULT 1 CHECK (clap_count >= 0 AND clap_count <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraints
-- One record per user per post
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_claps_user
ON post_claps(post_id, user_id)
WHERE user_id IS NOT NULL;

-- One record per session per post (for non-logged-in users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_claps_session
ON post_claps(post_id, session_id)
WHERE session_id IS NOT NULL;

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_post_claps_post_id ON post_claps(post_id);
CREATE INDEX IF NOT EXISTS idx_post_claps_user_id ON post_claps(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE post_claps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_claps
-- Allow anyone to read clap counts
CREATE POLICY "Anyone can read post claps"
ON post_claps FOR SELECT
USING (true);

-- Allow anyone to insert their own claps
CREATE POLICY "Anyone can insert claps"
ON post_claps FOR INSERT
WITH CHECK (true);

-- Allow users to update their own claps
CREATE POLICY "Users can update own claps"
ON post_claps FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Create function to increment post claps
CREATE OR REPLACE FUNCTION increment_post_claps(p_post_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET claps = claps + 1
  WHERE id = p_post_id OR slug = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update total claps from post_claps
CREATE OR REPLACE FUNCTION update_post_total_claps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE posts
    SET claps = (
      SELECT COALESCE(SUM(clap_count), 0)
      FROM post_claps
      WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id OR slug = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET claps = (
      SELECT COALESCE(SUM(clap_count), 0)
      FROM post_claps
      WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id OR slug = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update total claps
DROP TRIGGER IF EXISTS update_post_claps_trigger ON post_claps;
CREATE TRIGGER update_post_claps_trigger
AFTER INSERT OR UPDATE OR DELETE ON post_claps
FOR EACH ROW
EXECUTE FUNCTION update_post_total_claps();

-- Grant permissions
GRANT SELECT ON post_claps TO anon, authenticated;
GRANT INSERT, UPDATE ON post_claps TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_post_claps TO anon, authenticated;
