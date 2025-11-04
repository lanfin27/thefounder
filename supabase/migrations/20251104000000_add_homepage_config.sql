-- Homepage Config Table for Admin CMS
CREATE TABLE IF NOT EXISTS homepage_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_type TEXT NOT NULL UNIQUE, -- 'featured' | 'founder_picks' | 'topics'
  selected_posts JSONB NOT NULL DEFAULT '[]',
  display_order INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_homepage_config_type ON homepage_config(config_type);
CREATE INDEX IF NOT EXISTS idx_homepage_config_active ON homepage_config(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_config_updated ON homepage_config(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE homepage_config ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active configs
CREATE POLICY "Public can view active configs"
  ON homepage_config FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can manage configs
CREATE POLICY "Admins can manage configs"
  ON homepage_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Initial data with default empty configurations
INSERT INTO homepage_config (config_type, selected_posts, is_active) VALUES
  ('featured', '[]'::jsonb, true),
  ('founder_picks', '[]'::jsonb, true),
  ('topics', '[]'::jsonb, true)
ON CONFLICT (config_type) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_homepage_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER homepage_config_updated_at
  BEFORE UPDATE ON homepage_config
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_config_updated_at();

-- Comments for documentation
COMMENT ON TABLE homepage_config IS 'Stores configuration for homepage sections (Featured, Founder Picks, Topics)';
COMMENT ON COLUMN homepage_config.config_type IS 'Type of section: featured, founder_picks, or topics';
COMMENT ON COLUMN homepage_config.selected_posts IS 'Array of selected post objects with full data';
COMMENT ON COLUMN homepage_config.display_order IS 'Explicit display order as array of indices';
