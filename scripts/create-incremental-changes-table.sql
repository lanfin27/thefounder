-- Create incremental_changes table for tracking all changes to listings
CREATE TABLE IF NOT EXISTS incremental_changes (
  change_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id VARCHAR(255) NOT NULL,
  change_type VARCHAR(50) NOT NULL, -- 'new_listing', 'price_update', 'status_change', 'deleted'
  field_name VARCHAR(100), -- 'asking_price', 'status', 'title', etc.
  old_value TEXT, -- Previous value as string
  new_value TEXT, -- New value as string
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata
  scan_id VARCHAR(255), -- ID of the scan that detected this change
  listing_url TEXT, -- URL of the listing
  listing_title TEXT, -- Title at time of change
  
  -- Constraints
  CONSTRAINT valid_change_type CHECK (
    change_type IN ('new_listing', 'price_update', 'status_change', 'deleted', 'updated')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incremental_changes_listing_id ON incremental_changes(listing_id);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_detected_at ON incremental_changes(detected_at);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_change_type ON incremental_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_created_at ON incremental_changes(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_incremental_changes_listing_detected 
  ON incremental_changes(listing_id, detected_at DESC);

-- Enable Row Level Security
ALTER TABLE incremental_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Allow public read access to incremental_changes" 
  ON incremental_changes FOR SELECT 
  USING (true);

-- Service role has full access
CREATE POLICY "Service role has full access to incremental_changes" 
  ON incremental_changes FOR ALL 
  USING (true);

-- Create view for recent changes
CREATE OR REPLACE VIEW recent_changes AS
SELECT 
  ic.*,
  fl.asking_price as current_price,
  fl.category,
  fl.status as current_status
FROM incremental_changes ic
LEFT JOIN flippa_listings fl ON ic.listing_id = fl.id
WHERE ic.detected_at > NOW() - INTERVAL '7 days'
ORDER BY ic.detected_at DESC;

-- Create function to get change history for a listing
CREATE OR REPLACE FUNCTION get_listing_change_history(p_listing_id VARCHAR)
RETURNS TABLE (
  change_id UUID,
  change_type VARCHAR,
  field_name VARCHAR,
  old_value TEXT,
  new_value TEXT,
  detected_at TIMESTAMP WITH TIME ZONE,
  days_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.change_id,
    ic.change_type,
    ic.field_name,
    ic.old_value,
    ic.new_value,
    ic.detected_at,
    EXTRACT(DAY FROM NOW() - ic.detected_at)::INTEGER as days_ago
  FROM incremental_changes ic
  WHERE ic.listing_id = p_listing_id
  ORDER BY ic.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create summary statistics view
CREATE OR REPLACE VIEW change_statistics AS
SELECT 
  DATE(detected_at) as date,
  change_type,
  COUNT(*) as change_count,
  COUNT(DISTINCT listing_id) as unique_listings
FROM incremental_changes
WHERE detected_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(detected_at), change_type
ORDER BY date DESC, change_type;

-- Add comment to table
COMMENT ON TABLE incremental_changes IS 'Tracks all changes to Flippa listings including new listings, price updates, and deletions';