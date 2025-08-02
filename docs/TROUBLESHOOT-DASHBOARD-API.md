# Troubleshooting Dashboard API Integration

## Issue: Dashboard Shows 225 Records Instead of 1,250

### Quick Diagnosis

1. **Check Debug Endpoint**:
   ```
   http://localhost:3000/api/scraping/debug
   ```
   This will show:
   - Total listings in database
   - Environment variables status
   - Sample data

2. **Check Browser Console**:
   - Open dashboard: http://localhost:3000/admin/scraping
   - Press F12 to open Developer Tools
   - Check Console tab for API responses

### Common Causes & Fixes

## 1. Environment Variables Not Set

**Symptom**: APIs return errors or no data

**Fix**: Check your `.env.local` file has both:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Test**:
```bash
# Print environment variables
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')"
```

## 2. Database Tables Don't Exist

**Symptom**: "relation does not exist" errors

**Fix**: Run the migration in Supabase SQL Editor:
```sql
-- Copy content from: supabase/migrations/20250102_flippa_listings_fixed.sql
```

**Test**:
```bash
node scripts/test-database.js
```

## 3. Data Not Loaded

**Symptom**: Tables exist but are empty

**Fix**: Load the data:
```bash
node scripts/load-existing-data.js
```

## 4. API Using Wrong Supabase Client

**Symptom**: APIs work but return limited data

**Issue**: Using ANON_KEY instead of SERVICE_ROLE_KEY

**Fix**: Already updated in the API routes to use:
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)
```

## 5. Browser Cache Issues

**Symptom**: Old data persists despite fixes

**Fix**:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear cache: Developer Tools > Application > Storage > Clear site data
3. Test in incognito/private window

## 6. RLS (Row Level Security) Blocking Access

**Symptom**: Data exists but APIs return empty results

**Fix**: Check RLS policies in Supabase:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('flippa_listings', 'scraping_sessions');

-- If needed, temporarily disable RLS (for testing only!)
ALTER TABLE flippa_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_sessions DISABLE ROW LEVEL SECURITY;
```

## Step-by-Step Verification

### 1. Test Database Connection
```bash
node scripts/test-database.js
```
Expected: "Current listings in database: 1250"

### 2. Test API Endpoints
```bash
node scripts/test-apis.js
```
Expected: All three endpoints return data

### 3. Manual API Test
```bash
# Test metrics endpoint
curl http://localhost:3000/api/scraping/metrics

# Test listings endpoint
curl http://localhost:3000/api/scraping/listings?limit=5

# Test debug endpoint
curl http://localhost:3000/api/scraping/debug
```

### 4. Check Supabase Dashboard
1. Login to Supabase
2. Go to Table Editor
3. Check `flippa_listings` table
4. Verify 1,250 records exist

### 5. Server Logs
Check Next.js server console for:
- "🔍 Fetching real metrics from database..."
- "📊 Total listings in database: 1250"
- Any error messages

## If Still Not Working

### Nuclear Option - Fresh Start:
```bash
# 1. Clear all data
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
(async () => {
  await supabase.from('flippa_listings').delete().neq('id', 0);
  await supabase.from('scraping_sessions').delete().neq('id', 0);
  console.log('Cleared all data');
})();
"

# 2. Reload data
node scripts/load-existing-data.js

# 3. Restart Next.js server
npm run dev

# 4. Force refresh dashboard
# Visit: http://localhost:3000/admin/scraping
# Press: Ctrl+F5
```

### Debug Checklist:
- [ ] Environment variables set correctly
- [ ] Database tables exist
- [ ] Data loaded (1,250 records)
- [ ] APIs return correct data
- [ ] Browser cache cleared
- [ ] Dashboard shows 1,250 records

## Expected Final Result

Dashboard should show:
- **Total Listings**: 1,250 (not 225)
- **Success Rate**: ~96.2%
- **Database Status**: Connected, 1,250 records
- **Sample Listings**: 5 real listings from database

If you've followed all steps and still see 225 records, the issue might be:
1. Multiple data loads created duplicate/partial data
2. Filter applied in the dashboard limiting results
3. Pagination limiting display

Check the debug endpoint for the true database count!