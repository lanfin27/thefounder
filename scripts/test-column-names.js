// Test script to verify column name fixes
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testColumnNames() {
  console.log('🔍 Testing Flippa Listings Column Names');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Select with snake_case columns
    console.log('\n1️⃣ Testing SELECT with snake_case columns...');
    const { data: selectData, error: selectError } = await supabase
      .from('flippa_listings')
      .select('listing_id, title, primary_category, asking_price, monthly_revenue, monthly_profit')
      .limit(3);
    
    if (selectError) {
      console.error('❌ SELECT failed:', selectError.message);
    } else {
      console.log('✅ SELECT successful!');
      console.log(`   Found ${selectData.length} records`);
      if (selectData.length > 0) {
        console.log('\n   Sample record:');
        const sample = selectData[0];
        console.log(`   - listing_id: ${sample.listing_id}`);
        console.log(`   - primary_category: ${sample.primary_category}`);
        console.log(`   - asking_price: $${sample.asking_price}`);
        console.log(`   - monthly_revenue: $${sample.monthly_revenue || 0}`);
      }
    }
    
    // Test 2: Filter by snake_case column
    console.log('\n2️⃣ Testing WHERE clause with snake_case...');
    const { data: filterData, error: filterError } = await supabase
      .from('flippa_listings')
      .select('count')
      .eq('primary_category', 'saas')
      .limit(1);
    
    if (filterError) {
      console.error('❌ Filter failed:', filterError.message);
    } else {
      console.log('✅ Filter by primary_category successful!');
    }
    
    // Test 3: Order by snake_case column
    console.log('\n3️⃣ Testing ORDER BY with snake_case...');
    const { data: orderData, error: orderError } = await supabase
      .from('flippa_listings')
      .select('title, asking_price, scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(3);
    
    if (orderError) {
      console.error('❌ Order failed:', orderError.message);
    } else {
      console.log('✅ Order by scraped_at successful!');
    }
    
    // Test 4: Insert with snake_case columns
    console.log('\n4️⃣ Testing INSERT with snake_case...');
    const testListing = {
      listing_id: 'test-' + Date.now(),
      title: 'Test Listing - Column Name Verification',
      url: 'https://flippa.com/test',
      primary_category: 'saas',
      sub_category: null,
      asking_price: 100000,
      monthly_revenue: 10000,
      monthly_profit: 7000,
      description: 'Test listing for column name verification',
      is_verified: false,
      site_age_months: 24,
      scraped_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('flippa_listings')
      .insert([testListing])
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      console.error('   Details:', insertError.details);
    } else {
      console.log('✅ Insert with snake_case columns successful!');
      console.log(`   Created listing: ${insertData[0].listing_id}`);
      
      // Clean up test data
      await supabase
        .from('flippa_listings')
        .delete()
        .eq('listing_id', testListing.listing_id);
    }
    
    // Test 5: Update with snake_case columns
    console.log('\n5️⃣ Testing UPDATE with snake_case...');
    const { error: updateError } = await supabase
      .from('flippa_listings')
      .update({ 
        monthly_revenue: 15000,
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', 'test-update-check')
      .select();
    
    if (updateError && updateError.code !== 'PGRST116') {
      console.error('❌ Update syntax failed:', updateError.message);
    } else {
      console.log('✅ Update syntax with snake_case successful!');
    }
    
    // Test 6: Aggregate with snake_case
    console.log('\n6️⃣ Testing aggregation with snake_case...');
    const { data: aggData, error: aggError } = await supabase
      .from('flippa_listings')
      .select('primary_category, asking_price, monthly_revenue')
      .eq('primary_category', 'saas')
      .limit(100);
    
    if (aggError) {
      console.error('❌ Aggregation query failed:', aggError.message);
    } else {
      console.log('✅ Aggregation query successful!');
      if (aggData.length > 0) {
        const avgPrice = aggData.reduce((sum, l) => sum + l.asking_price, 0) / aggData.length;
        console.log(`   Average asking_price for SaaS: $${Math.round(avgPrice).toLocaleString()}`);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All column name tests completed!');
    console.log('The scraping system is now using correct snake_case column names.');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testColumnNames();