const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseInsert() {
  console.log('🧪 Testing database insert without ON CONFLICT...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Create test listings
    const testListings = [
      {
        listing_id: 'test_' + Date.now() + '_1',
        title: 'Test SaaS Business 1',
        price: 10000,
        monthly_revenue: 1000,
        multiple: 2.5,
        multiple_text: '2.5x revenue',
        property_type: 'SaaS',
        category: 'Test',
        badges: ['Test', 'Sample'],
        url: 'https://flippa.com/test1',
        quality_score: 85,
        extraction_confidence: 0.95,
        page_number: 1,
        source: 'flippa',
        raw_data: { test: true }
      },
      {
        listing_id: 'test_' + Date.now() + '_2',
        title: 'Test Content Business 2',
        price: 5000,
        monthly_revenue: 500,
        multiple: 3.0,
        multiple_text: '3.0x revenue',
        property_type: 'Content',
        category: 'Test',
        badges: ['Verified'],
        url: 'https://flippa.com/test2',
        quality_score: 90,
        extraction_confidence: 0.95,
        page_number: 1,
        source: 'flippa',
        raw_data: { test: true }
      }
    ];

    console.log('📋 Test 1: Simple INSERT (no ON CONFLICT)');
    
    const { data: insertData, error: insertError } = await supabase
      .from('flippa_listings')
      .insert(testListings);
    
    if (insertError) {
      console.error('❌ Simple insert failed:', insertError.message);
      console.error('📄 Error details:', insertError);
    } else {
      console.log('✅ Simple insert successful!');
    }

    // Test with upsert (the problematic method)
    console.log('\n📋 Test 2: UPSERT with ON CONFLICT');
    
    const testUpsert = {
      listing_id: 'test_upsert_' + Date.now(),
      title: 'Test Upsert Business',
      price: 15000,
      monthly_revenue: 1500,
      property_type: 'SaaS',
      source: 'flippa',
      raw_data: { test: true }
    };
    
    const { error: upsertError } = await supabase
      .from('flippa_listings')
      .upsert([testUpsert], { onConflict: 'listing_id' });
    
    if (upsertError) {
      console.error('❌ Upsert failed:', upsertError.message);
      console.error('📄 This is the error we\'re avoiding!');
    } else {
      console.log('✅ Upsert successful (constraint exists)');
    }

    // Check current count
    console.log('\n📋 Test 3: Check current data');
    
    const { count, error: countError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`📊 Current listings in database: ${count || 0}`);
    }

    // Clean up test data
    console.log('\n🗑️  Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .like('listing_id', 'test_%');
    
    if (!deleteError) {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n✅ Test complete!');
    console.log('💡 Recommendation: Use simple INSERT instead of UPSERT');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📄 Full error:', error);
  }
}

// Execute
if (require.main === module) {
  testDatabaseInsert().catch(console.error);
}

module.exports = { testDatabaseInsert };