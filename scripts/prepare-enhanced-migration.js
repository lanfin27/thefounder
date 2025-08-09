const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function prepareEnhancedMigration() {
  console.log('🔍 Checking Current Database State\n');
  
  try {
    // 1. Check flippa_listings table
    console.log('📊 Checking flippa_listings table:');
    const { count: listingsCount, error: listingsError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (listingsError) {
      console.log(`❌ Error: ${listingsError.message}`);
    } else {
      console.log(`✅ Found ${listingsCount} records`);
    }
    
    // 2. Check flippa_listings_enhanced table
    console.log('\n📊 Checking flippa_listings_enhanced table:');
    const { count: enhancedCount, error: enhancedError } = await supabase
      .from('flippa_listings_enhanced')
      .select('*', { count: 'exact', head: true });
    
    if (enhancedError) {
      console.log(`❌ Error: ${enhancedError.message}`);
    } else {
      console.log(`✅ Found ${enhancedCount} records`);
      
      // Check is_deleted status
      const { count: deletedCount } = await supabase
        .from('flippa_listings_enhanced')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', true);
      
      if (deletedCount > 0) {
        console.log(`⚠️  ${deletedCount} records marked as deleted`);
      }
    }
    
    // 3. Check other monitoring tables
    console.log('\n📊 Checking monitoring tables:');
    const monitoringTables = ['flippa_change_log', 'flippa_monitoring_stats'];
    
    for (const table of monitoringTables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} records`);
      }
    }
    
    // 4. Generate migration SQL
    console.log('\n📝 Migration Steps:\n');
    
    if (listingsCount > 0 && enhancedCount === 0) {
      console.log('Option 1: Migrate from flippa_listings to flippa_listings_enhanced');
      console.log('```sql');
      console.log(`-- Copy data from flippa_listings to flippa_listings_enhanced
INSERT INTO flippa_listings_enhanced (
  url, title, category, price, status, 
  monthly_revenue, monthly_profit, age_months,
  page_views_monthly, multiple_revenue, multiple_profit,
  growth_rate, business_model, business_type,
  industry, monetization, content_type, traffic_sources,
  seo_metrics, technologies, seller_name, seller_joined,
  seller_listings_count, listing_number, days_listed,
  watching_count, created_at, last_scraped_at,
  listing_date, data_completeness_score, change_count,
  last_updated_at, is_deleted
)
SELECT 
  url,
  title,
  category,
  asking_price as price,
  'active' as status,
  monthly_revenue,
  monthly_profit,
  age_months,
  page_views_monthly,
  CASE 
    WHEN monthly_revenue > 0 THEN ROUND(asking_price::numeric / monthly_revenue, 2)
    ELSE NULL 
  END as multiple_revenue,
  CASE 
    WHEN monthly_profit > 0 THEN ROUND(asking_price::numeric / monthly_profit, 2)
    ELSE NULL 
  END as multiple_profit,
  0 as growth_rate,
  'Unknown' as business_model,
  category as business_type,
  category as industry,
  'Unknown' as monetization,
  'Website' as content_type,
  '{}' as traffic_sources,
  '{}' as seo_metrics,
  technologies,
  'Unknown' as seller_name,
  created_at as seller_joined,
  0 as seller_listings_count,
  id::text as listing_number,
  0 as days_listed,
  0 as watching_count,
  created_at,
  scraped_at as last_scraped_at,
  created_at as listing_date,
  50 as data_completeness_score,
  0 as change_count,
  NOW() as last_updated_at,
  false as is_deleted
FROM flippa_listings;`);
      console.log('```');
    }
    
    if (enhancedCount > 0) {
      console.log('\nOption 2: Fix is_deleted flag if needed');
      console.log('```sql');
      console.log('UPDATE flippa_listings_enhanced SET is_deleted = false WHERE is_deleted = true;');
      console.log('```');
    }
    
    console.log('\n🎯 Recommended Next Steps:');
    console.log('1. If flippa_listings has data but flippa_listings_enhanced is empty:');
    console.log('   - Run the INSERT statement above in Supabase SQL Editor');
    console.log('2. If flippa_listings is also empty:');
    console.log('   - Run: node scripts/migrate-flippa-listings-proper.js');
    console.log('3. After data is in place:');
    console.log('   - Test monitoring: node scripts/test-incremental-monitoring.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

prepareEnhancedMigration().catch(console.error);