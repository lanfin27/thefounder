-- YouTube API Quota Management Tables
-- Run this in your Supabase SQL editor

-- Table: quota_usage
-- Tracks daily YouTube API quota usage
CREATE TABLE IF NOT EXISTS quota_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  used INTEGER DEFAULT 0,
  operations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: channel_priorities
-- Stores calculated priority scores for channels
CREATE TABLE IF NOT EXISTS channel_priorities (
  channel_id TEXT PRIMARY KEY REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
  priority_score INTEGER DEFAULT 0,
  update_frequency TEXT DEFAULT 'weekly' CHECK (update_frequency IN ('daily', 'weekly', 'monthly')),
  last_calculated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quota_usage_date ON quota_usage(date DESC);
CREATE INDEX IF NOT EXISTS idx_channel_priorities_score ON channel_priorities(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_channel_priorities_frequency ON channel_priorities(update_frequency);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for quota_usage
DROP TRIGGER IF EXISTS update_quota_usage_updated_at ON quota_usage;
CREATE TRIGGER update_quota_usage_updated_at
  BEFORE UPDATE ON quota_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add total_channels column to youtube_categories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_categories' AND column_name = 'total_channels'
  ) THEN
    ALTER TABLE youtube_categories ADD COLUMN total_channels INTEGER DEFAULT 0;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE quota_usage IS 'Tracks daily YouTube API quota usage to prevent exceeding limits';
COMMENT ON TABLE channel_priorities IS 'Stores priority scores for determining which channels to update';
COMMENT ON COLUMN quota_usage.operations IS 'JSON array of API operations: [{type, count, cost, timestamp}]';
COMMENT ON COLUMN channel_priorities.priority_score IS 'Calculated score (0-100) based on subscribers, staleness, and change rate';

-- Initial quota record for today
INSERT INTO quota_usage (date, used, operations)
VALUES (CURRENT_DATE, 0, '[]'::jsonb)
ON CONFLICT (date) DO NOTHING;

-- Success message
SELECT 'YouTube quota tracking tables created successfully!' AS status;
