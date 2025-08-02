const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
  console.log('🧪 Testing Supabase database connection...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Check if tables exist
    console.log('📋 Test 1: Checking if tables exist...');
    
    const { data: listings, error: listingsError } = await supabase
      .from('flippa_listings')
      .select('id')
      .limit(1);
    
    if (listingsError) {
      console.error('❌ flippa_listings table error:', listingsError.message);
      console.log('💡 Run the migration SQL in Supabase dashboard first!');
    } else {
      console.log('✅ flippa_listings table exists');
    }
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('scraping_sessions')
      .select('id')
      .limit(1);
    
    if (sessionsError) {
      console.error('❌ scraping_sessions table error:', sessionsError.message);
    } else {
      console.log('✅ scraping_sessions table exists');
    }
    
    // Test 2: Try inserting a test record
    console.log('\n📋 Test 2: Inserting test record...');
    
    const testListing = {
      listing_id: 'test_' + Date.now(),
      title: 'Test Listing',
      price: 1000,
      monthly_revenue: 100,
      multiple: 2.5,
      multiple_text: '2.5x revenue',
      property_type: 'SaaS',
      category: 'Test',
      badges: ['Test', 'Sample'],
      url: 'https://flippa.com/test',
      quality_score: 85,
      extraction_confidence: 0.95,
      page_number: 1,
      source: 'flippa',
      raw_data: { test: true }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('flippa_listings')
      .insert([testListing])
      .select();
    
    if (insertError) {
      console.error('❌ Test insert failed:', insertError.message);
      console.error('📄 Error details:', insertError);
    } else {
      console.log('✅ Test insert successful');
      console.log('📄 Inserted record:', insertData[0]);
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('flippa_listings')
        .delete()
        .eq('listing_id', testListing.listing_id);
      
      if (!deleteError) {
        console.log('✅ Test record cleaned up');
      }
    }
    
    // Test 3: Check current record count
    console.log('\n📋 Test 3: Checking current data...');
    
    const { count: listingCount, error: countError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`📊 Current listings in database: ${listingCount || 0}`);
    }
    
    const { count: sessionCount } = await supabase
      .from('scraping_sessions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Current sessions in database: ${sessionCount || 0}`);
    
    console.log('\n✅ Database test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📄 Full error:', error);
  }
}

// Execute
if (require.main === module) {
  testDatabase().catch(console.error);
}

module.exports = { testDatabase };