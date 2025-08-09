-- Enhanced Flippa Listings Schema with all 31 monitored fields
-- This schema supports comprehensive incremental monitoring

-- First, create a new enhanced table
CREATE TABLE IF NOT EXISTS flippa_listings_enhanced (
  -- Primary identification
  id VARCHAR(255) PRIMARY KEY, -- Flippa's unique listing ID
  
  -- Core listing information (31 monitored fields)
  category VARCHAR(255),
  country_name VARCHAR(255),
  currency_label VARCHAR(50),
  end_at TIMESTAMP WITH TIME ZONE,
  established_at TIMESTAMP WITH TIME ZONE,
  formatted_age_in_years VARCHAR(100),
  
  -- Key data fields (5 slots for various metrics)
  key_data_label_0 VARCHAR(255),
  key_data_value_0 VARCHAR(255),
  key_data_label_1 VARCHAR(255),
  key_data_value_1 VARCHAR(255),
  key_data_label_2 VARCHAR(255),
  key_data_value_2 VARCHAR(255),
  key_data_label_3 VARCHAR(255),
  key_data_value_3 VARCHAR(255),
  key_data_label_4 VARCHAR(255),
  key_data_value_4 VARCHAR(255),
  
  -- Listing details
  listing_url TEXT,
  monetization VARCHAR(255),
  multiple DECIMAL(10,2),
  price DECIMAL(15,2),
  primary_platform VARCHAR(255),
  profit_average DECIMAL(15,2),
  property_name VARCHAR(500),
  property_type VARCHAR(100),
  revenue_average DECIMAL(15,2),
  revenue_multiple DECIMAL(10,2),
  sale_method VARCHAR(100),
  sale_method_title VARCHAR(255),
  status VARCHAR(100),
  summary TEXT,
  title TEXT,
  
  -- Incremental monitoring fields
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_count INTEGER DEFAULT 0,
  change_history JSONB DEFAULT '[]'::jsonb,
  is_new BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deletion_detected_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_quality_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  
  -- Change tracking
  last_price_change DECIMAL(15,2),
  last_price_change_date TIMESTAMP WITH TIME ZONE,
  price_change_percentage DECIMAL(10,2),
  
  -- Computed fields for quick filtering
  has_price_change BOOLEAN DEFAULT false,
  has_status_change BOOLEAN DEFAULT false,
  days_since_update INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM NOW() - last_updated_at)
  ) STORED
);

-- Create indexes for performance
CREATE INDEX idx_flippa_enhanced_category ON flippa_listings_enhanced(category);
CREATE INDEX idx_flippa_enhanced_price ON flippa_listings_enhanced(price);
CREATE INDEX idx_flippa_enhanced_status ON flippa_listings_enhanced(status);
CREATE INDEX idx_flippa_enhanced_last_updated ON flippa_listings_enhanced(last_updated_at DESC);
CREATE INDEX idx_flippa_enhanced_is_new ON flippa_listings_enhanced(is_new);
CREATE INDEX idx_flippa_enhanced_is_deleted ON flippa_listings_enhanced(is_deleted);
CREATE INDEX idx_flippa_enhanced_change_count ON flippa_listings_enhanced(change_count);
CREATE INDEX idx_flippa_enhanced_property_type ON flippa_listings_enhanced(property_type);
CREATE INDEX idx_flippa_enhanced_sale_method ON flippa_listings_enhanced(sale_method);

-- Composite indexes for common queries
CREATE INDEX idx_flippa_enhanced_changes ON flippa_listings_enhanced(is_new, is_deleted, change_count);
CREATE INDEX idx_flippa_enhanced_price_range ON flippa_listings_enhanced(price, last_updated_at);

-- Create change log table for detailed tracking
CREATE TABLE IF NOT EXISTS flippa_change_log (
  change_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id VARCHAR(255) REFERENCES flippa_listings_enhanced(id),
  change_type VARCHAR(50) NOT NULL, -- 'new', 'modified', 'deleted', 'restored'
  changed_fields JSONB NOT NULL, -- Array of {field, old_value, new_value}
  change_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_score DECIMAL(5,2) DEFAULT 0, -- Importance score (0-100)
  
  -- Change metadata
  scan_id VARCHAR(255),
  processing_time_ms INTEGER,
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT valid_change_type CHECK (
    change_type IN ('new', 'modified', 'deleted', 'restored')
  )
);

CREATE INDEX idx_change_log_listing ON flippa_change_log(listing_id);
CREATE INDEX idx_change_log_timestamp ON flippa_change_log(change_timestamp DESC);
CREATE INDEX idx_change_log_type ON flippa_change_log(change_type);
CREATE INDEX idx_change_log_score ON flippa_change_log(change_score DESC);

