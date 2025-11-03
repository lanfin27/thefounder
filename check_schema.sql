-- Check youtube_channels table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'youtube_channels'
ORDER BY ordinal_position;

-- Check sample data to see actual column names
SELECT * FROM youtube_channels LIMIT 1;
