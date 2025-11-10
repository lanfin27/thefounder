# 🔧 Admin Menu Troubleshooting - Step-by-Step Guide

**Target Email**: `macrohand27@gmail.com`
**Date**: 2025-11-10
**Status**: 🔍 Diagnostic Mode Active

---

## ✅ What We've Done So Far

1. ✅ Created diagnostic SQL script: `supabase/diagnostics/check_admin_status.sql`
2. ✅ Enhanced useUser hook with detailed logging
3. ✅ Verified Admin menu code exists in Sidebar.tsx (line 105-119)
4. ✅ Middleware has auto-profile creation logic
5. ✅ Application compiling successfully

---

## 🎯 STEP 1: Run Database Diagnostic (5 minutes)

### Action Required:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Run Diagnostic SQL**
   - Click **SQL Editor** in left sidebar
   - Click **"New Query"**
   - Open this file on your computer:
     ```
     C:\Users\KIMJAEHEON\the-founder\supabase\diagnostics\check_admin_status.sql
     ```
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

3. **Review Results**
   Look for these sections in the output:

   **Section 1: AUTH USERS**
   ```
   Expected to see:
   email: macrohand27@gmail.com
   confirmed: true
   ```

   **Section 4: YOUR ACCOUNT**
   ```
   Expected to see:
   admin_status: ✅ IS ADMIN
   role: admin
   ```

   **If you see:**
   - `❌ NO PROFILE` → Profile doesn't exist for this email
   - `⚠️ IS USER (NOT ADMIN)` → Profile exists but role is 'user'
   - `❌ No Match` → Email mismatch between auth and profile

---

## 🎯 STEP 2: Fix Database Issues (If Found)

### If Profile is Missing or Wrong Role:

**Run this SQL to force-fix:**

```sql
-- Force update/create admin profile
INSERT INTO user_profiles (id, email, role, created_at, updated_at)
SELECT
  id,
  email,
  'admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'macrohand27@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verify the fix
SELECT
  u.email as auth_email,
  p.email as profile_email,
  p.role,
  CASE WHEN p.role = 'admin' THEN '✅ SUCCESS' ELSE '❌ STILL NOT ADMIN' END as status
FROM auth.users u
INNER JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'macrohand27@gmail.com';
```

**Expected Result:**
```
auth_email            | profile_email         | role  | status
----------------------|-----------------------|-------|-------------
macrohand27@gmail.com | macrohand27@gmail.com | admin | ✅ SUCCESS
```

---

## 🎯 STEP 3: Clear Browser Cache and Re-Login (CRITICAL - 5 minutes)

### Why This is Critical:
Your browser is caching the old session where you were NOT an admin. Even though the database now says you're an admin, your browser doesn't know yet.

### Option A: Complete Cache Clear (Recommended)

1. **Open Browser DevTools**
   - Press `F12`

2. **Clear Everything**
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Select **"All time"** or **"Everything"**
   - Check ALL boxes (especially "Cookies" and "Cached images and files")
   - Click **"Clear data"**

3. **Or via DevTools:**
   - Open DevTools (F12)
   - Go to **Application** tab
   - Click **"Clear site data"** button at the top
   - Confirm

### Option B: Quick Console Clear

1. Open Console (F12 → Console tab)
2. Paste and run this:

```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log('✅ Cache cleared! Now logout and login again.');
```

### Complete Logout

1. Click your profile icon (top right)
2. Click **"Logout"** or **"로그아웃"**
3. Wait for redirect to login page
4. **Close the browser tab completely**
5. **Open a NEW browser tab**
6. Go to: `http://localhost:3002` (or 3000/3001 depending on your port)
7. Login with: `macrohand27@gmail.com`

---

## 🎯 STEP 4: Check Browser Console Logs (3 minutes)

### After Fresh Login:

1. **Open DevTools Console** (F12 → Console tab)

2. **Look for these logs:**

**✅ Expected Success Logs:**
```
🔍 [useUser] Starting fetchUser...
✅ [useUser] Auth user: { id: '...', email: 'macrohand27@gmail.com', emailConfirmed: true }
🔍 [useUser] Fetching profile for user ID: ...
✅ [useUser] Profile loaded: { id: '...', email: 'macrohand27@gmail.com', role: 'admin', createdAt: '...' }
📊 [useUser] Hook state updated: { hasUser: true, userEmail: 'macrohand27@gmail.com', hasProfile: true, profileEmail: 'macrohand27@gmail.com', role: 'admin', isAdmin: true, isUser: false, loading: false }
```

**❌ Problem Logs:**
```
⚠️ [useUser] Profile error: { code: 'PGRST116', message: '...', ... }
⚠️ [useUser] Profile not found (PGRST116) - user has no profile yet
```
→ This means profile doesn't exist → Go back to Step 2

```
✅ [useUser] Profile loaded: { ..., role: 'user', ... }
📊 [useUser] Hook state updated: { ..., role: 'user', isAdmin: false, ... }
```
→ This means profile exists but role is 'user' → Go back to Step 2

