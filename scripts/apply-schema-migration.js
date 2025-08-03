/**
 * Apply schema migration to fix missing columns
 * This script applies the necessary database changes for the unified scraper
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🔧 Applying schema migration...');
  
  try {
    // Check if profit_multiple column exists
    console.log('📋 Checking current schema...');
    
    // Try a simple query first
    const { data: testData, error: testError } = await supabase
      .from('flippa_listings')
      .select('id, listing_id, title, price')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot query table:', testError);
      return false;
    }
    
    console.log('✅ Table is accessible');
    
    // The profit_multiple column should already exist from previous migration
    // Let's verify by trying to query it
    const { data: columnTest, error: columnError } = await supabase
      .from('flippa_listings')
      .select('profit_multiple, revenue_multiple')
      .limit(1);
    
    if (columnError && columnError.message.includes('column')) {
      console.log('❌ Missing columns detected, migration needed');
      console.log('⚠️ Please run the migration manually in Supabase dashboard:');
      console.log('\nSQL to run:');
      console.log('-- This should have been done already, but verify:');
      console.log('ALTER TABLE flippa_listings');
      console.log('ADD COLUMN IF NOT EXISTS profit_multiple DECIMAL(10,2),');
      console.log('ADD COLUMN IF NOT EXISTS revenue_multiple DECIMAL(10,2);');
      console.log('\n-- Convert badges to JSONB if still TEXT[]:');
      console.log('ALTER TABLE flippa_listings');
      console.log('ALTER COLUMN badges TYPE JSONB');
      console.log('USING CASE');
      console.log("  WHEN badges IS NULL THEN '[]'::JSONB");
      console.log('  ELSE array_to_json(badges)::JSONB');
      console.log('END;');
      return false;
    }
    
    console.log('✅ Required columns appear to exist');
    
    // Test insert with all fields
    console.log('\n🧪 Testing insert capability...');
    
    const testListing = {
      listing_id: `test_${Date.now()}`,
      title: 'Test Listing',
      price: 10000,
      monthly_profit: 1000,
      monthly_revenue: 1500,
      profit_multiple: 0.83,
      revenue_multiple: 0.56,
      multiple_text: '0.83x profit | 0.56x revenue',
      property_type: 'SaaS',
      category: 'Software',
      badges: ['Verified', 'Premium'],
      url: 'https://test.com',
      quality_score: 90,
      extraction_confidence: 0.95,
      page_number: 1,
      source: 'test',
      raw_data: { test: true }
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('flippa_listings')
      .insert([testListing])
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message);
      console.log('\n💡 Error details:', insertError);
      
      // Clean up test if it partially succeeded
      await supabase
        .from('flippa_listings')
        .delete()
        .eq('listing_id', testListing.listing_id);
      
      return false;
    }
    
    console.log('✅ Insert test successful');
    
    // Clean up test record
    await supabase
      .from('flippa_listings')
      .delete()
      .eq('listing_id', testListing.listing_id);
    
    console.log('✅ Schema is ready for data insertion');
    return true;
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Schema Migration Test');
  console.log('========================\n');
  
  const success = await applyMigration();
  
  if (success) {
    console.log('\n✅ Schema is ready!');
    console.log('💡 You can now run the scraper to save data');
  } else {
    console.log('\n❌ Schema needs manual fixes');
    console.log('💡 Check the Supabase dashboard and apply migrations manually');
  }
}

// Run the script
main().catch(console.error);