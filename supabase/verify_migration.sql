-- ================================================
-- Migration Verification Script
-- ================================================
--
-- 사용 방법:
-- 1. combined_migration.sql 실행 후 이 스크립트 실행
-- 2. Supabase Dashboard > SQL Editor에서 실행
-- 3. 결과 확인
--
-- ================================================

-- ================================================
-- 1. 전체 컬럼 수 확인
-- ================================================

SELECT
  '1. Total Columns Check' AS check_name,
  COUNT(*) AS column_count,
  CASE
    WHEN COUNT(*) >= 19 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM information_schema.columns
WHERE table_name = 'youtube_channels';

-- ================================================
-- 2. 모든 컬럼 목록 상세 확인
-- ================================================

SELECT
  '2. Column Details' AS check_name;

SELECT
  column_name,
  data_type,
  CASE WHEN column_default IS NOT NULL THEN column_default ELSE '(no default)' END AS column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'youtube_channels'
ORDER BY ordinal_position;

-- ================================================
-- 3. 필수 컬럼 존재 여부 확인
-- ================================================

SELECT
  '3. Required Columns Check' AS check_name;

WITH required_columns AS (
  SELECT unnest(ARRAY[
    'id', 'channel_id', 'category_code', 'created_at',
    'title', 'description', 'thumbnail_url', 'subscribers',
    'total_views', 'video_count', 'updated_at',
    'is_active', 'status', 'error_message', 'last_error_at',
    'added_by', 'added_at', 'notes',
    'deleted_by', 'deleted_at', 'deletion_reason'
  ]) AS required_column
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'youtube_channels'
)
SELECT
  r.required_column,
  CASE
    WHEN e.column_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM required_columns r
LEFT JOIN existing_columns e ON r.required_column = e.column_name
ORDER BY r.required_column;

-- ================================================
-- 4. 인덱스 확인
-- ================================================

SELECT
  '4. Indexes Check' AS check_name;

SELECT
  indexname AS index_name,
  indexdef AS index_definition
FROM pg_indexes
WHERE tablename = 'youtube_channels'
ORDER BY indexname;

-- 예상 인덱스:
-- - idx_youtube_channels_title
-- - idx_youtube_channels_subscribers
-- - idx_youtube_channels_total_views
-- - idx_youtube_channels_video_count
-- - idx_youtube_channels_updated_at
-- - idx_youtube_channels_is_active
-- - idx_youtube_channels_status
-- - idx_youtube_channels_category_active
-- - idx_youtube_channels_error_status
-- - idx_youtube_channels_last_error

-- ================================================
-- 5. 제약조건 확인
-- ================================================

SELECT
  '5. Constraints Check' AS check_name;

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'youtube_channels'::regclass
ORDER BY conname;

-- 예상 제약조건:
-- - youtube_channels_status_check: status IN ('active', 'inactive', 'error', 'deleted')

-- ================================================
-- 6. Trigger 확인
-- ================================================

SELECT
  '6. Triggers Check' AS check_name;

SELECT
  trigger_name,
  event_manipulation AS trigger_event,
  action_statement AS trigger_action
FROM information_schema.triggers
WHERE event_object_table = 'youtube_channels'
ORDER BY trigger_name;

-- 예상 트리거:
-- - update_youtube_channels_updated_at_trigger

-- ================================================
-- 7. 샘플 데이터 확인
-- ================================================

SELECT
  '7. Sample Data Check' AS check_name;

SELECT
  channel_id,
  title,
  is_active,
  status,
  added_at,
  subscribers,
  video_count
FROM youtube_channels
ORDER BY created_at DESC
LIMIT 5;

-- ================================================
-- 8. status 컬럼 값 분포 확인
-- ================================================

SELECT
  '8. Status Distribution' AS check_name;

SELECT
  status,
  COUNT(*) AS count
FROM youtube_channels
GROUP BY status
ORDER BY status;

-- ================================================
-- 9. is_active 컬럼 값 분포 확인
-- ================================================

SELECT
  '9. Active Status Distribution' AS check_name;

SELECT
  is_active,
  COUNT(*) AS count
FROM youtube_channels
GROUP BY is_active
ORDER BY is_active DESC;

-- ================================================
-- 10. 전체 검증 요약
-- ================================================

SELECT
  '10. Overall Verification Summary' AS check_name;

WITH
  column_check AS (
    SELECT COUNT(*) >= 19 AS pass
    FROM information_schema.columns
    WHERE table_name = 'youtube_channels'
  ),
  status_column_check AS (
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'youtube_channels' AND column_name = 'status'
    ) AS pass
  ),
  constraint_check AS (
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'youtube_channels_status_check'
    ) AS pass
  ),
  trigger_check AS (
    SELECT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_table = 'youtube_channels'
        AND trigger_name = 'update_youtube_channels_updated_at_trigger'
    ) AS pass
  )
SELECT
  CASE
    WHEN (SELECT pass FROM column_check) THEN '✅' ELSE '❌'
  END || ' Column count >= 19' AS column_count_check,
  CASE
    WHEN (SELECT pass FROM status_column_check) THEN '✅' ELSE '❌'
  END || ' Status column exists' AS status_column_check,
  CASE
    WHEN (SELECT pass FROM constraint_check) THEN '✅' ELSE '❌'
  END || ' Status constraint exists' AS constraint_check,
  CASE
    WHEN (SELECT pass FROM trigger_check) THEN '✅' ELSE '❌'
  END || ' Updated_at trigger exists' AS trigger_check;

-- ================================================
-- 최종 결과
-- ================================================

SELECT
  '✅ Migration verification completed!' AS message,
  'If all checks show ✅, the database is ready for channel management.' AS next_step;
