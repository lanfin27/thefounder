-- ============================================================
-- Backfill Missing User Profiles & Verify Trigger
-- This migration ensures all auth.users have profiles
-- Date: 2025-12-01
-- ============================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Check current status
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Show count difference
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM user_profiles) as user_profiles_count,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM user_profiles) as missing_profiles;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Recreate Trigger Function (Idempotent)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with minimal data
  -- full_name empty = user will be redirected to setup-profile
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''  -- Empty = needs profile setup
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'free',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Skip if already exists

  RETURN NEW;
END;
$$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Recreate Trigger (Idempotent)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 4: Backfill Missing Profiles
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  subscription_tier,
  subscription_status,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    ''  -- Empty = needs profile setup
  ),
  COALESCE(u.raw_user_meta_data->>'role', 'user'),
  'free',
  'active',
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL;  -- Only users without profiles

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 5: Verify Results
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Show final count (should be 0 missing)
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM user_profiles) as user_profiles_count,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM user_profiles) as missing_profiles,
  CASE
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM user_profiles)
    THEN '✅ All users have profiles!'
    ELSE '❌ Still missing profiles'
  END as status;

-- Show trigger status
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================
-- MANUAL EXECUTION INSTRUCTIONS
-- ============================================================
--
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- 5. Check the results
--
-- Expected Result:
-- - auth_users_count = user_profiles_count
-- - missing_profiles = 0
-- - status = '✅ All users have profiles!'
-- - Trigger on_auth_user_created exists
--
-- ============================================================
