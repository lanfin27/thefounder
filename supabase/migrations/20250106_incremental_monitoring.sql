-- Create incremental_changes table for tracking all listing changes
CREATE TABLE IF NOT EXISTS incremental_changes (
  id BIGSERIAL PRIMARY KEY,
  change_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  listing_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('new', 'deleted', 'updated', 'price_drop', 'revenue_change', 'category_change')),
  
  -- Change details
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  change_percentage NUMERIC(10,2),
  
  -- Listing snapshot at time of change
  listing_snapshot JSONB,
  
  -- Metadata
  scan_id TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  
  -- Indexes for performance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_incremental_changes_listing_id ON incremental_changes(listing_id);
CREATE INDEX idx_incremental_changes_change_type ON incremental_changes(change_type);
CREATE INDEX idx_incremental_changes_detected_at ON incremental_changes(detected_at DESC);
CREATE INDEX idx_incremental_changes_scan_id ON incremental_changes(scan_id);
CREATE INDEX idx_incremental_changes_notification ON incremental_changes(notification_sent, change_type);

-- Create scan_sessions table for tracking monitoring runs
CREATE TABLE IF NOT EXISTS scan_sessions (
  id BIGSERIAL PRIMARY KEY,
  scan_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('manual', 'scheduled', 'automated')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  
  -- Scan statistics
  pages_scanned INTEGER DEFAULT 0,
  listings_found INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  deleted_listings INTEGER DEFAULT 0,
  updated_listings INTEGER DEFAULT 0,
  
  -- Performance metrics
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Error tracking
  errors JSONB DEFAULT '[]'::JSONB,
  
  -- Metadata
  triggered_by TEXT,
  configuration JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for scan sessions
CREATE INDEX idx_scan_sessions_status ON scan_sessions(status);
CREATE INDEX idx_scan_sessions_started_at ON scan_sessions(started_at DESC);
CREATE INDEX idx_scan_sessions_scan_type ON scan_sessions(scan_type);

-- Create notification_queue table for alerts
CREATE TABLE IF NOT EXISTS notification_queue (
  id BIGSERIAL PRIMARY KEY,
  notification_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'webhook', 'dashboard')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  
  -- Notification details
  recipient TEXT,
  subject TEXT,
  content JSONB NOT NULL,
  
  -- Related data
  change_id TEXT REFERENCES incremental_changes(change_id),
  listing_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notification queue
CREATE INDEX idx_notification_queue_status ON notification_queue(status, priority);
CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at);

-- Create monitoring_config table for settings
CREATE TABLE IF NOT EXISTS monitoring_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default monitoring configuration
INSERT INTO monitoring_config (config_key, config_value, description) VALUES
('scan_schedule', '{"interval": "hourly", "enabled": true, "pages": 5}', 'Automated scan schedule settings'),
('notification_thresholds', '{"price": 100000, "revenue": 10000, "price_drop_percent": 20}', 'Thresholds for triggering notifications'),
('categories_of_interest', '["SaaS", "E-commerce", "Digital Product", "Newsletter"]', 'Categories to prioritize in notifications'),
('scan_delays', '{"min": 60, "max": 120, "page_delay": 30}', 'Human-like delay settings in seconds')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS
ALTER TABLE incremental_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON incremental_changes FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON incremental_changes FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Public read access" ON scan_sessions FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON scan_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role access" ON notification_queue FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role access" ON monitoring_config FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON incremental_changes TO anon;
GRANT SELECT ON scan_sessions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;