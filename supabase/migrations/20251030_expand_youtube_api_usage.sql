-- ============================================
-- YouTube API Usage Tracking System - Expansion
-- ============================================
-- Created: 2025-10-30
-- Purpose: Add log management and incremental update support
-- ============================================

-- 1. Add new columns to youtube_api_usage table
ALTER TABLE youtube_api_usage
  ADD COLUMN IF NOT EXISTS update_type VARCHAR(50) DEFAULT 'single',
  -- 'single', 'bulk_full', 'bulk_incremental', 'simulation'
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  -- UUID for batch operations
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  -- Operation duration in milliseconds
  ADD COLUMN IF NOT EXISTS videos_processed INTEGER DEFAULT 0,
  -- Total videos processed
  ADD COLUMN IF NOT EXISTS new_videos INTEGER DEFAULT 0,
  -- New videos added (for incremental updates)
  ADD COLUMN IF NOT EXISTS api_calls_made INTEGER DEFAULT 0,
  -- Number of individual API calls
  ADD COLUMN IF NOT EXISTS response_data JSONB,
  -- Store API response for debugging
  ADD COLUMN IF NOT EXISTS user_id UUID,
  -- User who initiated the operation
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  -- Additional metadata

-- 2. Create additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_update_type ON youtube_api_usage(update_type);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_batch_id ON youtube_api_usage(batch_id);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_user_id ON youtube_api_usage(user_id);

-- 3. Update operation_type comment to include new types
COMMENT ON COLUMN youtube_api_usage.update_type IS 'Update type: single, bulk_full, bulk_incremental, simulation';
COMMENT ON COLUMN youtube_api_usage.batch_id IS 'UUID for grouping batch operations';
COMMENT ON COLUMN youtube_api_usage.duration_ms IS 'Operation duration in milliseconds';
COMMENT ON COLUMN youtube_api_usage.videos_processed IS 'Total number of videos processed';
COMMENT ON COLUMN youtube_api_usage.new_videos IS 'Number of new videos added (incremental updates)';
COMMENT ON COLUMN youtube_api_usage.api_calls_made IS 'Number of individual API calls made';
COMMENT ON COLUMN youtube_api_usage.response_data IS 'JSONB storage of API response for debugging';

-- 4. Create view: API Usage by Type
CREATE OR REPLACE VIEW youtube_api_usage_by_type AS
SELECT
  date,
  update_type,
  operation_type,
  COUNT(*) as operation_count,
  SUM(units_used) as total_units,
  AVG(duration_ms) as avg_duration_ms,
  SUM(videos_processed) as total_videos_processed,
  SUM(new_videos) as total_new_videos,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as failure_count
FROM youtube_api_usage
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date, update_type, operation_type
ORDER BY date DESC, update_type;

-- 5. Create view: Channel Update History
CREATE OR REPLACE VIEW channel_update_history AS
SELECT
  channel_id,
  channel_name,
  update_type,
  operation_type,
  date,
  created_at,
  units_used,
  duration_ms,
  videos_processed,
  new_videos,
  success,
  error_message,
  batch_id
FROM youtube_api_usage
WHERE channel_id IS NOT NULL
ORDER BY created_at DESC;

-- 6. Create view: Batch Update Summary
CREATE OR REPLACE VIEW batch_update_summary AS
SELECT
  batch_id,
  MIN(created_at) as batch_start,
  MAX(created_at) as batch_end,
  update_type,
  COUNT(*) as channels_processed,
  SUM(units_used) as total_units_used,
  AVG(duration_ms) as avg_duration_ms,
  SUM(videos_processed) as total_videos,
  SUM(new_videos) as total_new_videos,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as failure_count
FROM youtube_api_usage
WHERE batch_id IS NOT NULL
GROUP BY batch_id, update_type
ORDER BY batch_start DESC;

-- 7. Create function to calculate incremental update cost
CREATE OR REPLACE FUNCTION calculate_incremental_cost(
  p_channel_id VARCHAR(255),
  p_last_video_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  estimated_cost INTEGER,
  estimated_new_videos INTEGER,
  channel_list_cost INTEGER,
  search_cost INTEGER,
  videos_cost INTEGER
) AS $$
DECLARE
  v_channel_list_cost INTEGER := 1;     -- channels.list = 1 unit
  v_search_cost INTEGER;                -- search.list = 100 units per call
  v_videos_cost INTEGER;                -- videos.list = 1 unit per 50 videos
  v_estimated_new_videos INTEGER;
  v_total_cost INTEGER;
