-- Add missing columns to incremental_changes table if they don't exist

-- Add scan_id column
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS scan_id VARCHAR(255);

-- Add listing_url column
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS listing_url TEXT;

-- Add listing_title column
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS listing_title TEXT;

-- Add detected_at if missing (some installations might not have it)
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add created_at if missing
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_incremental_changes_listing_id ON incremental_changes(listing_id);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_detected_at ON incremental_changes(detected_at);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_change_type ON incremental_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_created_at ON incremental_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incremental_changes_listing_detected 
  ON incremental_changes(listing_id, detected_at DESC);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'incremental_changes' 
ORDER BY ordinal_position;