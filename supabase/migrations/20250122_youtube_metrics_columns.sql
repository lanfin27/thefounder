-- YouTube Industry Dashboard - Add Metrics Columns
-- Migration: 20250122_youtube_metrics_columns
-- Purpose: Add missing columns for views per video, change rates, engagement, and shorts ratio

-- Add columns to youtube_channels table
DO $$
BEGIN
  -- views_per_video: 영상당 조회수
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'views_per_video'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN views_per_video BIGINT DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.views_per_video IS 'Average views per video';
  END IF;

  -- daily_change_rate: 일간 변화율 (%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'daily_change_rate'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN daily_change_rate DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.daily_change_rate IS 'Daily change rate in percentage';
  END IF;

  -- weekly_change_rate: 주간 변화율 (%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'weekly_change_rate'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN weekly_change_rate DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.weekly_change_rate IS 'Weekly change rate in percentage';
  END IF;

  -- engagement_rate: 참여율 (%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'engagement_rate'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN engagement_rate DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.engagement_rate IS 'Engagement rate in percentage';
  END IF;

  -- shorts_ratio: Shorts 비율 (%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'shorts_ratio'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN shorts_ratio DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.shorts_ratio IS 'Shorts content ratio in percentage';
  END IF;

  -- last_updated: 마지막 업데이트 시간
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'last_updated'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN last_updated TIMESTAMP DEFAULT NOW();
    COMMENT ON COLUMN youtube_channels.last_updated IS 'Last data update timestamp';
  END IF;
END $$;

-- Add columns to youtube_categories table
DO $$
BEGIN
  -- avg_views_per_video: 카테고리 평균 영상당 조회수
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_categories' AND column_name = 'avg_views_per_video'
  ) THEN
    ALTER TABLE youtube_categories ADD COLUMN avg_views_per_video BIGINT DEFAULT 0;
    COMMENT ON COLUMN youtube_categories.avg_views_per_video IS 'Category average views per video';
  END IF;

  -- daily_change_rate: 카테고리 일간 변화율 (%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_categories' AND column_name = 'daily_change_rate'
  ) THEN
    ALTER TABLE youtube_categories ADD COLUMN daily_change_rate DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN youtube_categories.daily_change_rate IS 'Category daily change rate in percentage';
  END IF;

  -- weekly_change_rate: 카테고리 주간 변화율 (%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_categories' AND column_name = 'weekly_change_rate'
  ) THEN
    ALTER TABLE youtube_categories ADD COLUMN weekly_change_rate DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN youtube_categories.weekly_change_rate IS 'Category weekly change rate in percentage';
  END IF;

  -- updated_at: 마지막 업데이트 시간
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_categories' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE youtube_categories ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    COMMENT ON COLUMN youtube_categories.updated_at IS 'Last data update timestamp';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_youtube_channels_daily_change
  ON youtube_channels(daily_change_rate DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_views_per_video
  ON youtube_channels(views_per_video DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_engagement
  ON youtube_channels(engagement_rate DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_categories_daily_change
  ON youtube_categories(daily_change_rate DESC);

-- Success message
SELECT 'YouTube metrics columns added successfully!' AS status;
