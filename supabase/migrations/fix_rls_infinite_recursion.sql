-- ============================================
-- 🔧 FIX INFINITE RECURSION IN RLS POLICIES
-- Date: 2025-11-10
-- Error: 42P17 - infinite recursion detected
-- ============================================

-- ⚠️ IMPORTANT: Run this in Supabase Dashboard → SQL Editor

-- Step 1: Drop all existing problematic policies
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Removing old policies';
  RAISE NOTICE '========================================';
END $$;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;

DO $$
BEGIN
  RAISE NOTICE '✅ Old policies removed';
END $$;

-- Step 2: Create helper function to check admin status (bypasses RLS)
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Creating is_admin helper function';
  RAISE NOTICE '========================================';
END $$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Helper function created with SECURITY DEFINER';
END $$;

-- Step 3: Create new policies using the helper function
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Creating new RLS policies';
  RAISE NOTICE '========================================';
END $$;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

DO $$ BEGIN RAISE NOTICE '✅ Policy 1: Users can view own profile'; END $$;

-- Policy 2: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ Policy 2: Users can update own profile'; END $$;

-- Policy 3: Admins can view all profiles (uses helper function)
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ Policy 3: Admins can view all profiles'; END $$;

-- Policy 4: Admins can update all profiles (uses helper function)
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ Policy 4: Admins can update all profiles'; END $$;

-- Policy 5: Admins can delete profiles (except own, uses helper function)
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
USING (
  public.is_admin(auth.uid())
  AND id != auth.uid()
);

DO $$ BEGIN RAISE NOTICE '✅ Policy 5: Admins can delete profiles'; END $$;

-- Policy 6: Enable INSERT for authenticated users (for auto-creation)
CREATE POLICY "Authenticated users can insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DO $$ BEGIN RAISE NOTICE '✅ Policy 6: Authenticated users can insert own profile'; END $$;

-- Step 4: Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN RAISE NOTICE '✅ RLS enabled on user_profiles'; END $$;

-- Step 5: Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: VERIFICATION';
  RAISE NOTICE '========================================';
END $$;

SELECT
  '✅ POLICIES' as section,
  policyname,
  cmd as operation,
  CASE
    WHEN qual LIKE '%is_admin%' THEN '✅ Uses helper (no recursion)'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Simple check (no recursion)'
    ELSE '⚠️  Check manually'
  END as recursion_safe
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Test the helper function
SELECT
  '✅ FUNCTION TEST' as section,
  u.email,
  p.role,
  public.is_admin(u.id) as is_admin_function_result,
  CASE
    WHEN p.role = 'admin' AND public.is_admin(u.id) = true THEN '✅ FUNCTION WORKS'
    WHEN p.role = 'admin' AND public.is_admin(u.id) = false THEN '❌ FUNCTION BROKEN'
    WHEN p.role = 'user' AND public.is_admin(u.id) = false THEN '✅ FUNCTION WORKS'
    ELSE '⚠️ UNEXPECTED STATE'
  END as function_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email ILIKE '%macrohand%'
LIMIT 1;

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Total Policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles');
  RAISE NOTICE '🔐 RLS Status: %', (SELECT CASE WHEN relrowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END FROM pg_class WHERE relname = 'user_profiles');
  RAISE NOTICE '⚡ Helper Function: %', (SELECT CASE WHEN COUNT(*) > 0 THEN 'EXISTS ✅' ELSE 'MISSING ❌' END FROM pg_proc WHERE proname = 'is_admin');
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Clear browser cache (Ctrl+Shift+Delete)';
  RAISE NOTICE '2. Logout completely';
  RAISE NOTICE '3. Login fresh with macrohand27@gmail.com';
  RAISE NOTICE '4. Check for Admin menu in sidebar';
  RAISE NOTICE '5. Try accessing http://localhost:3000/admin';
  RAISE NOTICE '';
END $$;
