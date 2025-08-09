
# Recovery Instructions

After running the emergency fix script, follow these steps:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test the dashboard:**
   - Open http://localhost:3000/admin (or port 3001)
   - Check if Total Listings shows 5,636
   - Try the "Start Incremental Scraping" button

3. **If issues persist:**
   - Run: `npm run build` to create production build
   - Check logs in the `logs/` directory
   - Run: `node scripts/test-all-apis.js` to test all endpoints

4. **For database issues:**
   - Verify .env.local has correct Supabase keys
   - Run: `node scripts/check-environment.js`
   - Check Supabase dashboard for RLS policies

5. **Quick commands:**
   ```bash
   # Test APIs
   node scripts/test-all-apis.js
   
   # Check environment
   node scripts/check-environment.js
   
   # Verify database
   node scripts/verify-supabase-data.js
   ```
