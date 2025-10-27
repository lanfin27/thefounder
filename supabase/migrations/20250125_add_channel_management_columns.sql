-- YouTube Industry - Channel Management Columns
-- Migration: 20250125_add_channel_management_columns
-- Purpose: Add columns for manual channel management (add/remove channels, track status, errors)

-- Add channel management columns to youtube_channels table
DO $$
BEGIN
  -- is_active: 빠른 필터링을 위한 활성화 여부 플래그
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN is_active BOOLEAN DEFAULT true;
    COMMENT ON COLUMN youtube_channels.is_active IS 'Whether this channel is active (true) or deactivated (false)';
    RAISE NOTICE 'Added column: is_active';
  ELSE
    RAISE NOTICE 'Column already exists: is_active';
  END IF;

  -- status: 상세 상태 ('active', 'inactive', 'error', 'deleted')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'status'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    COMMENT ON COLUMN youtube_channels.status IS 'Detailed status: active, inactive, error, deleted';
    RAISE NOTICE 'Added column: status';
  ELSE
    RAISE NOTICE 'Column already exists: status';
  END IF;

  -- error_message: 마지막 에러 메시지
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN error_message TEXT;
    COMMENT ON COLUMN youtube_channels.error_message IS 'Last error message from YouTube API or update process';
    RAISE NOTICE 'Added column: error_message';
  ELSE
    RAISE NOTICE 'Column already exists: error_message';
  END IF;

  -- last_error_at: 마지막 에러 발생 시각
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'last_error_at'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN last_error_at TIMESTAMPTZ;
    COMMENT ON COLUMN youtube_channels.last_error_at IS 'Timestamp of last error occurrence';
    RAISE NOTICE 'Added column: last_error_at';
  ELSE
    RAISE NOTICE 'Column already exists: last_error_at';
  END IF;

  -- added_by: 채널을 추가한 관리자 이메일/ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN added_by VARCHAR(100);
    COMMENT ON COLUMN youtube_channels.added_by IS 'Email or ID of admin who added this channel';
    RAISE NOTICE 'Added column: added_by';
  ELSE
    RAISE NOTICE 'Column already exists: added_by';
  END IF;

  -- added_at: 채널 추가 시각
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'added_at'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN added_at TIMESTAMPTZ DEFAULT NOW();
    COMMENT ON COLUMN youtube_channels.added_at IS 'Timestamp when this channel was added to the system';
    RAISE NOTICE 'Added column: added_at';
  ELSE
    RAISE NOTICE 'Column already exists: added_at';
  END IF;

  -- notes: 관리자 메모
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'notes'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN notes TEXT;
    COMMENT ON COLUMN youtube_channels.notes IS 'Admin notes about this channel';
    RAISE NOTICE 'Added column: notes';
  ELSE
    RAISE NOTICE 'Column already exists: notes';
  END IF;

  -- deleted_by: 채널을 삭제한 관리자 (soft delete 추적용)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN deleted_by VARCHAR(100);
    COMMENT ON COLUMN youtube_channels.deleted_by IS 'Email or ID of admin who deleted/deactivated this channel';
    RAISE NOTICE 'Added column: deleted_by';
  ELSE
    RAISE NOTICE 'Column already exists: deleted_by';
  END IF;

  -- deleted_at: 채널 삭제 시각
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN deleted_at TIMESTAMPTZ;
    COMMENT ON COLUMN youtube_channels.deleted_at IS 'Timestamp when this channel was deleted/deactivated';
    RAISE NOTICE 'Added column: deleted_at';
  ELSE
    RAISE NOTICE 'Column already exists: deleted_at';
  END IF;

  -- deletion_reason: 삭제 사유
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_channels' AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE youtube_channels ADD COLUMN deletion_reason TEXT;
    COMMENT ON COLUMN youtube_channels.deletion_reason IS 'Reason for channel deletion/deactivation';
    RAISE NOTICE 'Added column: deletion_reason';
  ELSE
    RAISE NOTICE 'Column already exists: deletion_reason';
  END IF;

END $$;

-- Create indexes for efficient filtering and querying
CREATE INDEX IF NOT EXISTS idx_youtube_channels_is_active
  ON youtube_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_status
  ON youtube_channels(status);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_category_active
  ON youtube_channels(category_code, is_active);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_error_status
  ON youtube_channels(status) WHERE status = 'error';

CREATE INDEX IF NOT EXISTS idx_youtube_channels_last_error
  ON youtube_channels(last_error_at DESC) WHERE last_error_at IS NOT NULL;

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'youtube_channels_status_check'
  ) THEN
    ALTER TABLE youtube_channels
    ADD CONSTRAINT youtube_channels_status_check
    CHECK (status IN ('active', 'inactive', 'error', 'deleted'));
    RAISE NOTICE 'Added check constraint for status column';
  ELSE
    RAISE NOTICE 'Check constraint already exists';
  END IF;
END $$;

-- Update existing rows to have default values
UPDATE youtube_channels
SET
  is_active = true,
  status = 'active',
  added_at = COALESCE(created_at, NOW())
WHERE is_active IS NULL OR status IS NULL;

-- Success message
SELECT 'YouTube channel management columns migration completed successfully!
Added columns: is_active, status, error_message, last_error_at, added_by, added_at, notes, deleted_by, deleted_at, deletion_reason
Created indexes for efficient querying.' AS status;
