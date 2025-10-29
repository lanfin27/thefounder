-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cleanup Bad History Data for YouTube Channels
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Execute this in Supabase SQL Editor BEFORE running the backfill script
--
-- This script:
-- 1. Shows current state of problematic channels
-- 2. Deletes all history records for 빠니보틀, 웨펀, 홍민영
-- 3. Fixes abnormal daily_views_per_video values
-- 4. Verifies the cleanup
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 1: Inspect Current State
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  channel_id,
  name,
  subscribers,
  total_views,
  video_count,
  avg_views_per_video,
  daily_views_per_video,
  last_updated
FROM youtube_channels
WHERE name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
ORDER BY name;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 2: Check History Record Counts
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  COUNT(h.id) as history_count,
  MIN(h.date) as first_date,
  MAX(h.date) as last_date,
  COUNT(DISTINCT h.subscribers) as unique_subscriber_values,
  COUNT(DISTINCT h.total_views) as unique_view_values,
  MIN(h.subscribers) as min_subs,
  MAX(h.subscribers) as max_subs,
  MAX(h.subscribers) - MIN(h.subscribers) as subs_variation
FROM youtube_channels c
LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
GROUP BY c.channel_id, c.name
ORDER BY c.name;

-- ❌ Expected Problem:
-- - subs_variation = 0 (all identical values!)
-- - unique_subscriber_values = 1 (no variation!)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 3: Create Backup (Optional)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS youtube_channel_history_backup_20251030 AS
SELECT h.*
FROM youtube_channel_history h
INNER JOIN youtube_channels c ON h.channel_id = c.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영');

-- Verify backup
SELECT COUNT(*) as backup_row_count
FROM youtube_channel_history_backup_20251030;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 4: Delete All History Records
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Delete 빠니보틀 Pani Bottle history
DELETE FROM youtube_channel_history
WHERE channel_id IN (
  SELECT channel_id
  FROM youtube_channels
  WHERE name = '빠니보틀 Pani Bottle'
);

-- Delete 웨펀 history
DELETE FROM youtube_channel_history
WHERE channel_id IN (
  SELECT channel_id
  FROM youtube_channels
  WHERE name = '웨펀'
);

-- Delete 홍민영 history
DELETE FROM youtube_channel_history
WHERE channel_id IN (
  SELECT channel_id
  FROM youtube_channels
  WHERE name = '홍민영'
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 5: Verify Deletion
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  COUNT(h.id) as history_count
FROM youtube_channels c
LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
GROUP BY c.channel_id, c.name
ORDER BY c.name;

-- ✅ Expected Result:
-- All channels should have history_count = 0

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 6: Fix Abnormal daily_views_per_video
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Update to reasonable values (1% of average views per video)
UPDATE youtube_channels
SET
  daily_views_per_video = CASE
    WHEN video_count > 0 AND total_views > 0 THEN
      ROUND((total_views::numeric / video_count) * 0.01)
    ELSE 0
  END,
  updated_at = NOW()
WHERE name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 7: Final Verification
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  name,
  subscribers,
  total_views,
  video_count,
  avg_views_per_video,
  daily_views_per_video,
  last_updated
FROM youtube_channels
WHERE name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
ORDER BY name;

-- ✅ Expected Results:
-- - daily_views_per_video: Reasonable values (NOT scientific notation!)
-- - History records: 0 for all channels
-- - Ready for backfill script

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Optional: Find All Channels with Abnormal Values
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  name,
  daily_views_per_video,
  avg_views_per_video,
  CASE
    WHEN daily_views_per_video > avg_views_per_video * 10 THEN 'ABNORMAL'
    ELSE 'OK'
  END as status
FROM youtube_channels
WHERE daily_views_per_video > avg_views_per_video * 10
ORDER BY daily_views_per_video DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Next Steps
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- After running this SQL:
-- 1. Run: npx tsx src/scripts/rebuild-channels-history-from-youtube.ts
--    → This will fetch real YouTube data and create 30 days of history
--
-- 2. Wait ~10 minutes for the script to complete
--
-- 3. Run: src/scripts/sql/verify-channel-history.sql
--    → Verify that data looks correct
--
-- 4. Check graphs: http://localhost:3002/youtube-industry/Y05
--    → Should show natural growth curves (not flat lines!)
