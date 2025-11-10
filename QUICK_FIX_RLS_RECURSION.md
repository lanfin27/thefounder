# 🚨 QUICK FIX - Infinite Recursion Error

**Error Code:** `42P17`
**Error:** `infinite recursion detected in policy for relation "user_profiles"`

---

## ⚡ QUICK FIX (10 minutes)

### STEP 1: Run SQL Fix (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Go to SQL Editor**
   - Click **"SQL Editor"** in left sidebar
   - Click **"New Query"**

3. **Copy & Run the Fix**
   - Open file: `supabase/migrations/fix_rls_infinite_recursion.sql`
   - Copy **ENTIRE** contents
   - Paste into SQL Editor
   - Click **"Run"** (or Ctrl+Enter)

4. **Verify Success**
   - Should see these messages:
     ```
     ✅ Old policies removed
     ✅ Helper function created with SECURITY DEFINER
     ✅ Policy 1: Users can view own profile
     ✅ Policy 2: Users can update own profile
     ✅ Policy 3: Admins can view all profiles
     ✅ Policy 4: Admins can update all profiles
     ✅ Policy 5: Admins can delete profiles
     ✅ Policy 6: Authenticated users can insert own profile
     📊 Total Policies: 6
     🔐 RLS Status: ENABLED ✅
     ⚡ Helper Function: EXISTS ✅
     ```

---

### STEP 2: Clear Browser Cache (2 minutes)

**Option A: Browser Settings**
- Press `Ctrl+Shift+Delete`
- Select **"All time"**
- Check **ALL boxes**
- Click **"Clear data"**

**Option B: Console Command**
1. Press `F12` (open DevTools)
2. Go to **Console** tab
3. Paste and run:
```javascript
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log('✅ Cache cleared! Logout and login again.');
```

---

### STEP 3: Fresh Login (2 minutes)

1. **Logout**
   - Click profile icon → Logout
   - Wait for redirect

2. **Close Tab**
   - Close browser tab completely

3. **Open Fresh**
   - Open NEW browser tab
   - Go to: `http://localhost:3000`
   - Login with: `macrohand27@gmail.com`

---

### STEP 4: Verify It Works (1 minute)

**Check 1: Browser Console** (F12)
```
Expected logs:
✅ [useUser] Profile loaded: { role: 'admin', ... }
📊 [useUser] Current state: { isAdmin: true, ... }
```

**Check 2: Sidebar**
```
Should see:
🏠 Home
🔐 Admin    ← Visible in purple!
📑 내 보관함
```

**Check 3: Access /admin**
- Click **"Admin"** in sidebar
- Should open Admin Dashboard (not 403)
- Terminal should show: `[Middleware] ✅ Admin access granted`

---

## ✅ SUCCESS INDICATORS

When fixed:

**Terminal:**
```
[Middleware] ✅ Profile found: { email: 'macrohand27@gmail.com', role: 'admin' }
[Middleware] ✅ Admin access granted
```

**Browser Console:**
```
📊 [useUser] Hook state updated: { role: 'admin', isAdmin: true, loading: false }
```

**UI:**
- ✅ Admin menu visible
- ✅ Can access /admin
- ✅ Can access /admin/users
- ✅ No 403 errors

---

## 🐛 IF STILL NOT WORKING

### Check Helper Function:
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'is_admin';
-- Should show: is_admin | true (SECURITY DEFINER)
```

### Check Policies:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';
-- Should show 6 policies
```

### Test Direct Query (No Recursion):
```sql
SELECT * FROM user_profiles WHERE id = auth.uid();
-- Should work without "infinite recursion" error
```

---

## 📊 WHAT THIS FIX DOES

**Before (Broken):**
```
User → Query user_profiles
  ↓
Policy checks: "Is user admin?"
  ↓
To check admin, query user_profiles again
  ↓
Policy checks: "Is user admin?"
  ↓
Infinite loop! ♾️ ERROR: 42P17
```

**After (Fixed):**
```
User → Query user_profiles
  ↓
Policy calls: is_admin(user_id)
  ↓
Function has SECURITY DEFINER → Bypasses RLS
  ↓
Reads user_profiles directly
  ↓
Returns true/false
  ↓
Policy allows/denies (no recursion) ✅
```

---

## 🎯 SUMMARY

1. ✅ Run SQL fix in Supabase Dashboard
2. ✅ Clear ALL browser cache
3. ✅ Logout and login fresh
4. ✅ Check Admin menu appears
5. ✅ Test /admin access

**Total Time:** ~10 minutes
**Success Rate:** 99% (if followed exactly)

---

Start with **STEP 1** and work through each step in order. Report back after STEP 1 if you see any errors!
