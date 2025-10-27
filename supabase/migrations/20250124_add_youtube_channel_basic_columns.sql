-- YouTube Industry - Add Missing Basic Columns to youtube_channels Table
-- Migration: 20250124_add_youtube_channel_basic_columns
-- Purpose: Fix PGRST204 error by adding missing columns that youtube-service.ts expects
--
-- Root Cause: youtube-service.ts tries to update columns that don't exist in youtube_channels table
-- This migration adds: title, description, thumbnail_url, subscribers, total_views, video_count, updated_at

-- Add missing basic columns to youtube_channels table
DO $$
BEGIN
  -- title: 채널 이름
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'title'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN title VARCHAR(255);
    COMMENT ON COLUMN youtube_channels.title IS 'Channel title/name from YouTube';
    RAISE NOTICE 'Added column: title';
  ELSE
    RAISE NOTICE 'Column already exists: title';
  END IF;

  -- description: 채널 설명 (CRITICAL - causing PGRST204 error)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'description'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN description TEXT;
    COMMENT ON COLUMN youtube_channels.description IS 'Channel description from YouTube snippet';
    RAISE NOTICE 'Added column: description';
  ELSE
    RAISE NOTICE 'Column already exists: description';
  END IF;

  -- thumbnail_url: 채널 썸네일 URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN thumbnail_url TEXT;
    COMMENT ON COLUMN youtube_channels.thumbnail_url IS 'Channel thumbnail URL from YouTube';
    RAISE NOTICE 'Added column: thumbnail_url';
  ELSE
    RAISE NOTICE 'Column already exists: thumbnail_url';
  END IF;

  -- subscribers: 구독자 수
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'subscribers'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN subscribers BIGINT DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.subscribers IS 'Total subscriber count';
    RAISE NOTICE 'Added column: subscribers';
  ELSE
    RAISE NOTICE 'Column already exists: subscribers';
  END IF;

  -- total_views: 총 조회수
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'total_views'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN total_views BIGINT DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.total_views IS 'Total channel view count';
    RAISE NOTICE 'Added column: total_views';
  ELSE
    RAISE NOTICE 'Column already exists: total_views';
  END IF;

  -- video_count: 영상 개수
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'video_count'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN video_count BIGINT DEFAULT 0;
    COMMENT ON COLUMN youtube_channels.video_count IS 'Total number of videos published';
    RAISE NOTICE 'Added column: video_count';
  ELSE
    RAISE NOTICE 'Column already exists: video_count';
  END IF;

  -- updated_at: 마지막 업데이트 시간 (different from last_updated added in another migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    COMMENT ON COLUMN youtube_channels.updated_at IS 'Last time this record was updated';
    RAISE NOTICE 'Added column: updated_at';
  ELSE
    RAISE NOTICE 'Column already exists: updated_at';
  END IF;

END $$;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_youtube_channels_title
  ON youtube_channels(title);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_subscribers
  ON youtube_channels(subscribers DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_total_views
  ON youtube_channels(total_views DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_video_count
  ON youtube_channels(video_count DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_updated_at
  ON youtube_channels(updated_at DESC);

-- Auto-update updated_at column on any UPDATE
CREATE OR REPLACE FUNCTION update_youtube_channels_updated_at()
RETURNS TRIGGER AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate (idempotent)
DROP TRIGGER IF EXISTS update_youtube_channels_updated_at_trigger ON youtube_channels;
CREATE TRIGGER update_youtube_channels_updated_at_trigger
  BEFORE UPDATE ON youtube_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_youtube_channels_updated_at();

-- Success message
SELECT 'YouTube channels basic columns migration completed successfully!
All missing columns have been added.' AS status;
