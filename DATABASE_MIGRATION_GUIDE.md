# 📊 Database Migration Guide - Library Features

**Date**: 2025-11-10
**Migration File**: `supabase/migrations/20251110_library_features.sql`
**Status**: Ready to execute

---

## 🎯 Overview

This migration creates the database schema for the Library features (Lists and Comments/Responses) in The Founder project. It adds three new tables with proper indexes, RLS policies, and triggers.

---

## 📋 What This Migration Does

### Tables Created:
1. **lists** - User-created collections of posts
2. **list_items** - Individual posts within lists
3. **comments** - User comments on posts

### Additional Components:
- 11 performance indexes
- 11 Row Level Security (RLS) policies
- 2 auto-update triggers for timestamps
- Verification queries

---

## ⚠️ CRITICAL: Run This Migration First!

**Without running this migration, the library features will NOT work!**

The current page implementations query these tables. If the tables don't exist, you'll experience:
- ❌ Pages showing "로딩 중..." forever
- ❌ Console errors about missing relations
- ❌ Features completely non-functional

---

## 🚀 How to Run the Migration

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **the-founder**

### Step 2: Access SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click **New Query** button (top right)
3. A blank SQL editor will open

### Step 3: Copy the Migration SQL
1. Open the migration file on your local machine:
   ```
   C:\Users\KIMJAEHEON\the-founder\supabase\migrations\20251110_library_features.sql
   ```
2. Copy the **ENTIRE file contents** (all 248 lines)
3. Important: Make sure you get everything from the first line to the last

### Step 4: Paste and Execute
1. Paste the SQL into the Supabase SQL Editor
2. Review the code (optional but recommended)
3. Click **RUN** button (or press Ctrl+Enter / Cmd+Enter)
4. Wait for execution to complete (should take 2-5 seconds)

### Step 5: Verify Success
You should see output similar to this:

```
✅ Migration completed successfully!

Tables created: 3
Indexes created: 11
RLS policies created: 11
```

If you see any errors, **STOP** and check the error message.

---

## 🔍 What Gets Created

### Table 1: `lists`
Stores user-created reading lists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| name | TEXT | List name (1-100 chars) |
| description | TEXT | Optional description (max 500 chars) |
| cover_image | TEXT | Optional cover image URL |
| is_default | BOOLEAN | Whether this is the default list |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**RLS Policies**: Users can only view/edit/delete their own lists

### Table 2: `list_items`
Stores individual posts within lists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| list_id | UUID | Foreign key to lists |
| post_id | TEXT | Notion post ID |
| note | TEXT | Optional user note |
| added_at | TIMESTAMPTZ | When post was added |

**Unique Constraint**: Same post can't be added to same list twice
**RLS Policies**: Users can only manage items in their own lists

### Table 3: `comments`
Stores user comments on posts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| post_id | TEXT | Notion post ID |
| parent_id | UUID | Optional parent comment (for replies) |
| content | TEXT | Comment text (required, non-empty) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last edit timestamp |

**RLS Policies**: Authenticated users can read all, but only edit/delete their own

---

## 🛡️ Security Features

All tables have Row Level Security (RLS) enabled:

1. **Lists**: Users can only access their own lists
2. **List Items**: Users can only manage items in their own lists
3. **Comments**: Anyone can read, but only owners can modify

This ensures data privacy and prevents unauthorized access.

---

## 📊 Performance Optimizations

The migration includes 11 indexes for optimal query performance:

### Lists Table Indexes:
- `idx_lists_user_id` - Fast user list lookups
- `idx_lists_created_at` - Chronological ordering
- `idx_lists_updated_at` - Recent activity sorting

### List Items Table Indexes:
- `idx_list_items_list_id` - Fast list item queries
- `idx_list_items_post_id` - Quick post lookups
- `idx_list_items_added_at` - Chronological ordering

### Comments Table Indexes:
- `idx_comments_user_id` - User comment lookups
- `idx_comments_post_id` - Post comments queries
- `idx_comments_parent_id` - Reply thread queries
- `idx_comments_created_at` - Chronological ordering
- `idx_comments_post_parent_created` - Composite index for nested queries

