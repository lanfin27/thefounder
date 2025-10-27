-- YouTube Industry Admin System Tables
-- Migration: 20250123_admin_tables

-- API 호출 로그 테이블
CREATE TABLE IF NOT EXISTS youtube_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  endpoint VARCHAR(100) NOT NULL,
  parameters JSONB,
  response_status INTEGER,
  units_used INTEGER DEFAULT 1,
  error_message TEXT,
  duration_ms INTEGER,
  channel_id TEXT,
  category_code VARCHAR(10)
);

-- 업데이트 작업 테이블
CREATE TABLE IF NOT EXISTS youtube_update_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('manual', 'scheduled', 'incremental', 'full')),
  update_scope VARCHAR(20) NOT NULL,
  target_categories TEXT[],
  target_channels TEXT[],
  total_channels INTEGER DEFAULT 0,
  processed_channels INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,
  errors JSONB,
  progress_details JSONB
);

-- 스케줄 설정 테이블
CREATE TABLE IF NOT EXISTS youtube_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  cron_expression VARCHAR(50) NOT NULL,
  update_type VARCHAR(20) NOT NULL,
  config JSONB,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  run_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 설정 테이블
CREATE TABLE IF NOT EXISTS youtube_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(50) NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  daily_limit INTEGER DEFAULT 10000,
  used_today INTEGER DEFAULT 0,
  reset_time TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON youtube_api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_channel ON youtube_api_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_update_jobs_status ON youtube_update_jobs(status);
CREATE INDEX IF NOT EXISTS idx_update_jobs_created ON youtube_update_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON youtube_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON youtube_schedules(next_run);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- youtube_api_config 테이블용 트리거
CREATE TRIGGER update_youtube_api_config_updated_at
  BEFORE UPDATE ON youtube_api_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- youtube_schedules 테이블용 트리거
CREATE TRIGGER update_youtube_schedules_updated_at
  BEFORE UPDATE ON youtube_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
