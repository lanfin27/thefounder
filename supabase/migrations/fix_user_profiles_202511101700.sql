-- =============================================================================
-- User Profiles Fix & Setup Script
-- Created: 2025-11-10
-- Purpose: Create missing user profiles and set admin permissions
-- =============================================================================

-- 📋 Step 1: Check current users and profiles
-- Run this first to see the current state
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENT STATE CHECK';
  RAISE NOTICE '========================================';
END $$;

SELECT
  '👤 Auth Users' as category,
  COUNT(*) as count,
  string_agg(email, ', ') as emails
FROM auth.users
UNION ALL
SELECT
  '📝 User Profiles' as category,
  COUNT(*) as count,
  string_agg(email, ', ') as emails
FROM user_profiles;

-- =============================================================================
-- 🔧 Step 2: Auto-create missing profiles for existing users
-- This will create profiles for any users who don't have one yet
-- =============================================================================

DO $$
DECLARE
  created_count INTEGER := 0;
  user_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CREATING MISSING PROFILES';
  RAISE NOTICE '========================================';

  FOR user_record IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN user_profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO user_profiles (id, email, name, role)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'name', user_record.email),
      'user'
    )
    ON CONFLICT (id) DO NOTHING;

    created_count := created_count + 1;
    RAISE NOTICE '✅ Created profile for: %', user_record.email;
  END LOOP;

  IF created_count = 0 THEN
    RAISE NOTICE '✨ All users already have profiles!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total profiles created: %', created_count;
  END IF;
END $$;

-- =============================================================================
-- 🛡️ Step 3: Set admin role for specific user(s)
-- IMPORTANT: Replace 'your-email@example.com' with your actual email!
-- =============================================================================

DO $$
DECLARE
  admin_email TEXT := 'macrohand27@gmail.com'; -- 🔥 CHANGE THIS!
  updated_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SETTING ADMIN PERMISSIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  Target email: %', admin_email;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = admin_email) THEN
    RAISE EXCEPTION '❌ User with email % does not exist!', admin_email;
  END IF;

  -- Update to admin
  UPDATE user_profiles
  SET role = 'admin'
  WHERE email = admin_email
  AND role != 'admin'; -- Only update if not already admin

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Successfully set % as admin', admin_email;
  ELSE
    RAISE NOTICE '✨ User % is already an admin', admin_email;
  END IF;
END $$;

-- =============================================================================
-- 📊 Step 4: Final verification - Show all profiles
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL STATE';
  RAISE NOTICE '========================================';
END $$;

SELECT
  email,
  role,
  CASE role
    WHEN 'admin' THEN '🛡️ Admin'
    WHEN 'user' THEN '👤 User'
    ELSE '❓ Unknown'
  END as role_display,
  created_at,
  updated_at
FROM user_profiles
ORDER BY
  CASE role WHEN 'admin' THEN 0 ELSE 1 END,
  created_at DESC;

-- =============================================================================
-- 📈 Statistics
-- =============================================================================

SELECT
  'Total Users' as metric,
  COUNT(*) as value
FROM user_profiles
UNION ALL
SELECT
  'Admins' as metric,
  COUNT(*) as value
FROM user_profiles
WHERE role = 'admin'
UNION ALL
SELECT
  'Regular Users' as metric,
  COUNT(*) as value
FROM user_profiles
WHERE role = 'user';

-- =============================================================================
-- 🎯 USAGE INSTRUCTIONS
-- =============================================================================
--
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Click "New Query"
-- 3. **IMPORTANT**: Change 'your-email@example.com' on line 67 to YOUR email
-- 4. Copy and paste this entire file
-- 5. Click "Run" (or press Ctrl+Enter)
-- 6. Check the output to verify:
--    ✅ All users have profiles
--    ✅ Your email is set as admin
--    ✅ Trigger is working
--
-- =============================================================================
-- 🔍 TROUBLESHOOTING
-- =============================================================================
--
-- Problem: "User with email X does not exist"
-- Solution: The email you entered doesn't match any user.
--           Run this to see all available emails:
--           SELECT email FROM auth.users;
--
-- Problem: Still getting 403 errors
-- Solution:
--   1. Clear browser cookies and cache
--   2. Log out and log back in
--   3. Check browser console for errors
--   4. Verify middleware is running (check terminal logs)
--
-- =============================================================================
