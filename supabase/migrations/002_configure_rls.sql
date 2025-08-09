-- Configure Row Level Security (RLS) for public read access
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on all tables (if not already enabled)
ALTER TABLE flippa_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incremental_changes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow public read access" ON flippa_listings;
DROP POLICY IF EXISTS "Allow authenticated insert" ON flippa_listings;
DROP POLICY IF EXISTS "Allow public read sessions" ON scraping_sessions;
DROP POLICY IF EXISTS "Allow public read changes" ON incremental_changes;

-- 3. Create read policies for anonymous users
-- Allow anyone to read flippa_listings
CREATE POLICY "Allow public read access" 
ON flippa_listings FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow anyone to read scraping_sessions
CREATE POLICY "Allow public read sessions" 
ON scraping_sessions FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow anyone to read incremental_changes
CREATE POLICY "Allow public read changes" 
ON incremental_changes FOR SELECT 
TO anon, authenticated
USING (true);

-- 4. Create write policies for service role only
-- Only service role can insert/update/delete flippa_listings
CREATE POLICY "Service role full access listings" 
ON flippa_listings FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Only service role can insert/update/delete scraping_sessions
CREATE POLICY "Service role full access sessions" 
ON scraping_sessions FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Only service role can insert/update/delete incremental_changes
CREATE POLICY "Service role full access changes" 
ON incremental_changes FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Grant necessary permissions
GRANT SELECT ON flippa_listings TO anon, authenticated;
GRANT SELECT ON scraping_sessions TO anon, authenticated;
GRANT SELECT ON incremental_changes TO anon, authenticated;

-- 6. Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('flippa_listings', 'scraping_sessions', 'incremental_changes')
ORDER BY tablename, policyname;