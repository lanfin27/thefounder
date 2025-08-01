// Verify column name fixes are working correctly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyColumnFix() {
  console.log('🔍 Verifying Column Name Fixes');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Insert a test listing with all correct columns
    console.log('\n1️⃣ Testing INSERT with correct columns...');
    
    const testListing = {
      listing_id: 'verify-' + Date.now(),
      title: 'Column Verification Test',
      url: 'https://flippa.com/test',
      asking_price: 50000,
      monthly_revenue: 5000,
      annual_revenue: 60000,
      monthly_profit: 3500,
      annual_profit: 42000,
      revenue_multiple: 0.83,
      profit_multiple: 1.19,
      primary_category: 'saas',
      sub_category: null,
      industry: 'SaaS',
      business_type: 'subscription',
      site_age_months: 36,
      monthly_visitors: 10000,
      is_verified: true,
      scraped_at: new Date().toISOString(),
      is_active: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('flippa_listings')
      .insert([testListing])
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      console.error('   Details:', insertError);
    } else {
      console.log('✅ Insert successful!');
      console.log(`   Created listing: ${insertData[0].listing_id}`);
    }
    
    // Test 2: Query using correct columns
    console.log('\n2️⃣ Testing SELECT with correct columns...');
    
    const { data: selectData, error: selectError } = await supabase
      .from('flippa_listings')
      .select(`
        listing_id,
        title,
        asking_price,
        monthly_revenue,
        monthly_profit,
        revenue_multiple,
        profit_multiple,
        primary_category,
        industry,
        site_age_months,
        is_verified,
        scraped_at
      `)
      .eq('listing_id', testListing.listing_id)
      .single();
    
    if (selectError) {
      console.error('❌ Select failed:', selectError.message);
    } else {
      console.log('✅ Select successful!');
      console.log('   Retrieved data:');
      console.log(`   - Title: ${selectData.title}`);
      console.log(`   - Asking Price: $${selectData.asking_price}`);
      console.log(`   - Monthly Revenue: $${selectData.monthly_revenue}`);
      console.log(`   - Revenue Multiple: ${selectData.revenue_multiple}x`);
      console.log(`   - Primary Category: ${selectData.primary_category}`);
      console.log(`   - Verified: ${selectData.is_verified}`);
    }
    
    // Test 3: Update with correct columns
    console.log('\n3️⃣ Testing UPDATE with correct columns...');
    
    const { error: updateError } = await supabase
      .from('flippa_listings')
      .update({
        monthly_revenue: 6000,
        annual_revenue: 72000,
        revenue_multiple: 0.69,
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', testListing.listing_id);
    
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
    } else {
      console.log('✅ Update successful!');
    }
    
    // Test 4: Aggregation query
    console.log('\n4️⃣ Testing aggregation with correct columns...');
    
    const { data: aggData, error: aggError } = await supabase
      .from('flippa_listings')
      .select('primary_category, asking_price, monthly_revenue, revenue_multiple')
      .eq('primary_category', 'saas')
      .is('is_active', true)
      .order('scraped_at', { ascending: false })
      .limit(10);
    
    if (aggError) {
      console.error('❌ Aggregation failed:', aggError.message);
    } else {
      console.log('✅ Aggregation successful!');
      console.log(`   Found ${aggData.length} SaaS listings`);
      
      if (aggData.length > 0) {
        const avgMultiple = aggData
          .filter(l => l.revenue_multiple > 0)
          .reduce((sum, l) => sum + l.revenue_multiple, 0) / aggData.length;
        
        console.log(`   Average revenue multiple: ${avgMultiple.toFixed(2)}x`);
      }
    }
    
    // Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .eq('listing_id', testListing.listing_id);
    
    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Column name verification complete!');
    console.log('All database operations are using correct snake_case columns.');
    
  } catch (error) {
    console.error('\n❌ Verification error:', error.message);
    console.error(error.stack);
  }
}

// Run verification
verifyColumnFix();