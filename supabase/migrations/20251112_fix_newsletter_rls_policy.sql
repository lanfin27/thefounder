-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Newsletter RLS Policy Hotfix
-- Issue: TO public doesn't allow anon role to INSERT
-- Fix: Explicitly grant INSERT permission to anon and authenticated roles
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Drop existing INSERT policy
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Create new INSERT policy with explicit anon role
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated  -- ✅ Explicitly grant to anon (unauthenticated) and authenticated
  WITH CHECK (true);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Verify the policy was created successfully
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  '✅ RLS policy successfully updated!' as status,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'newsletter_subscribers'
AND policyname = 'Anyone can subscribe to newsletter';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Expected output:
-- policyname: "Anyone can subscribe to newsletter"
-- operation: "INSERT"
-- roles: {anon, authenticated}
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
