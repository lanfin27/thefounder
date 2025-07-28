-- Check if author column exists and rename if needed
DO $$ 
BEGIN
    -- Check if 'author' column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'author'
    ) THEN
        -- Column exists, no action needed
        NULL;
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'author_name'
    ) THEN
        -- author_name exists, rename to author
        ALTER TABLE posts RENAME COLUMN author_name TO author;
    ELSE
        -- Neither exists, add author column
        ALTER TABLE posts ADD COLUMN author TEXT;
    END IF;
END $$;