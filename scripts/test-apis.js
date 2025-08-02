const fetch = require('node-fetch');

async function testAPIs() {
  console.log('🧪 Testing Dashboard API Endpoints...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Debug endpoint
    console.log('📋 Test 1: Debug Endpoint');
    console.log('=======================');
    
    const debugResponse = await fetch(`${baseUrl}/api/scraping/debug`);
    const debugData = await debugResponse.json();
    
    console.log('Database status:', debugData.database);
    console.log('Total listings:', debugData.database.totalListings);
    console.log('Has data:', debugData.database.hasData);
    console.log('Sessions:', debugData.sessions.total);
    console.log('Sample count:', debugData.sample.count);
    
    // Test 2: Metrics endpoint
    console.log('\n📋 Test 2: Metrics Endpoint');
    console.log('========================');
    
    const metricsResponse = await fetch(`${baseUrl}/api/scraping/metrics`);
    const metricsData = await metricsResponse.json();
    
    if (metricsData.success) {
      console.log('✅ Success:', metricsData.success);
      console.log('Total listings:', metricsData.data.totalListings);
      console.log('Success rate:', metricsData.data.successRate + '%');
      console.log('Field completion:');
      console.log('  - Price:', metricsData.data.fieldCompletion.price + '%');
      console.log('  - Revenue:', metricsData.data.fieldCompletion.revenue + '%');
      console.log('  - Multiple:', metricsData.data.fieldCompletion.multiple + '%');
      console.log('  - Title:', metricsData.data.fieldCompletion.title + '%');
      
      if (metricsData.data.debug) {
        console.log('\nDebug info:');
        console.log('  - Total count:', metricsData.data.debug.totalCount);
        console.log('  - Retrieved count:', metricsData.data.debug.retrievedCount);
        console.log('  - With price:', metricsData.data.debug.withPrice);
        console.log('  - With revenue:', metricsData.data.debug.withRevenue);
      }
    } else {
      console.error('❌ Error:', metricsData.error);
      console.error('Details:', metricsData.details);
    }
    
    // Test 3: Listings endpoint
    console.log('\n📋 Test 3: Listings Endpoint');
    console.log('=========================');
    
    const listingsResponse = await fetch(`${baseUrl}/api/scraping/listings?limit=5`);
    const listingsData = await listingsResponse.json();
    
    if (listingsData.success) {
      console.log('✅ Success:', listingsData.success);
      console.log('Sample listings count:', listingsData.data.length);
      
      listingsData.data.forEach((listing, index) => {
        console.log(`\n${index + 1}. ${listing.title}`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`   Monthly: $${listing.monthly?.toLocaleString() || 'N/A'}`);
        console.log(`   Type: ${listing.type}`);
        console.log(`   Multiple: ${listing.multiple}`);
      });
    } else {
      console.error('❌ Error:', listingsData.error);
      console.error('Details:', listingsData.details);
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    
    const expectedListings = 1250;
    const actualListings = metricsData.data?.totalListings || 0;
    
    if (actualListings === expectedListings) {
      console.log(`✅ SUCCESS: Dashboard showing correct count (${actualListings} listings)`);
    } else {
      console.log(`❌ ISSUE: Expected ${expectedListings} listings, but got ${actualListings}`);
      console.log('📋 Troubleshooting steps:');
      console.log('   1. Check if database migration was run');
      console.log('   2. Check if data was loaded with load-existing-data.js');
      console.log('   3. Check environment variables are set correctly');
      console.log('   4. Check Supabase dashboard for actual data');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - The Next.js server is running (npm run dev)');
    console.log('   - You are on http://localhost:3000');
    console.log('   - The database is properly configured');
  }
}

// Execute
if (require.main === module) {
  console.log('🚀 Starting API tests...');
  console.log('🔗 Testing against: http://localhost:3000\n');
  testAPIs().catch(console.error);
}

module.exports = { testAPIs };