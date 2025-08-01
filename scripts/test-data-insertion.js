// Test data insertion to flippa_listings table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testDataInsertion() {
  console.log('🧪 Testing Data Insertion to flippa_listings');
  console.log('=' .repeat(60));
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
    return;
  }
  
  console.log('✅ Environment variables loaded');
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test data that matches the actual table schema
  const testListings = [
    {
      listing_id: `test_${Date.now()}_1`,
      title: 'Test SaaS Business - AI Writing Tool',
      url: 'https://flippa.com/test-listing-1',
      asking_price: 150000,
      monthly_revenue: 12000,
      annual_revenue: 144000,
      monthly_profit: 8000,
      annual_profit: 96000,
      revenue_multiple: 1.04,
      profit_multiple: 1.56,
      primary_category: 'saas',
      business_type: 'Software',
      is_verified: true,
      scraped_at: new Date().toISOString()
    },
    {
      listing_id: `test_${Date.now()}_2`,
      title: 'E-commerce Store - Fashion Accessories',
      url: 'https://flippa.com/test-listing-2',
      asking_price: 75000,
      monthly_revenue: 8000,
      annual_revenue: 96000,
      monthly_profit: 3000,
      annual_profit: 36000,
      revenue_multiple: 0.78,
      profit_multiple: 2.08,
      primary_category: 'ecommerce',
      business_type: 'E-commerce',
      is_verified: false,
      scraped_at: new Date().toISOString()
    },
    {
      listing_id: `test_${Date.now()}_3`,
      title: 'Content Website - Tech News Portal',
      url: 'https://flippa.com/test-listing-3',
      asking_price: 45000,
      monthly_revenue: 3500,
      annual_revenue: 42000,
      monthly_profit: 2800,
      annual_profit: 33600,
      revenue_multiple: 1.07,
      profit_multiple: 1.34,
      primary_category: 'content',
      business_type: 'Content',
      is_verified: true,
      monthly_visitors: 150000,
      scraped_at: new Date().toISOString()
    }
  ];
  
  console.log(`\n📝 Attempting to insert ${testListings.length} test listings...`);
  
  try {
    // Insert test data
    const { data, error } = await supabase
      .from('flippa_listings')
      .upsert(testListings, { onConflict: 'listing_id' })
      .select();
    
    if (error) {
      console.log('❌ Insertion failed:', error.message);
      console.log('Error details:', error);
      
      // Try inserting one by one to find the issue
      console.log('\n🔍 Trying individual insertions...');
      for (const listing of testListings) {
        const { data: singleData, error: singleError } = await supabase
          .from('flippa_listings')
          .insert([listing])
          .select();
        
        if (singleError) {
          console.log(`❌ Failed: ${listing.title}`);
          console.log('   Error:', singleError.message);
        } else {
          console.log(`✅ Success: ${listing.title}`);
        }
      }
    } else {
      console.log('✅ Insertion successful!');
      console.log(`   Inserted ${data.length} records`);
      
      // Display inserted data
      data.forEach(item => {
        console.log(`   - ${item.title} ($${item.asking_price})`);
      });
    }
    
    // Verify data exists in database
    console.log('\n🔍 Verifying data in database...');
    const { data: verifyData, error: verifyError, count } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact' })
      .order('scraped_at', { ascending: false })
      .limit(5);
    
    if (verifyError) {
      console.log('❌ Verification query failed:', verifyError.message);
    } else {
      console.log(`✅ Database now contains ${count} total listings`);
      console.log('Recent listings:');
      verifyData.forEach(listing => {
        console.log(`   - ${listing.title} (${listing.listing_id})`);
      });
    }
    
    // Test the API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const axios = require('axios');
    try {
      const response = await axios.get('http://localhost:3000/api/listings?limit=5', {
        headers: { 'x-admin-token': process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure' },
        timeout: 5000
      });
      
      console.log(`✅ API endpoint returned ${response.data.data.listings.length} listings`);
    } catch (apiError) {
      console.log('❌ API endpoint test failed:', apiError.message);
      console.log('   Make sure the Next.js dev server is running');
    }
    
  } catch (error) {
    console.log('💥 Unexpected error:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test complete');
  console.log('\nNext steps:');
  console.log('1. Check if data appears in Supabase Table Editor');
  console.log('2. Test API endpoint: curl -H "x-admin-token: [token]" http://localhost:3000/api/listings');
  console.log('3. If insertion worked, investigate why worker isn\'t saving data');
}

// Run the test
testDataInsertion().catch(console.error);