BEGIN
  -- Estimate new videos (conservative estimate: 1-10 new videos per day)
  -- For simplicity, assume average 5 new videos since last update
  v_estimated_new_videos := LEAST(50, GREATEST(1, p_last_video_count / 10));

  -- Calculate search cost (1 call for recent videos)
  v_search_cost := 100;

  -- Calculate videos.list cost (1 unit per 50 videos, minimum 1)
  v_videos_cost := GREATEST(1, CEIL(v_estimated_new_videos::numeric / 50));

  -- Total cost
  v_total_cost := v_channel_list_cost + v_search_cost + v_videos_cost;

  RETURN QUERY SELECT
    v_total_cost,
    v_estimated_new_videos,
    v_channel_list_cost,
    v_search_cost,
    v_videos_cost;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get channel last update info
CREATE OR REPLACE FUNCTION get_channel_last_update(p_channel_id VARCHAR(255))
RETURNS TABLE(
  last_update_date TIMESTAMPTZ,
  last_videos_count INTEGER,
  days_since_update INTEGER,
  update_type VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at,
    videos_processed,
    EXTRACT(DAY FROM NOW() - created_at)::INTEGER,
    youtube_api_usage.update_type
  FROM youtube_api_usage
  WHERE channel_id = p_channel_id
    AND success = true
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to simulate batch update
CREATE OR REPLACE FUNCTION simulate_batch_update(
  p_channel_ids VARCHAR(255)[],
  p_update_type VARCHAR(50) DEFAULT 'bulk_full'
)
RETURNS TABLE(
  total_channels INTEGER,
  estimated_total_cost INTEGER,
  estimated_full_cost INTEGER,
  estimated_incremental_cost INTEGER,
  potential_savings INTEGER,
  potential_savings_percentage NUMERIC
) AS $$
DECLARE
  v_full_cost_per_channel INTEGER := 506;
  v_incremental_cost_per_channel INTEGER := 102; -- Average incremental cost
  v_total_channels INTEGER;
  v_estimated_full INTEGER;
  v_estimated_incremental INTEGER;
  v_estimated_total INTEGER;
  v_savings INTEGER;
  v_savings_pct NUMERIC;
BEGIN
  v_total_channels := array_length(p_channel_ids, 1);
  v_estimated_full := v_total_channels * v_full_cost_per_channel;
  v_estimated_incremental := v_total_channels * v_incremental_cost_per_channel;

  IF p_update_type = 'bulk_full' THEN
    v_estimated_total := v_estimated_full;
  ELSE
    v_estimated_total := v_estimated_incremental;
  END IF;

  v_savings := v_estimated_full - v_estimated_incremental;
  v_savings_pct := (v_savings::NUMERIC / v_estimated_full::NUMERIC) * 100;

  RETURN QUERY SELECT
    v_total_channels,
    v_estimated_total,
    v_estimated_full,
    v_estimated_incremental,
    v_savings,
    ROUND(v_savings_pct, 2);
END;
$$ LANGUAGE plpgsql;

-- 10. Add comments for new views and functions
COMMENT ON VIEW youtube_api_usage_by_type IS 'API usage statistics grouped by date and update type';
COMMENT ON VIEW channel_update_history IS 'Complete update history for each channel';
COMMENT ON VIEW batch_update_summary IS 'Summary statistics for batch operations';
COMMENT ON FUNCTION calculate_incremental_cost IS 'Calculate estimated cost for incremental channel update';
COMMENT ON FUNCTION get_channel_last_update IS 'Get last successful update information for a channel';
COMMENT ON FUNCTION simulate_batch_update IS 'Simulate and compare full vs incremental batch update costs';

-- ============================================
-- Migration Complete
-- ============================================
-- New columns: update_type, batch_id, duration_ms, videos_processed,
--              new_videos, api_calls_made, response_data, user_id, metadata
-- New views: youtube_api_usage_by_type, channel_update_history,
--            batch_update_summary
-- New functions: calculate_incremental_cost, get_channel_last_update,
--                simulate_batch_update
-- ============================================