-- Create statistics table for tracking
CREATE TABLE IF NOT EXISTS flippa_monitoring_stats (
  stat_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE DEFAULT CURRENT_DATE,
  stat_hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
  
  -- Counts
  total_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  modified_listings INTEGER DEFAULT 0,
  deleted_listings INTEGER DEFAULT 0,
  
  -- Change details
  price_changes INTEGER DEFAULT 0,
  status_changes INTEGER DEFAULT 0,
  total_fields_changed INTEGER DEFAULT 0,
  
  -- Performance metrics
  scan_duration_seconds INTEGER,
  listings_processed INTEGER,
  errors_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique hourly stats
  UNIQUE(stat_date, stat_hour)
);

-- Create view for recent changes
CREATE OR REPLACE VIEW flippa_recent_changes AS
SELECT 
  f.*,
  CASE 
    WHEN f.is_new THEN 'new'
    WHEN f.is_deleted THEN 'deleted'
    WHEN f.change_count > 0 THEN 'modified'
    ELSE 'unchanged'
  END as change_status,
  EXTRACT(EPOCH FROM (NOW() - f.last_updated_at))/3600 as hours_since_update
FROM flippa_listings_enhanced f
WHERE f.last_updated_at > NOW() - INTERVAL '7 days'
  AND (f.is_new OR f.is_deleted OR f.change_count > 0)
ORDER BY f.last_updated_at DESC;

-- Create materialized view for change statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS flippa_change_summary AS
SELECT 
  DATE(last_updated_at) as date,
  COUNT(*) FILTER (WHERE is_new) as new_count,
  COUNT(*) FILTER (WHERE is_deleted) as deleted_count,
  COUNT(*) FILTER (WHERE change_count > 0 AND NOT is_new) as modified_count,
  COUNT(*) FILTER (WHERE has_price_change) as price_change_count,
  COUNT(*) FILTER (WHERE has_status_change) as status_change_count,
  AVG(price) as avg_price,
  MAX(price) as max_price,
  COUNT(DISTINCT category) as unique_categories
FROM flippa_listings_enhanced
GROUP BY DATE(last_updated_at)
ORDER BY date DESC;

-- Create function to calculate change score
CREATE OR REPLACE FUNCTION calculate_change_score(
  p_change_type VARCHAR,
  p_price_old DECIMAL,
  p_price_new DECIMAL,
  p_status_old VARCHAR,
  p_status_new VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 0;
  price_change_pct DECIMAL;
BEGIN
  -- Base scores by change type
  IF p_change_type = 'new' THEN
    score := 50;
    -- Higher score for high-value new listings
    IF p_price_new > 100000 THEN
      score := score + 30;
    ELSIF p_price_new > 50000 THEN
      score := score + 20;
    ELSIF p_price_new > 25000 THEN
      score := score + 10;
    END IF;
  ELSIF p_change_type = 'deleted' THEN
    score := 30;
  ELSIF p_change_type = 'modified' THEN
    score := 20;
    
    -- Price change scoring
    IF p_price_old > 0 AND p_price_new IS NOT NULL THEN
      price_change_pct := ABS((p_price_new - p_price_old) / p_price_old * 100);
      IF price_change_pct > 50 THEN
        score := score + 40;
      ELSIF price_change_pct > 30 THEN
        score := score + 30;
      ELSIF price_change_pct > 20 THEN
        score := score + 20;
      ELSIF price_change_pct > 10 THEN
        score := score + 10;
      END IF;
    END IF;
    
    -- Status change scoring
    IF p_status_old != p_status_new THEN
      score := score + 20;
      IF p_status_new = 'sold' THEN
        score := score + 10;
      END IF;
    END IF;
  END IF;
  
  RETURN LEAST(score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Create function to get field change frequency
CREATE OR REPLACE FUNCTION get_field_change_frequency()
RETURNS TABLE (
  field_name VARCHAR,
  change_count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_object_keys(changed_fields) as field_name,
    COUNT(*) as change_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
  FROM flippa_change_log
  CROSS JOIN LATERAL jsonb_array_elements(changed_fields) as changed_fields
  WHERE change_timestamp > NOW() - INTERVAL '30 days'
  GROUP BY jsonb_object_keys(changed_fields)
  ORDER BY change_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE flippa_listings_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE flippa_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE flippa_monitoring_stats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to enhanced listings" ON flippa_listings_enhanced
  FOR SELECT USING (true);

CREATE POLICY "Public read access to change log" ON flippa_change_log
  FOR SELECT USING (true);

CREATE POLICY "Public read access to stats" ON flippa_monitoring_stats
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access to enhanced listings" ON flippa_listings_enhanced
  FOR ALL USING (true);

CREATE POLICY "Service role full access to change log" ON flippa_change_log
  FOR ALL USING (true);

CREATE POLICY "Service role full access to stats" ON flippa_monitoring_stats
  FOR ALL USING (true);

-- Add comments
COMMENT ON TABLE flippa_listings_enhanced IS 'Enhanced Flippa listings table with all 31 monitored fields and change tracking';
COMMENT ON TABLE flippa_change_log IS 'Detailed log of all changes to Flippa listings';
COMMENT ON TABLE flippa_monitoring_stats IS 'Hourly statistics for monitoring system performance';