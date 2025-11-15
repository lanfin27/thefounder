-- Migration: Founder Picks System
-- Description: Create table for managing featured founder picks (3 posts on main page)
-- Created: 2025-11-15
-- Posts.id type: TEXT

-- =====================================================
-- 1. Create featured_founder_picks table
-- =====================================================

CREATE TABLE IF NOT EXISTS featured_founder_picks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_display_order CHECK (display_order BETWEEN 1 AND 3),
  CONSTRAINT unique_post_id UNIQUE (post_id),
  CONSTRAINT unique_display_order_active UNIQUE (display_order) WHERE is_active = true,

  -- Foreign key to posts table
  CONSTRAINT fk_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================

CREATE INDEX idx_founder_picks_active ON featured_founder_picks(is_active) WHERE is_active = true;
CREATE INDEX idx_founder_picks_display_order ON featured_founder_picks(display_order);
CREATE INDEX idx_founder_picks_post_id ON featured_founder_picks(post_id);

-- =====================================================
-- 3. Create updated_at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_founder_picks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_founder_picks_updated_at
  BEFORE UPDATE ON featured_founder_picks
  FOR EACH ROW
  EXECUTE FUNCTION update_founder_picks_updated_at();

-- =====================================================
-- 4. Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE featured_founder_picks ENABLE ROW LEVEL SECURITY;

-- Public read access for active picks
CREATE POLICY "Anyone can view active founder picks"
  ON featured_founder_picks
  FOR SELECT
  USING (is_active = true);

-- Admin write access (requires custom role check)
-- Note: Adjust this based on your auth system
CREATE POLICY "Only admins can manage founder picks"
  ON featured_founder_picks
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role = 'admin'
    )
  );

-- =====================================================
-- 5. Insert initial data (optional - no default picks)
-- =====================================================

-- Note: Initially empty, will be populated via Admin UI
-- Admin can select 3 posts from the posts table

-- =====================================================
-- 6. Create helper view for founder picks with post data
-- =====================================================

CREATE OR REPLACE VIEW founder_picks_with_posts AS
SELECT
  fp.id,
  fp.post_id,
  fp.display_order,
  fp.is_active,
  fp.created_at,
  fp.updated_at,
  p.title,
  p.slug,
  p.category,
  p.reading_time,
  p.summary,
  p.cover,
  p.author,
  p.published_date
FROM featured_founder_picks fp
INNER JOIN posts p ON fp.post_id = p.id
WHERE fp.is_active = true
  AND p.status IN ('published', '발행')
ORDER BY fp.display_order ASC;

-- Grant access to view
GRANT SELECT ON founder_picks_with_posts TO anon, authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE featured_founder_picks IS 'Stores 3 featured founder picks displayed on main page sidebar';
COMMENT ON COLUMN featured_founder_picks.post_id IS 'Foreign key to posts table';
COMMENT ON COLUMN featured_founder_picks.display_order IS 'Display order (1-3)';
COMMENT ON COLUMN featured_founder_picks.is_active IS 'Whether this pick is currently active';
COMMENT ON VIEW founder_picks_with_posts IS 'View combining founder picks with post details for easy querying';