---

## 🔄 Auto-Update Triggers

Two triggers automatically maintain `updated_at` timestamps:

1. **lists**: Updates `updated_at` on any list modification
2. **comments**: Updates `updated_at` when comments are edited

No manual timestamp management required!

---

## 🧪 Verification Queries

The migration includes verification queries that run automatically:

```sql
-- Check tables were created
SELECT 'Tables created: ' || COUNT(*)::TEXT
FROM pg_tables
WHERE tablename IN ('lists', 'list_items', 'comments');

-- Check indexes were created
SELECT 'Indexes created: ' || COUNT(*)::TEXT
FROM pg_indexes
WHERE tablename IN ('lists', 'list_items', 'comments');

-- Check RLS policies were created
SELECT 'RLS policies created: ' || COUNT(*)::TEXT
FROM pg_policies
WHERE tablename IN ('lists', 'list_items', 'comments');
```

These confirm everything was set up correctly.

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
**Solution**: Tables already exist. Check if migration was run before.
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE tablename IN ('lists', 'list_items', 'comments');
```

### Error: "permission denied"
**Solution**: Make sure you're using the Supabase dashboard SQL editor with admin access.

### Error: "invalid UUID syntax"
**Solution**: UUID extension might not be enabled. The migration includes:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "RLS policy already exists"
**Solution**: The migration uses `DROP POLICY IF EXISTS` before creating policies, so this shouldn't happen. If it does, manually drop conflicting policies first.

---

## 🎯 After Migration: Next Steps

### 1. Verify Tables Exist
Open **Table Editor** in Supabase and confirm you see:
- ✅ lists
- ✅ list_items
- ✅ comments

### 2. Test the Application
1. Open http://localhost:3001
2. Navigate to `/library/lists`
3. Page should load without infinite spinner
4. You should see "새 리스트 만들기" button
5. Navigate to `/library/responses`
6. Should show "아직 작성한 댓글이 없습니다."

### 3. Create Test Data (Optional)
Create a test list to verify functionality:
```sql
INSERT INTO lists (user_id, name, description, is_default)
SELECT
  id as user_id,
  '테스트 리스트' as name,
  '이것은 테스트 리스트입니다' as description,
  true as is_default
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'
LIMIT 1;
```

---

## 📝 Migration File Location

**Local Path**:
```
C:\Users\KIMJAEHEON\the-founder\supabase\migrations\20251110_library_features.sql
```

**File Size**: 248 lines
**Created**: 2025-11-10

---

## 🔐 Important Notes

1. **Backup Recommended**: Although this migration only creates new tables (doesn't modify existing data), it's good practice to backup your database first

2. **No Data Loss**: This migration is 100% safe - it only creates new structures, doesn't touch existing data

3. **Reversible**: If needed, you can drop the tables later:
   ```sql
   DROP TABLE IF EXISTS comments CASCADE;
   DROP TABLE IF EXISTS list_items CASCADE;
   DROP TABLE IF EXISTS lists CASCADE;
   ```

4. **Production Ready**: This migration follows PostgreSQL and Supabase best practices

---

## ✅ Success Checklist

After running the migration, verify:

- [ ] SQL executed without errors
- [ ] Verification queries show correct counts
- [ ] Tables visible in Supabase Table Editor
- [ ] `/library/lists` page loads without spinner
- [ ] `/library/responses` page loads without spinner
- [ ] No console errors about missing relations

---

## 📞 Need Help?

If you encounter issues:

1. Check error message in SQL Editor
2. Verify you're in the correct Supabase project
3. Confirm you have admin/owner access
4. Check if tables already exist
5. Review the TROUBLESHOOTING section above

---

**Remember**: This migration must be run BEFORE using the library features!

Without it, pages will show infinite loading and features won't work.

---

**Migration Ready** ✅
**Safe to Execute** ✅
**Production Quality** ✅
