-- ============================================================
-- User Profiles Schema & Trigger Migration
-- Medium-style Email Authentication Support
-- Keep 'user' role for compatibility with existing code
-- Date: 2025-11-12
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Update role constraint (KEEP 'user')
-- ============================================================

-- Drop existing constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with 'user' (not 'member')
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('user', 'admin', 'guest'));

-- Keep default as 'user'
ALTER TABLE user_profiles
ALTER COLUMN role SET DEFAULT 'user';

-- ============================================================
-- STEP 2: Add full_name column
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name TEXT;

    -- Copy existing name values to full_name
    UPDATE user_profiles
    SET full_name = name
    WHERE name IS NOT NULL AND name != '';

    RAISE NOTICE 'full_name column added to user_profiles';
  ELSE
    RAISE NOTICE 'full_name column already exists';
  END IF;
END $$;

-- ============================================================
-- STEP 3: Update trigger function
-- ============================================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    full_name,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    'user'  -- Use 'user' role (compatible with existing code)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 4: Verification
-- ============================================================

-- Check migration results
SELECT
  'Migration completed successfully' as status,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'user') as user_count,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'admin') as admin_count,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'guest') as guest_count;

-- Verify trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  'Trigger installed successfully' as trigger_status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verify full_name column exists
SELECT
  column_name,
  data_type,
  'Column exists' as column_status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
AND column_name IN ('full_name', 'name', 'role');

COMMIT;

-- ============================================================
-- Migration Summary
-- ============================================================
-- 1. Role constraint updated: 'user', 'admin', 'guest' (kept 'user')
-- 2. Default role: 'user' (unchanged)
-- 3. full_name column added for Medium-style auth
-- 4. Trigger fixed to use user_profiles (not profiles)
-- 5. New users get 'user' role (compatible with existing code)
-- 6. No existing code changes needed
-- ============================================================