---

## 🎯 STEP 5: Check Terminal Logs (2 minutes)

### When Accessing /admin:

1. **Try to access:** `http://localhost:3002/admin`

2. **Check Terminal for Middleware logs:**

**✅ Expected Success:**
```
[Middleware] ⚠️  Admin route access check: /admin
[Middleware] ✅ Admin access granted for: macrohand27@gmail.com
```

**❌ Problem Logs:**
```
[Middleware] ❌ No profile found, redirecting to 403
```
→ Middleware can't find profile → Database issue → Go back to Step 2

```
[Middleware] ⚠️ Profile not found, auto-creating for: macrohand27@gmail.com
[Middleware] ✅ Profile created successfully with role: user
[Middleware] ❌ User is not admin, role: user, redirecting to 403
```
→ Middleware created profile with 'user' role (not 'admin') → Go back to Step 2 to update role

---

## 🎯 STEP 6: Verify UI (1 minute)

### After successful login:

**Check Sidebar:**
```
Expected to see:

🏠 Home
🛡️ Admin    ← THIS SHOULD BE VISIBLE (purple text, shield icon)
📑 내 보관함
...
```

**Test Admin Access:**
1. Click **"Admin"** in sidebar
2. Should navigate to: `/admin`
3. Should see: Admin Dashboard page
4. Should NOT see: 403 Forbidden page

**Test User Management:**
1. From Admin Dashboard, click **"Users Management"**
2. Should navigate to: `/admin/users`
3. Should see: List of users with stats cards
4. Should see your email: `macrohand27@gmail.com` with role: `admin`

---

## 🔍 DIAGNOSTICS SUMMARY

### What to Report Back:

Please provide me with:

1. **Database Query Results** (from Step 1)
   - Copy the "YOUR ACCOUNT" section result
   - What does `admin_status` show?

2. **Browser Console Logs** (from Step 4)
   - Copy the `[useUser]` logs
   - What is the `role` value?
   - What is the `isAdmin` value?

3. **Terminal Logs** (from Step 5)
   - Copy the `[Middleware]` logs when accessing /admin
   - Does it say "Admin access granted" or "redirecting to 403"?

4. **UI State**
   - Is Admin menu visible in sidebar? (Yes/No)
   - Can you access `/admin`? (Yes/No)
   - What happens when you go to `/admin`? (Dashboard or 403?)

---

## 🚨 COMMON ISSUES AND FIXES

### Issue 1: "Profile not found (PGRST116)"

**Cause:** No profile exists in `user_profiles` table for your user
**Fix:** Run the SQL in Step 2 to create profile

### Issue 2: "role: 'user', isAdmin: false"

**Cause:** Profile exists but role is 'user' not 'admin'
**Fix:** Run the SQL in Step 2 to update role to 'admin'

### Issue 3: "Admin menu not visible after fixing database"

**Cause:** Browser cache has old session data
**Fix:** Complete Step 3 (logout, clear cache, login again)

### Issue 4: "Multiple GoTrueClient instances detected"

**Cause:** Multiple dev servers running or multiple tabs
**Fix:**
- Close all browser tabs for localhost
- Stop all dev servers (Ctrl+C in terminals)
- Start ONE dev server: `npm run dev`
- Open ONE browser tab

### Issue 5: "Still getting 403 after everything"

**Cause:** RLS policies blocking access
**Fix:** Check RLS policies with this SQL:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Temporarily disable RLS (TESTING ONLY)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Try accessing /admin again
-- If it works, the issue is RLS policies

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

---

## ✅ SUCCESS CRITERIA

When everything works, you should see:

**Database:**
```sql
SELECT email, role FROM user_profiles WHERE email = 'macrohand27@gmail.com';
-- Result: | macrohand27@gmail.com | admin |
```

**Browser Console:**
```
📊 [useUser] Hook state updated: { ..., role: 'admin', isAdmin: true, ... }
```

**Terminal:**
```
[Middleware] ✅ Admin access granted for: macrohand27@gmail.com
```

**UI:**
```
✅ Admin menu visible in sidebar (purple with shield icon)
✅ /admin shows dashboard (not 403)
✅ /admin/users shows user list
✅ Can edit user roles and delete users
```

---

## 📞 Next Steps

**If everything works after these steps:**
→ Great! Admin system is fully operational

**If still having issues:**
→ Report back with the diagnostics from "DIAGNOSTICS SUMMARY" section above

**Want to test the full system:**
1. ✅ Create a test user account
2. ✅ Login as admin (macrohand27@gmail.com)
3. ✅ Go to /admin/users
4. ✅ Change test user's role to 'admin'
5. ✅ Enter password: `rlawogjs15`
6. ✅ Verify test user now sees Admin menu

---

**Good luck! 🚀**

Start with Step 1 and work through each step systematically.
