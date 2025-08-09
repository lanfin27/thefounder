-- Fix incremental_changes table schema
-- Add missing scan_id column if it doesn't exist

-- Check if scan_id column exists, if not add it
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS scan_id TEXT;

-- Add scan_session_id column for compatibility
ALTER TABLE incremental_changes 
ADD COLUMN IF NOT EXISTS scan_session_id TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_incremental_changes_scan_id 
ON incremental_changes(scan_id);

CREATE INDEX IF NOT EXISTS idx_incremental_changes_scan_session_id 
ON incremental_changes(scan_session_id);

-- Add any other missing columns that might be referenced in the code
ALTER TABLE incremental_changes
ADD COLUMN IF NOT EXISTS change_score INTEGER DEFAULT 0;

ALTER TABLE incremental_changes
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing records to have a default scan_id if needed
UPDATE incremental_changes 
SET scan_id = 'initial-scan-' || id::text 
WHERE scan_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN incremental_changes.scan_id IS 'ID of the scan session that detected this change';
COMMENT ON COLUMN incremental_changes.scan_session_id IS 'Alternative reference to scan session for backward compatibility';