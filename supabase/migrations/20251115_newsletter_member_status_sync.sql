-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Newsletter Member Status Auto-Sync Trigger
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Purpose: Automatically update newsletter_subscribers.is_member
--          when a user signs up (user_profiles record created)
--
-- Trigger Flow:
--   user signs up → user_profiles INSERT → trigger fires →
--   newsletter_subscribers updated (if exists)
--
-- Created: 2025-11-15
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Drop existing trigger and function if they exist
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP TRIGGER IF EXISTS on_user_profile_created_sync_newsletter ON public.user_profiles;
DROP TRIGGER IF EXISTS on_user_profile_deleted_sync_newsletter ON public.user_profiles;
DROP FUNCTION IF EXISTS public.sync_newsletter_member_status();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Create sync function
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.sync_newsletter_member_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscriber_email TEXT;
BEGIN
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- Case 1: User Profile Created (INSERT)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IF (TG_OP = 'INSERT') THEN
    subscriber_email := LOWER(NEW.email);

    -- Update newsletter_subscribers to member status
    UPDATE public.newsletter_subscribers
    SET
      is_member = true,
      user_id = NEW.id,
      member_since = NEW.created_at,
      updated_at = NOW()
    WHERE
      LOWER(email) = subscriber_email
      AND is_member = false;  -- Only update if currently non-member

    -- Log the update (optional - for debugging)
    IF FOUND THEN
      RAISE NOTICE '[Newsletter Sync Trigger] ✅ Updated % to member status', subscriber_email;
    END IF;

    RETURN NEW;
  END IF;

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- Case 2: User Profile Deleted (DELETE) - Optional
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IF (TG_OP = 'DELETE') THEN
    subscriber_email := LOWER(OLD.email);

    -- Revert newsletter_subscribers to non-member status
    UPDATE public.newsletter_subscribers
    SET
      is_member = false,
      user_id = NULL,
      member_since = NULL,
      updated_at = NOW()
    WHERE
      LOWER(email) = subscriber_email
      AND is_member = true;  -- Only update if currently member

    -- Log the update (optional - for debugging)
    IF FOUND THEN
      RAISE NOTICE '[Newsletter Sync Trigger] ⚠️  Reverted % to non-member status', subscriber_email;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Create trigger for user_profiles INSERT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TRIGGER on_user_profile_created_sync_newsletter
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_newsletter_member_status();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Create trigger for user_profiles DELETE (Optional)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TRIGGER on_user_profile_deleted_sync_newsletter
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_newsletter_member_status();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Bulk update existing inconsistent data
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Update subscribers who are registered members but marked as non-members
UPDATE public.newsletter_subscribers ns
SET
  is_member = true,
  user_id = up.id,
  member_since = up.created_at,
  updated_at = NOW()
FROM public.user_profiles up
WHERE
  LOWER(ns.email) = LOWER(up.email)
  AND ns.is_member = false
  AND up.id IS NOT NULL;

-- Update subscribers who are not registered but marked as members
UPDATE public.newsletter_subscribers ns
SET
  is_member = false,
  user_id = NULL,
  member_since = NULL,
  updated_at = NOW()
WHERE
  ns.is_member = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE LOWER(up.email) = LOWER(ns.email)
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Grant necessary permissions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_newsletter_member_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_newsletter_member_status() TO service_role;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. Verification queries (for manual testing)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check trigger status
-- SELECT
--   trigger_name,
--   event_manipulation,
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%newsletter%';

-- Check for inconsistencies (should return 0 rows after migration)
-- SELECT
--   ns.email,
--   ns.is_member AS newsletter_is_member,
--   CASE WHEN up.id IS NOT NULL THEN true ELSE false END AS actually_is_member
-- FROM public.newsletter_subscribers ns
-- LEFT JOIN public.user_profiles up ON LOWER(ns.email) = LOWER(up.email)
-- WHERE ns.is_member != (up.id IS NOT NULL);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration Complete!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
