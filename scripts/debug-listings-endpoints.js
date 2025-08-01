// Debug all versions of listings endpoints
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const baseURL = 'http://localhost:3000';
const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';

async function testEndpoint(path, description) {
  console.log(`\n📍 Testing ${path}`);
  console.log(`   ${description}`);
  
  try {
    const response = await axios.get(`${baseURL}${path}`, {
      headers: {
        'x-admin-token': adminToken
      },
      timeout: 10000,
      validateStatus: null
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ SUCCESS');
      if (response.data.data) {
        const data = response.data.data;
        if (data.listings) {
          console.log(`   Listings: ${data.listings.length}`);
          console.log(`   Total: ${data.pagination?.total || 0}`);
        }
        if (data.database) {
          console.log(`   Database connected: ${data.database.connected}`);
          console.log(`   Record count: ${data.database.count || 0}`);
        }
      }
    } else if (response.status === 500) {
      console.log('   ❌ ERROR 500');
      console.log('   Message:', response.data.error);
      if (response.data.details) {
        console.log('   Details:', JSON.stringify(response.data.details, null, 2));
      }
      if (response.data.debug) {
        console.log('   Debug:', JSON.stringify(response.data.debug, null, 2));
      }
    } else {
      console.log(`   Status: ${response.status}`);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('   💥 Request failed:', error.message);
  }
}

async function runTests() {
  console.log('🔍 Debugging Listings Endpoints');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${baseURL}`);
  console.log(`Admin Token: ***${adminToken.slice(-8)}`);
  console.log('=' .repeat(60));
  
  // Test all three versions
  await testEndpoint('/api/listings-test', 'Test endpoint with debug info');
  await testEndpoint('/api/listings-simple', 'Simplified version without complex imports');
  await testEndpoint('/api/listings', 'Original full-featured endpoint');
  await testEndpoint('/api/listings?limit=5', 'Original with query params');
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Testing complete');
  console.log('\nNext steps:');
  console.log('1. If test endpoint works but others fail: Import/type issue');
  console.log('2. If simple works but full fails: Complex logic issue');
  console.log('3. If all fail: Database/environment issue');
  console.log('4. Check Next.js console for detailed error logs');
  console.log('=' .repeat(60));
}

// Add npm script suggestion
console.log('Add to package.json scripts:');
console.log('"debug:listings": "node scripts/debug-listings-endpoints.js"\n');

// Run tests
runTests().catch(error => {
  console.error('\n💥 Script error:', error);
});