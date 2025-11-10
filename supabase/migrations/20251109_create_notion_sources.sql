-- ============================================
-- Multi-Notion Database Sync Feature
-- Created: 2025-11-09
-- Purpose: Enable syncing from multiple Notion databases
-- ============================================

-- Create notion_sources table
CREATE TABLE IF NOT EXISTS notion_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  notion_token TEXT NOT NULL,
  notion_database_id VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notion_sources_active
  ON notion_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_notion_sources_name
  ON notion_sources(name);

CREATE INDEX IF NOT EXISTS idx_notion_sources_created_at
  ON notion_sources(created_at DESC);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
CREATE TRIGGER update_notion_sources_updated_at
  BEFORE UPDATE ON notion_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE notion_sources IS 'Stores multiple Notion database sources for content syncing';
COMMENT ON COLUMN notion_sources.name IS 'Friendly name for this source (e.g., "Sync 1", "Tech Blog")';
COMMENT ON COLUMN notion_sources.notion_token IS 'Notion API integration token (encrypted)';
COMMENT ON COLUMN notion_sources.notion_database_id IS 'Notion database ID to sync from';
COMMENT ON COLUMN notion_sources.is_active IS 'Whether this source should be included in sync operations';
COMMENT ON COLUMN notion_sources.last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN notion_sources.sync_count IS 'Total number of times this source has been synced';

-- Grant permissions (adjust based on your RLS setup)
-- Note: You may need to configure RLS policies based on your security requirements
