-- =============================================================================
-- ADMIN MENU DIAGNOSTIC SCRIPT
-- Purpose: Identify why Admin menu is not showing
-- Email: macrohand27@gmail.com
-- =============================================================================

-- 📋 STEP 1: Check ALL auth users (exact format)
SELECT
  '=== AUTH USERS ===' as section,
  id,
  email,
  email_confirmed_at IS NOT NULL as confirmed,
  LENGTH(email) as email_length,
  LENGTH(TRIM(email)) as trimmed_length,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 📋 STEP 2: Check ALL user profiles
SELECT
  '=== USER PROFILES ===' as section,
  p.id,
  p.email as profile_email,
  p.role,
  p.created_at,
  p.updated_at
FROM user_profiles p
ORDER BY p.created_at DESC;

-- 📋 STEP 3: Check for email match between auth and profiles
SELECT
  '=== EMAIL MATCHING ===' as section,
  u.id,
  u.email as auth_email,
  p.email as profile_email,
  p.role,
  CASE
    WHEN u.email = p.email THEN '✅ Perfect Match'
    WHEN LOWER(u.email) = LOWER(p.email) THEN '⚠️ Case Mismatch'
    WHEN TRIM(u.email) = TRIM(p.email) THEN '⚠️ Space Issues'
    ELSE '❌ No Match'
  END as match_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 📋 STEP 4: Check for your specific email
SELECT
  '=== YOUR ACCOUNT ===' as section,
  u.id,
  u.email as auth_email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.email as profile_email,
  p.role,
  CASE
    WHEN p.role = 'admin' THEN '✅ IS ADMIN'
    WHEN p.role = 'user' THEN '⚠️ IS USER (NOT ADMIN)'
    WHEN p.role IS NULL THEN '❌ NO PROFILE'
    ELSE '❓ UNKNOWN ROLE'
  END as admin_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email ILIKE '%macrohand%' OR p.email ILIKE '%macrohand%'
ORDER BY u.created_at DESC;

-- 📋 STEP 5: Check for duplicate profiles
SELECT
  '=== DUPLICATE CHECK ===' as section,
  email,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) > 1 THEN '❌ DUPLICATE!'
    ELSE '✅ Unique'
  END as status
FROM user_profiles
GROUP BY email
HAVING COUNT(*) > 1
UNION ALL
SELECT
  '=== DUPLICATE CHECK ===' as section,
  'No duplicates found' as email,
  0 as count,
  '✅ All Good' as status
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles GROUP BY email HAVING COUNT(*) > 1
);

-- 📋 STEP 6: Statistics
SELECT
  '=== STATISTICS ===' as section,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM user_profiles) as total_profiles,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'admin') as admin_count,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'user') as user_count,
  (SELECT COUNT(*) FROM auth.users u LEFT JOIN user_profiles p ON u.id = p.id WHERE p.id IS NULL) as users_without_profile;

-- 📋 STEP 7: RLS Policies Check
SELECT
  '=== RLS POLICIES ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- =============================================================================
-- 🔧 QUICK FIX SCRIPT (Run if profile is wrong)
-- =============================================================================

-- UNCOMMENT AND RUN THIS SECTION IF NEEDED:

/*
-- Force update profile to admin (replace [USER_ID] with actual ID from above)
UPDATE user_profiles
SET role = 'admin',
    email = 'macrohand27@gmail.com',
    updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'macrohand27@gmail.com');

-- If profile doesn't exist, create it:
INSERT INTO user_profiles (id, email, role, created_at, updated_at)
SELECT
  id,
  email,
  'admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'macrohand27@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verify the fix:
SELECT
  u.email as auth_email,
  p.email as profile_email,
  p.role,
  CASE WHEN p.role = 'admin' THEN '✅ SUCCESS' ELSE '❌ STILL NOT ADMIN' END as status
FROM auth.users u
INNER JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'macrohand27@gmail.com';
*/
