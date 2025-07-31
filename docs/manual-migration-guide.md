# Manual Database Migration Guide

## Quick Fix for "relation does not exist" Error

The charts are currently using mock data because the database table hasn't been created yet. Follow these steps to set up the real database:

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open your Supabase project dashboard**
   - Go to https://app.supabase.io
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration SQL**
   - Open the file: `supabase/migrations/20240801_industry_multiples_timeseries.sql`
   - Copy the entire contents
   - Paste into the SQL editor

4. **Execute the migration**
   - Click "Run" or press Ctrl+Enter
   - You should see "Success. No rows returned"

5. **Verify the table was created**
   - Go to "Table Editor" in the sidebar
   - Look for `industry_multiples_timeseries` table
   - The table should have sample data already inserted

### Option 2: Via Command Line (If configured)

```bash
# If you have Supabase CLI installed
supabase db push

# Or run our custom script
npm run db:migrate
```

### Option 3: Quick Copy-Paste SQL

If you can't find the migration file, here's the essential SQL to create the table:

```sql
-- Create the table
CREATE TABLE IF NOT EXISTS industry_multiples_timeseries (
  id SERIAL PRIMARY KEY,
  industry VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  avg_profit_multiple DECIMAL(10,2),
  avg_revenue_multiple DECIMAL(10,2),
  transaction_count INTEGER DEFAULT 0,
  total_volume DECIMAL(15,2) DEFAULT 0,
  volatility_index DECIMAL(5,4) DEFAULT 0,
  high_multiple DECIMAL(10,2),
  low_multiple DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(industry, date)
);

-- Create indexes
CREATE INDEX idx_timeseries_industry_date ON industry_multiples_timeseries(industry, date DESC);
CREATE INDEX idx_timeseries_date_range ON industry_multiples_timeseries(date DESC, industry);

-- Enable Row Level Security
ALTER TABLE industry_multiples_timeseries ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can view timeseries data" ON industry_multiples_timeseries
  FOR SELECT USING (true);

-- Insert sample data for one industry (SaaS)
INSERT INTO industry_multiples_timeseries (industry, date, avg_profit_multiple, transaction_count, total_volume)
SELECT 
  'SaaS',
  CURRENT_DATE - (n || ' days')::INTERVAL,
  3.8 + (random() - 0.5) * 0.8,
  FLOOR(random() * 20 + 10)::INTEGER,
  FLOOR(random() * 1000000 + 500000)::DECIMAL
FROM generate_series(0, 29) n;
```

### Verifying It Works

After running the migration:

1. **Check the API response**
   - Visit: http://localhost:3000/api/public/industry-charts
   - Look for `"usingMockData": false` in the response
   - If true, the database is working!

2. **Check the charts page**
   - Visit: http://localhost:3000/charts
   - The charts should load without errors
   - Data should appear more consistent

### Troubleshooting

**Still seeing "relation does not exist" error?**
- Make sure you're connected to the correct Supabase project
- Check that RLS (Row Level Security) is enabled
- Verify the table name is exactly `industry_multiples_timeseries`

**No data showing?**
- The migration includes sample data, but it might need to be run separately
- Check the full migration file for INSERT statements
- You can manually insert test data via Table Editor

**Permission errors?**
- Make sure the RLS policy is created
- Check that your API key has proper permissions

### Next Steps

Once the database is set up:
1. The charts will automatically use real data
2. You can add more industries via the Table Editor
3. The API will cache results for better performance
4. Consider setting up a cron job to update data regularly