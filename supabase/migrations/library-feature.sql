-- ========================================
-- Medium-Style Library Feature Migration
-- ========================================
-- Execute this script in Supabase SQL Editor

-- STEP 1: Create lists table
-- ========================================
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image VARCHAR(500),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_list_name UNIQUE(user_id, name)
);

-- Indexes for lists
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_created_at ON lists(created_at DESC);

-- STEP 2: Create list_items table
-- ========================================
CREATE TABLE IF NOT EXISTS list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  post_id VARCHAR(255) NOT NULL,  -- Notion page ID
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,

  CONSTRAINT unique_list_post UNIQUE(list_id, post_id)
);

-- Indexes for list_items
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_post_id ON list_items(post_id);
CREATE INDEX IF NOT EXISTS idx_list_items_added_at ON list_items(added_at DESC);

-- STEP 3: Create reading_history table
-- ========================================
CREATE TABLE IF NOT EXISTS reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id VARCHAR(255) NOT NULL,  -- Notion page ID
  first_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_count INTEGER DEFAULT 1,
  read_progress INTEGER DEFAULT 0,  -- Percentage (0-100)

  CONSTRAINT unique_user_post_history UNIQUE(user_id, post_id)
);

-- Indexes for reading_history
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON reading_history(last_read_at DESC);

-- STEP 4: Add indexes to existing comments table
-- ========================================
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- STEP 5: Enable Row Level Security
-- ========================================
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS Policies for lists
-- ========================================

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can create own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;

-- Lists: Users can only see/modify their own lists
CREATE POLICY "Users can view own lists" ON lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lists" ON lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists" ON lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists" ON lists
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 7: Create RLS Policies for list_items
-- ========================================

DROP POLICY IF EXISTS "Users can view items in own lists" ON list_items;
DROP POLICY IF EXISTS "Users can add items to own lists" ON list_items;
DROP POLICY IF EXISTS "Users can remove items from own lists" ON list_items;

-- List Items: Users can only modify items in their lists
CREATE POLICY "Users can view items in own lists" ON list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to own lists" ON list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from own lists" ON list_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- STEP 8: Create RLS Policies for reading_history
-- ========================================

DROP POLICY IF EXISTS "Users can view own reading history" ON reading_history;
DROP POLICY IF EXISTS "Users can create own reading history" ON reading_history;
DROP POLICY IF EXISTS "Users can update own reading history" ON reading_history;
DROP POLICY IF EXISTS "Users can delete own reading history" ON reading_history;

-- Reading History: Users can only see/modify their own history
CREATE POLICY "Users can view own reading history" ON reading_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reading history" ON reading_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading history" ON reading_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading history" ON reading_history
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 9: Create function to automatically create default Reading List
-- ========================================

DROP FUNCTION IF EXISTS create_default_reading_list() CASCADE;

CREATE OR REPLACE FUNCTION create_default_reading_list()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lists (user_id, name, description, is_default)
  VALUES (
    NEW.id,
    'Reading List',
    '나중에 읽을 글들을 저장하세요',
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create default list for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_create_list ON auth.users;

CREATE TRIGGER on_auth_user_created_create_list
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_reading_list();

-- STEP 10: Create helper function to get lists with post counts
-- ========================================

DROP FUNCTION IF EXISTS get_lists_with_counts(UUID);

CREATE OR REPLACE FUNCTION get_lists_with_counts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  cover_image VARCHAR,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  post_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.description,
    l.cover_image,
    l.is_default,
    l.created_at,
    l.updated_at,
    COUNT(li.id) as post_count
  FROM lists l
  LEFT JOIN list_items li ON l.id = li.list_id
  WHERE l.user_id = p_user_id
  GROUP BY l.id, l.name, l.description, l.cover_image, l.is_default, l.created_at, l.updated_at
  ORDER BY l.is_default DESC, l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION QUERIES (Uncomment to run)
-- ========================================

-- Verify tables were created
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('lists', 'list_items', 'reading_history');

-- Check RLS policies
-- SELECT * FROM pg_policies
-- WHERE tablename IN ('lists', 'list_items', 'reading_history');

-- Test function
-- SELECT * FROM get_lists_with_counts(auth.uid());

-- ========================================
-- Migration Complete! ✅
-- ========================================
