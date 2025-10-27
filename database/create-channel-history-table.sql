-- YouTube Channel History Table
-- 이 테이블은 채널의 시계열 데이터를 저장합니다.
-- Supabase SQL Editor에서 실행하세요: https://supabase.com/dashboard/project/frytwgfbxmbigrskarpt/editor

-- 테이블 생성
CREATE TABLE IF NOT EXISTS youtube_channel_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  date DATE NOT NULL,

  -- 핵심 지표
  total_views BIGINT NOT NULL,
  video_count INT NOT NULL,
  views_per_video FLOAT NOT NULL,  -- 영상당 조회수 (핵심!)

  -- 참고 지표
  subscribers BIGINT,
  avg_views_per_video_7d FLOAT,   -- 7일 이동평균
  avg_views_per_video_30d FLOAT,  -- 30일 이동평균

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(channel_id, date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_channel_history_channel
  ON youtube_channel_history(channel_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_channel_history_category
  ON youtube_channel_history(category_code, date DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE youtube_channel_history ENABLE ROW LEVEL SECURITY;

-- Public read access policy
CREATE POLICY "Allow public read access"
  ON youtube_channel_history
  FOR SELECT
  USING (true);

-- Comment
COMMENT ON TABLE youtube_channel_history IS 'YouTube 채널의 일별 통계 히스토리';
COMMENT ON COLUMN youtube_channel_history.views_per_video IS '영상당 평균 조회수 (total_views / video_count)';
