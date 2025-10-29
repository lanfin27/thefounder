-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Verify YouTube Channel History Data
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Execute this in Supabase SQL Editor AFTER running the backfill script
--
-- This script verifies:
-- 1. History records exist (31 days per channel)
-- 2. Values are unique (not all identical)
-- 3. Growth rates are realistic
-- 4. No abnormal values
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 1: Check History Record Counts
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  COUNT(h.id) as total_records,
  COUNT(DISTINCT h.subscribers) as unique_subscribers,
  COUNT(DISTINCT h.total_views) as unique_total_views,
  COUNT(DISTINCT h.daily_views_per_video) as unique_daily_views,
  MIN(h.date) as first_date,
  MAX(h.date) as last_date
FROM youtube_channels c
LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
GROUP BY c.channel_id, c.name
ORDER BY c.name;

-- ✅ Expected Results:
-- - total_records: 31 (30 past days + today)
-- - unique_subscribers: 25-31 (all different values!)
-- - unique_total_views: 25-31 (all different values!)
-- - first_date: 30 days ago
-- - last_date: today

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 2: Check Value Ranges
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  MIN(h.subscribers) as min_subscribers,
  MAX(h.subscribers) as max_subscribers,
  MAX(h.subscribers) - MIN(h.subscribers) as subs_growth,
  ROUND((MAX(h.subscribers) - MIN(h.subscribers))::numeric / MIN(h.subscribers) * 100, 2) as growth_pct
FROM youtube_channels c
LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
GROUP BY c.channel_id, c.name
ORDER BY c.name;

-- ✅ Expected Results:
-- - subs_growth: 30,000 ~ 80,000 (natural growth)
-- - growth_pct: 2.5% ~ 5% (realistic monthly growth)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 3: Check Recent 7 Days in Detail
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  h.date,
  h.subscribers,
  h.video_count,
  h.total_views,
  h.avg_views_per_video,
  h.daily_views_per_video
FROM youtube_channel_history h
INNER JOIN youtube_channels c ON h.channel_id = c.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
ORDER BY c.name, h.date DESC
LIMIT 21; -- 7 days × 3 channels

-- ✅ Expected: Each date has DIFFERENT values (no duplicates!)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 4: Check Daily Growth Rates
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WITH daily_changes AS (
  SELECT
    c.name,
    h.date,
    h.subscribers,
    LAG(h.subscribers) OVER (PARTITION BY h.channel_id ORDER BY h.date) as prev_subscribers,
    h.daily_views_per_video
  FROM youtube_channel_history h
  INNER JOIN youtube_channels c ON h.channel_id = c.channel_id
  WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
  ORDER BY c.name, h.date DESC
)
SELECT
  name,
  date,
  subscribers,
  prev_subscribers,
  (subscribers - prev_subscribers) as daily_growth,
  ROUND((subscribers - prev_subscribers)::numeric / prev_subscribers * 100, 3) as growth_pct,
  daily_views_per_video
FROM daily_changes
WHERE prev_subscribers IS NOT NULL
ORDER BY name, date DESC
LIMIT 30; -- Last 10 days per channel

-- ✅ Expected Results:
-- - daily_growth: 1,000 ~ 5,000 per day
-- - growth_pct: 0.05% ~ 0.3% per day
-- - daily_views_per_video: Reasonable values (50K ~ 150K)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 5: Check for Abnormal Values
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  h.date,
  h.daily_views_per_video,
  h.avg_views_per_video,
  CASE
    WHEN h.daily_views_per_video > h.avg_views_per_video * 2 THEN '⚠️  TOO HIGH'
    WHEN h.daily_views_per_video < 0 THEN '❌ NEGATIVE'
    ELSE '✅ OK'
  END as status
FROM youtube_channel_history h
INNER JOIN youtube_channels c ON h.channel_id = c.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
  AND (
    h.daily_views_per_video > h.avg_views_per_video * 2
    OR h.daily_views_per_video < 0
  )
ORDER BY c.name, h.date DESC;

-- ✅ Expected: No rows returned (no abnormal values!)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 6: Check Weekend Effect
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  h.date,
  TO_CHAR(h.date::date, 'Day') as day_of_week,
  h.subscribers,
  h.daily_views_per_video,
  CASE
    WHEN EXTRACT(DOW FROM h.date) IN (0, 6) THEN '🎉 Weekend'
    ELSE 'Weekday'
  END as day_type
FROM youtube_channel_history h
INNER JOIN youtube_channels c ON h.channel_id = c.channel_id
WHERE c.name = '빠니보틀 Pani Bottle'
ORDER BY h.date DESC
LIMIT 14;

-- ✅ Expected: Weekend days generally have slightly higher values

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 7: Compare With Channel Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.name,
  c.subscribers as channel_subscribers,
  c.daily_views_per_video as channel_daily_views,
  h.latest_subscribers,
  h.latest_daily_views,
  CASE
    WHEN ABS(c.subscribers - h.latest_subscribers) < 10000 THEN '✅ Match'
    ELSE '⚠️  Mismatch'
  END as status
FROM youtube_channels c
INNER JOIN (
  SELECT
    channel_id,
    MAX(subscribers) as latest_subscribers,
    MAX(daily_views_per_video) as latest_daily_views
  FROM youtube_channel_history
  GROUP BY channel_id
) h ON c.channel_id = h.channel_id
WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
ORDER BY c.name;

-- ✅ Expected: Status = '✅ Match' for all channels

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Test 8: Timeline Visualization
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  date,
  subscribers,
  REPEAT('█', FLOOR((subscribers::numeric - 1700000) / 5000)::int) as bar_chart
FROM youtube_channel_history
WHERE channel_id = (
  SELECT channel_id FROM youtube_channels WHERE name = '빠니보틀 Pani Bottle'
)
ORDER BY date;

-- ✅ Expected: Bar chart shows gradual increase (not flat line!)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Final Summary
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  '✅ History Verification Complete' as status,
  COUNT(DISTINCT c.channel_id) as channels_checked,
  SUM(history_count) as total_history_records,
  MIN(first_date) as earliest_date,
  MAX(last_date) as latest_date
FROM (
  SELECT
    c.channel_id,
    COUNT(h.id) as history_count,
    MIN(h.date) as first_date,
    MAX(h.date) as last_date
  FROM youtube_channels c
  LEFT JOIN youtube_channel_history h ON c.channel_id = h.channel_id
  WHERE c.name IN ('빠니보틀 Pani Bottle', '웨펀', '홍민영')
  GROUP BY c.channel_id
) as c;

-- ✅ Expected:
-- - channels_checked: 3
-- - total_history_records: 93 (31 × 3)
-- - Date range: 30 days

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Success Checklist
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Run these checks:
-- [ ] Test 1: All channels have 31 records
-- [ ] Test 2: Growth rate is 2.5-5%
-- [ ] Test 3: Each date has unique values
-- [ ] Test 4: Daily growth is 0.05-0.3%
-- [ ] Test 5: No abnormal values
-- [ ] Test 6: Weekend effect visible
-- [ ] Test 7: Channel table matches history
-- [ ] Test 8: Bar chart shows growth

-- If all tests pass:
-- ✅ Data is correct!
-- 🎉 Check the web UI: http://localhost:3002/youtube-industry/Y05
-- 📊 Graphs should show natural growth curves (not flat lines!)
