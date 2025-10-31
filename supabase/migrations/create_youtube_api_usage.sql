-- ============================================
-- YouTube API Usage Tracking System
-- ============================================
-- Created: 2025-10-30
-- Purpose: Track YouTube API usage and manage daily quota
-- ============================================

-- 1. Create youtube_api_usage table
CREATE TABLE IF NOT EXISTS youtube_api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  operation_type VARCHAR(50) NOT NULL,
  -- Possible values: 'channel_update', 'video_fetch', 'history_generate', 'bulk_update'
  channel_id VARCHAR(255),
  channel_name VARCHAR(255),
  units_used INTEGER NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_date ON youtube_api_usage(date);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_channel ON youtube_api_usage(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_operation ON youtube_api_usage(operation_type);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_created_at ON youtube_api_usage(created_at);

-- 3. Create daily summary view
CREATE OR REPLACE VIEW daily_api_usage AS
SELECT
  date,
  SUM(units_used) as total_units,
  COUNT(*) as operation_count,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as failure_count
FROM youtube_api_usage
GROUP BY date
ORDER BY date DESC;

-- 4. Create weekly summary view
CREATE OR REPLACE VIEW weekly_api_usage AS
SELECT
  DATE_TRUNC('week', date) as week_start,
  SUM(units_used) as total_units,
  COUNT(*) as operation_count,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as failure_count
FROM youtube_api_usage
GROUP BY DATE_TRUNC('week', date)
ORDER BY week_start DESC;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE youtube_api_usage ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Allow authenticated users to read all records
CREATE POLICY "Allow authenticated read access"
  ON youtube_api_usage
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert records
CREATE POLICY "Allow authenticated insert access"
  ON youtube_api_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update records
CREATE POLICY "Allow authenticated update access"
  ON youtube_api_usage
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Create function to get today's usage
CREATE OR REPLACE FUNCTION get_today_api_usage()
RETURNS INTEGER AS $$
DECLARE
  total_used INTEGER;
BEGIN
  SELECT COALESCE(SUM(units_used), 0)
  INTO total_used
  FROM youtube_api_usage
  WHERE date = CURRENT_DATE;

  RETURN total_used;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get remaining quota
CREATE OR REPLACE FUNCTION get_remaining_quota()
RETURNS INTEGER AS $$
DECLARE
  daily_quota INTEGER := 10000;
  used_today INTEGER;
  remaining INTEGER;
BEGIN
  used_today := get_today_api_usage();
  remaining := daily_quota - used_today;

  RETURN GREATEST(0, remaining);
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to check if update is allowed
CREATE OR REPLACE FUNCTION can_update_channels(channels_count INTEGER)
RETURNS TABLE(
  can_update BOOLEAN,
  max_channels INTEGER,
  remaining INTEGER,
  used_today INTEGER,
  required_units INTEGER
) AS $$
DECLARE
  cost_per_channel INTEGER := 506; -- Average cost per channel update
  quota_remaining INTEGER;
  quota_used INTEGER;
  quota_required INTEGER;
  max_allowed INTEGER;
BEGIN
  quota_used := get_today_api_usage();
  quota_remaining := get_remaining_quota();
  quota_required := channels_count * cost_per_channel;
  max_allowed := quota_remaining / cost_per_channel;

  RETURN QUERY SELECT
    quota_required <= quota_remaining,
    max_allowed,
    quota_remaining,
    quota_used,
    quota_required;
END;
$$ LANGUAGE plpgsql;

-- 10. Add comments for documentation
COMMENT ON TABLE youtube_api_usage IS 'Tracks all YouTube API usage with detailed operation information';
COMMENT ON COLUMN youtube_api_usage.operation_type IS 'Type of operation: channel_update, video_fetch, history_generate, bulk_update';
COMMENT ON COLUMN youtube_api_usage.units_used IS 'Number of API quota units consumed';
COMMENT ON COLUMN youtube_api_usage.success IS 'Whether the operation completed successfully';
COMMENT ON VIEW daily_api_usage IS 'Daily aggregated API usage summary';
COMMENT ON VIEW weekly_api_usage IS 'Weekly aggregated API usage summary';
COMMENT ON FUNCTION get_today_api_usage IS 'Returns total API units used today';
COMMENT ON FUNCTION get_remaining_quota IS 'Returns remaining API quota for today';
COMMENT ON FUNCTION can_update_channels IS 'Checks if sufficient quota exists for bulk updates';

-- 11. Insert initial test record (optional)
-- INSERT INTO youtube_api_usage (
--   operation_type,
--   channel_id,
--   channel_name,
--   units_used,
--   success
-- ) VALUES (
--   'system_init',
--   NULL,
--   'System Initialization',
--   0,
--   true
-- );

-- ============================================
-- Migration Complete
-- ============================================
-- Tables: youtube_api_usage
-- Views: daily_api_usage, weekly_api_usage
-- Functions: get_today_api_usage, get_remaining_quota, can_update_channels
-- ============================================
