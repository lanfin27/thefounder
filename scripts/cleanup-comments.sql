-- ========================================
-- Comment Database Cleanup Script
-- ========================================
-- Run this in Supabase SQL Editor to clean up comment data

-- STEP 1: Check current state
-- ========================================

-- See all comments with their post associations
SELECT
  id,
  post_id,
  content,
  created_at,
  CASE
    WHEN post_id IS NULL THEN '❌ NULL - Will show everywhere!'
    ELSE '✅ Valid'
  END as status
FROM comments
ORDER BY created_at DESC;

-- Count comments by status
SELECT
  COUNT(*) as total_comments,
  COUNT(post_id) as comments_with_post_id,
  COUNT(*) - COUNT(post_id) as comments_with_null_post_id
FROM comments;


-- STEP 2: Find orphaned comments (NULL post_id)
-- ========================================

SELECT
  id,
  content,
  created_at,
  user_id
FROM comments
WHERE post_id IS NULL
ORDER BY created_at DESC;


-- STEP 3: OPTION A - Delete ALL comments (recommended for fresh start)
-- ========================================
-- Uncomment the following lines to execute:

-- DELETE FROM comments;
--
-- SELECT COUNT(*) as remaining_comments FROM comments;
-- Expected result: 0


-- STEP 4: OPTION B - Delete only NULL post_id comments
-- ========================================
-- Uncomment to delete only orphaned comments:

-- DELETE FROM comments
-- WHERE post_id IS NULL;
--
-- SELECT COUNT(*) as remaining_comments FROM comments;


-- STEP 5: Verify cleanup
-- ========================================

-- Check that no NULL post_ids remain
SELECT
  COUNT(*) as null_post_id_count
FROM comments
WHERE post_id IS NULL;
-- Expected result: 0

-- Verify all comments have valid post_id
SELECT
  c.id as comment_id,
  c.post_id,
  c.content,
  c.created_at
FROM comments c
ORDER BY c.created_at DESC
LIMIT 20;


-- STEP 6: (Optional) View comments grouped by post
-- ========================================

-- See how many comments each post has
SELECT
  post_id,
  COUNT(*) as comment_count,
  MAX(created_at) as last_comment_at
FROM comments
WHERE post_id IS NOT NULL
GROUP BY post_id
ORDER BY comment_count DESC;


-- STEP 7: (Optional) Find posts without comments
-- ========================================

-- Note: Replace 'posts' with your actual posts table name if different
-- This helps you see which posts have no comments yet

-- SELECT
--   p.id,
--   p.title,
--   p.slug,
--   COUNT(c.id) as comment_count
-- FROM posts p
-- LEFT JOIN comments c ON c.post_id = p.id
-- GROUP BY p.id, p.title, p.slug
-- HAVING COUNT(c.id) = 0
-- ORDER BY p.created_at DESC;


-- ========================================
-- SUMMARY OF RECOMMENDED ACTIONS:
-- ========================================
-- 1. Run STEP 1 to see current state
-- 2. Run STEP 2 to see problematic comments
-- 3. Choose STEP 3 (delete all) OR STEP 4 (delete only NULL)
-- 4. Run STEP 5 to verify cleanup
-- 5. Test in browser - all comments should be post-specific
-- ========================================
