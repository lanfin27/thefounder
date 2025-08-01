// Test minimal data insertion with only known columns
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testMinimalInsertion() {
  console.log('🧪 Testing Minimal Data Insertion');
  console.log('=' .repeat(60));
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // First, let's check what columns actually exist
  console.log('🔍 Checking table structure...');
  
  // Insert minimal data with only required fields
  const minimalListing = {
    listing_id: `minimal_test_${Date.now()}`,
    title: 'Minimal Test Listing',
    url: 'https://flippa.com/minimal-test',
    asking_price: 50000
  };
  
  console.log('\n📝 Attempting minimal insertion...');
  console.log('Data:', minimalListing);
  
  try {
    const { data, error } = await supabase
      .from('flippa_listings')
      .insert([minimalListing])
      .select();
    
    if (error) {
      console.log('❌ Minimal insertion failed:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      
      // Try with more fields gradually
      console.log('\n🔍 Testing with additional fields...');
      
      const fieldsToTest = [
        { field: 'primary_category', value: 'saas' },
        { field: 'monthly_revenue', value: 5000 },
        { field: 'annual_revenue', value: 60000 },
        { field: 'monthly_profit', value: 3000 },
        { field: 'annual_profit', value: 36000 },
        { field: 'revenue_multiple', value: 0.83 },
        { field: 'profit_multiple', value: 1.39 },
        { field: 'is_verified', value: true },
        { field: 'scraped_at', value: new Date().toISOString() }
      ];
      
      let workingListing = { ...minimalListing };
      
      for (const { field, value } of fieldsToTest) {
        const testListing = {
          ...workingListing,
          [field]: value,
          listing_id: `test_${field}_${Date.now()}`
        };
        
        const { data: testData, error: testError } = await supabase
          .from('flippa_listings')
          .insert([testListing])
          .select();
        
        if (testError) {
          console.log(`❌ Failed with ${field}:`, testError.message);
        } else {
          console.log(`✅ Success with ${field}`);
          workingListing[field] = value;
        }
      }
      
      // Try complete listing with working fields
      console.log('\n📝 Attempting complete insertion with working fields...');
      const completeListing = {
        ...workingListing,
        listing_id: `complete_test_${Date.now()}`
      };
      
      const { data: completeData, error: completeError } = await supabase
        .from('flippa_listings')
        .insert([completeListing])
        .select();
      
      if (completeError) {
        console.log('❌ Complete insertion failed:', completeError.message);
      } else {
        console.log('✅ Complete insertion successful!');
        console.log('Inserted:', completeData[0]);
      }
      
    } else {
      console.log('✅ Minimal insertion successful!');
      console.log('Inserted:', data[0]);
    }
    
    // Check total count
    const { count } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Total listings in database: ${count}`);
    
  } catch (error) {
    console.log('💥 Unexpected error:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
}

testMinimalInsertion().catch(console.error);