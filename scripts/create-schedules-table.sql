-- Create scraping_schedules table for managing automated scraping schedules
CREATE TABLE IF NOT EXISTS scraping_schedules (
  schedule_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- '15min', '30min', '1hour', '2hours', '6hours', '12hours', '24hours', 'custom'
  custom_cron VARCHAR(100), -- Custom cron expression if frequency is 'custom'
  enabled BOOLEAN DEFAULT true,
  
  -- Execution times
  specific_times JSONB, -- Array of specific times like ['09:00', '14:00', '20:00']
  days_of_week INTEGER[], -- Array of days (0-6, where 0 is Sunday)
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Run history
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  
  -- Configuration
  max_pages INTEGER DEFAULT 2,
  scan_options JSONB DEFAULT '{}', -- Additional scan options
  retry_attempts INTEGER DEFAULT 3,
  retry_delay INTEGER DEFAULT 300, -- Seconds between retries
  
  -- Notifications
  notification_settings JSONB DEFAULT '{}', -- Email, webhook URLs, thresholds
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  
  -- Constraints
  CONSTRAINT valid_frequency CHECK (
    frequency IN ('15min', '30min', '1hour', '2hours', '6hours', '12hours', '24hours', 'custom')
  ),
  CONSTRAINT valid_cron CHECK (
    (frequency = 'custom' AND custom_cron IS NOT NULL) OR 
    (frequency != 'custom')
  )
);

-- Create schedule_executions table for tracking individual runs
CREATE TABLE IF NOT EXISTS schedule_executions (
  execution_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES scraping_schedules(schedule_id) ON DELETE CASCADE,
  
  -- Execution details
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  
  -- Results
  duration_seconds INTEGER,
  pages_scanned INTEGER,
  listings_found INTEGER,
  new_listings INTEGER,
  price_changes INTEGER,
  deleted_listings INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  memory_usage_mb FLOAT,
  cpu_usage_percent FLOAT,
  
  -- Metadata
  triggered_by VARCHAR(50) DEFAULT 'schedule', -- 'schedule', 'manual', 'retry'
  scan_results JSONB,
  
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

-- Create indexes for performance
CREATE INDEX idx_schedules_enabled ON scraping_schedules(enabled);
CREATE INDEX idx_schedules_next_run ON scraping_schedules(next_run);
CREATE INDEX idx_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX idx_executions_started_at ON schedule_executions(started_at);
CREATE INDEX idx_executions_status ON schedule_executions(status);

-- Create notification_queue table for managing notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  notification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES scraping_schedules(schedule_id) ON DELETE CASCADE,
  execution_id UUID REFERENCES schedule_executions(execution_id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL, -- 'email', 'webhook', 'slack', 'discord'
  recipient VARCHAR(500) NOT NULL, -- Email address or webhook URL
  subject VARCHAR(500),
  content TEXT,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority INTEGER DEFAULT 5, -- 1-10, where 1 is highest priority
  
  CONSTRAINT valid_type CHECK (
    type IN ('email', 'webhook', 'slack', 'discord')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'sent', 'failed', 'cancelled')
  )
);

-- Create index for notification processing
CREATE INDEX idx_notifications_status ON notification_queue(status, priority);

-- Add RLS policies
ALTER TABLE scraping_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to schedules" ON scraping_schedules
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to executions" ON schedule_executions
  FOR SELECT USING (true);

-- Service role has full access
CREATE POLICY "Service role has full access to schedules" ON scraping_schedules
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to executions" ON schedule_executions
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to notifications" ON notification_queue
  FOR ALL USING (true);