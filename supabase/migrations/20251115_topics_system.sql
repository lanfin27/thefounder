-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Topics System: Featured Topics & Auto Counting
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Purpose:
--   1. Auto-count posts for each topic
--   2. Admin selects 8 featured topics for homepage
--   3. Medium-style all topics page
--
-- Created: 2025-11-15
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Drop existing objects if they exist
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP VIEW IF EXISTS topic_counts CASCADE;
DROP TABLE IF EXISTS featured_topics CASCADE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Create featured_topics table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE featured_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_name TEXT NOT NULL UNIQUE,  -- Topic name (Korean or English)
  display_order INTEGER NOT NULL,   -- Display order (1-8)
  is_active BOOLEAN DEFAULT true,   -- Active status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: display_order must be between 1 and 8
  CONSTRAINT valid_display_order CHECK (display_order BETWEEN 1 AND 8)
);

-- Create indexes
CREATE INDEX idx_featured_topics_active ON featured_topics(is_active, display_order);
CREATE INDEX idx_featured_topics_name ON featured_topics(topic_name);

-- Enable RLS
ALTER TABLE featured_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active featured topics
CREATE POLICY "Anyone can view featured topics"
  ON featured_topics FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policy: Only admins can modify featured topics
CREATE POLICY "Only admins can modify featured topics"
  ON featured_topics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Create topic_counts view (for TEXT[] array)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW topic_counts AS
SELECT
  UNNEST(tags) AS topic_name,  -- Unnest array to individual rows
  COUNT(*) AS post_count
FROM posts
WHERE
  status IN ('published', '발행')  -- Only published posts
  AND tags IS NOT NULL
  AND array_length(tags, 1) > 0
GROUP BY UNNEST(tags)
ORDER BY post_count DESC, topic_name ASC;

-- Grant permissions
GRANT SELECT ON topic_counts TO anon, authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Insert initial featured topics (from existing RightSidebar.tsx)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO featured_topics (topic_name, display_order, is_active)
VALUES
  ('스타트업', 1, true),
  ('AI', 2, true),
  ('SaaS', 3, true),
  ('마케팅', 4, true),
  ('제품개발', 5, true),
  ('성장전략', 6, true),
  ('투자유치', 7, true),
  ('1인창업', 8, true)
ON CONFLICT (topic_name) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Create function to refresh featured topics order
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_featured_topics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER featured_topics_update_timestamp
  BEFORE UPDATE ON featured_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_topics_timestamp();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Verification queries (commented for reference)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check featured topics
-- SELECT * FROM featured_topics ORDER BY display_order;

-- Check all topics with counts
-- SELECT * FROM topic_counts LIMIT 20;

-- Check specific topic count
-- SELECT * FROM topic_counts WHERE topic_name = 'AI';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration Complete!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
