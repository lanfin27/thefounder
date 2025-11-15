-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Founder Picks System - Fixed Migration
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Posts.id type: TEXT
-- Created: 2025-11-15
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Table: featured_founder_picks
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS featured_founder_picks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Check constraint: display_order must be 1-3
  CONSTRAINT valid_display_order CHECK (display_order BETWEEN 1 AND 3),

  -- Foreign key constraint
  CONSTRAINT fk_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Unique Indexes (Partial indexes with WHERE clause)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Only one active pick per display_order
CREATE UNIQUE INDEX idx_unique_active_display_order
  ON featured_founder_picks (display_order)
  WHERE is_active = true;

-- Same post cannot be featured multiple times (only active)
CREATE UNIQUE INDEX idx_unique_active_post
  ON featured_founder_picks (post_id)
  WHERE is_active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Regular Indexes for performance
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX idx_featured_picks_active
  ON featured_founder_picks(is_active, display_order);

CREATE INDEX idx_featured_picks_post
  ON featured_founder_picks(post_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Trigger: Auto-update updated_at timestamp
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Row Level Security (RLS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE featured_founder_picks ENABLE ROW LEVEL SECURITY;

-- Public read access for active picks
CREATE POLICY "Anyone can view active founder picks"
  ON featured_founder_picks FOR SELECT
  TO public
  USING (is_active = true);

-- Only admins can modify
CREATE POLICY "Only admins can modify founder picks"
  ON featured_founder_picks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Helper View: founder_picks_with_posts
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. Comments for documentation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMENT ON TABLE featured_founder_picks IS 'Stores 3 featured founder picks displayed on main page sidebar';
COMMENT ON COLUMN featured_founder_picks.post_id IS 'Foreign key to posts table (TEXT type)';
COMMENT ON COLUMN featured_founder_picks.display_order IS 'Display order (1-3)';
COMMENT ON COLUMN featured_founder_picks.is_active IS 'Whether this pick is currently active';
COMMENT ON VIEW founder_picks_with_posts IS 'View combining founder picks with post details for easy querying';
