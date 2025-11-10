-- =============================================
-- LIBRARY FEATURE DATABASE MIGRATION
-- Generated: 2025-11-10
-- Purpose: Create tables for Lists and Comments features
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE 1: LISTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  cover_image TEXT,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- TABLE 2: LIST_ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  note TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_list_post UNIQUE(list_id, post_id)
);

-- =============================================
-- TABLE 3: COMMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES (Performance Optimization)
-- =============================================

-- Lists Indexes
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_created_at ON public.lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lists_updated_at ON public.lists(updated_at DESC);

-- List Items Indexes
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON public.list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_post_id ON public.list_items(post_id);
CREATE INDEX IF NOT EXISTS idx_list_items_added_at ON public.list_items(added_at DESC);

-- Comments Indexes
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created ON public.comments(post_id, parent_id, created_at);

-- =============================================
-- RLS (Row Level Security) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- LISTS TABLE POLICIES
-- =============================================

-- Users can view own lists
DROP POLICY IF EXISTS "Users can view own lists" ON public.lists;
CREATE POLICY "Users can view own lists"
ON public.lists FOR SELECT
USING (auth.uid() = user_id);

-- Users can create own lists
DROP POLICY IF EXISTS "Users can create own lists" ON public.lists;
CREATE POLICY "Users can create own lists"
ON public.lists FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own lists
DROP POLICY IF EXISTS "Users can update own lists" ON public.lists;
CREATE POLICY "Users can update own lists"
ON public.lists FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own lists
DROP POLICY IF EXISTS "Users can delete own lists" ON public.lists;
CREATE POLICY "Users can delete own lists"
ON public.lists FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- LIST_ITEMS TABLE POLICIES
-- =============================================

-- Users can view items in own lists
DROP POLICY IF EXISTS "Users can view items in own lists" ON public.list_items;
CREATE POLICY "Users can view items in own lists"
ON public.list_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lists
  WHERE lists.id = list_items.list_id
  AND lists.user_id = auth.uid()
));

-- Users can add items to own lists
DROP POLICY IF EXISTS "Users can add items to own lists" ON public.list_items;
CREATE POLICY "Users can add items to own lists"
ON public.list_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lists
  WHERE lists.id = list_items.list_id
  AND lists.user_id = auth.uid()
));

-- Users can delete items from own lists
DROP POLICY IF EXISTS "Users can delete items from own lists" ON public.list_items;
CREATE POLICY "Users can delete items from own lists"
ON public.list_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.lists
  WHERE lists.id = list_items.list_id
  AND lists.user_id = auth.uid()
));

-- =============================================
-- COMMENTS TABLE POLICIES
-- =============================================

-- Anyone (authenticated) can view comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments"
ON public.comments FOR SELECT
TO authenticated
USING (true);

-- Users can create own comments
DROP POLICY IF EXISTS "Users can create own comments" ON public.comments;
CREATE POLICY "Users can create own comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own comments
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS: Auto-update updated_at
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lists table
DROP TRIGGER IF EXISTS update_lists_updated_at ON public.lists;
CREATE TRIGGER update_lists_updated_at
BEFORE UPDATE ON public.lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for comments table
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VERIFICATION
-- =============================================

SELECT '✅ Migration completed successfully!' AS status;

-- Verify tables created
SELECT
  'Tables created: ' || COUNT(*)::TEXT AS tables
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('lists', 'list_items', 'comments');

-- Verify indexes created
SELECT
  'Indexes created: ' || COUNT(*)::TEXT AS indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('lists', 'list_items', 'comments');

-- Verify RLS policies created
SELECT
  'RLS policies created: ' || COUNT(*)::TEXT AS policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('lists', 'list_items', 'comments');
