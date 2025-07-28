-- Update existing Korean slugs to English slugs
-- This migration converts Korean slugs to URL-safe English slugs

-- First, let's check what slugs we have
DO $$
BEGIN
    -- Update known Korean slugs to English equivalents
    UPDATE posts 
    SET slug = 'startup-entrepreneur-five-rules-should-know'
    WHERE slug = '스타트업-창업자가-알아야-할-5가지-법칙';

    -- The SaaS post already has an English slug, so we don't need to update it
    -- slug = 'saas-business-model-guide-for-beginners' (already correct)

    -- Add more updates here if there are other Korean slugs
    -- UPDATE posts SET slug = 'new-english-slug' WHERE slug = 'old-korean-slug';

    -- Log the changes
    RAISE NOTICE 'Updated Korean slugs to English slugs';
END $$;

-- Verify that all slugs are now URL-safe (contains only lowercase letters, numbers, and hyphens)
-- This query will show any posts that still have non-URL-safe slugs
DO $$
DECLARE
    invalid_slug_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_slug_count
    FROM posts
    WHERE slug !~ '^[a-z0-9-]+$';
    
    IF invalid_slug_count > 0 THEN
        RAISE WARNING 'Found % posts with invalid slugs', invalid_slug_count;
    ELSE
        RAISE NOTICE 'All slugs are now URL-safe';
    END IF;
END $$;