-- homepage_config 테이블
CREATE TABLE IF NOT EXISTS homepage_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  featured_posts JSONB NOT NULL DEFAULT '[]',
  founder_picks JSONB NOT NULL DEFAULT '[]',
  topics JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_homepage_config_published
  ON homepage_config(is_published);
CREATE INDEX IF NOT EXISTS idx_homepage_config_version
  ON homepage_config(version DESC);

-- RLS
ALTER TABLE homepage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published config"
  ON homepage_config FOR SELECT
  USING (is_published = true);

CREATE POLICY "Only admins can manage config"
  ON homepage_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 초기 데이터
INSERT INTO homepage_config (
  featured_posts,
  founder_picks,
  topics,
  is_published
) VALUES (
  '[]'::jsonb,
  '[]'::jsonb,
  '[
    {"id": "startup", "label": "스타트업", "count": 24},
    {"id": "ai", "label": "AI", "count": 18},
    {"id": "saas", "label": "SaaS", "count": 15},
    {"id": "marketing", "label": "마케팅", "count": 12},
    {"id": "product", "label": "제품개발", "count": 10},
    {"id": "growth", "label": "성장전략", "count": 14},
    {"id": "funding", "label": "투자유치", "count": 8},
    {"id": "solo", "label": "1인창업", "count": 20}
  ]'::jsonb,
  true
);
