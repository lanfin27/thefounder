-- Cleanup Bad History Data
-- Execute this in Supabase SQL Editor
--
-- This script:
-- 1. Shows current state of problematic channels
-- 2. Deletes all history records for 빠니보틀 and 홍민영
-- 3. Fixes 홍민영's abnormal daily_views_per_video value

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 1: Inspect Current State
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check channel details
SELECT
  channel_id,
  name,
  subscribers,
  total_views,
  video_count,
  views_per_video,
  daily_views_per_video,
  last_updated
FROM youtube_channels
WHERE name LIKE '%빠니보틀%' OR name LIKE '%홍민영%'
ORDER BY name;

-- Check history record counts and variation
SELECT
  c.name,
  COUNT(h.id) as history_count,
  MIN(h.date) as first_date,
  MAX(h.date) as last_date,
  MIN(h.subscribers) as min_subs,
  MAX(h.subscribers) as max_subs,
  MAX(h.subscribers) - MIN(h.subscribers) as subs_variation,
  MIN(h.daily_views_per_video) as min_daily,
  MAX(h.daily_views_per_video) as max_daily
FROM youtube_channels c
LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
WHERE c.name LIKE '%빠니보틀%' OR c.name LIKE '%홍민영%'
GROUP BY c.channel_id, c.name
ORDER BY c.name;

-- ❌ Expected Problem: subs_variation = 0 (all identical values!)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 2: Delete All History Records
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Delete 빠니보틀 history
DELETE FROM youtube_channel_history
WHERE channel_id IN (
  SELECT channel_id
  FROM youtube_channels
  WHERE name LIKE '%빠니보틀%'
);

-- Delete 홍민영 history
DELETE FROM youtube_channel_history
WHERE channel_id IN (
  SELECT channel_id
  FROM youtube_channels
  WHERE name LIKE '%홍민영%'
);

-- Verify deletion
SELECT
  c.name,
  COUNT(h.id) as history_count
FROM youtube_channels c
LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
WHERE c.name LIKE '%빠니보틀%' OR c.name LIKE '%홍민영%'
GROUP BY c.channel_id, c.name
ORDER BY c.name;

-- ✅ Expected: history_count = 0

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 3: Fix 홍민영 Abnormal daily_views_per_video
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Update 홍민영's daily_views_per_video to a reasonable value
-- Estimate: 1% of average views per video as daily increase
UPDATE youtube_channels
SET
  daily_views_per_video = CASE
    WHEN video_count > 0 THEN
      ROUND((total_views::numeric / video_count) * 0.01)
    ELSE 0
  END,
  updated_at = NOW()
WHERE name LIKE '%홍민영%';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 4: Verify Final State
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  name,
  subscribers,
  total_views,
  video_count,
  views_per_video,
  daily_views_per_video,
  last_updated
FROM youtube_channels
WHERE name LIKE '%빠니보틀%' OR name LIKE '%홍민영%'
ORDER BY name;

-- ✅ Expected Results:
-- - 빠니보틀: daily_views_per_video = reasonable number (not 33 trillion!)
-- - 홍민영: daily_views_per_video = reasonable number (not 31-e33...)
-- - Both channels: No history records

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Optional: Clean up ALL channels with abnormal values
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Find all channels with suspiciously high daily_views_per_video
SELECT
  name,
  daily_views_per_video,
  views_per_video
FROM youtube_channels
WHERE daily_views_per_video > views_per_video * 10  -- More than 10x average
ORDER BY daily_views_per_video DESC;

-- Fix all abnormal values
UPDATE youtube_channels
SET
  daily_views_per_video = CASE
    WHEN video_count > 0 THEN
      ROUND((total_views::numeric / video_count) * 0.01)
    ELSE 0
  END,
  updated_at = NOW()
WHERE daily_views_per_video > views_per_video * 10;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Next Steps
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- After running this SQL:
-- 1. Run: npx tsx src/scripts/backfill-realistic-history.ts
--    → Creates 30 days of realistic past data
--
-- 2. Run: curl -X POST http://localhost:3001/api/admin/youtube/update-history \
--           -H "Content-Type: application/json" \
--           -d '{"channelNames": ["빠니보틀 Pani Bottle", "홍민영"]}'
--    → Creates today's history record with real YouTube API data
--
-- 3. Check: http://localhost:3001/youtube-industry/Y05
--    → Verify graph shows natural variation
