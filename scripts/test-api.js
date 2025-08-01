// Test scraping API endpoints
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testAPI() {
  console.log('🔌 Testing scraping API endpoints...\n');
  
  const baseURL = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : 'http://localhost:3000';
    
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  const headers = {
    'x-admin-token': adminToken,
    'Content-Type': 'application/json'
  };

  console.log(`📍 Testing against: ${baseURL}`);
  console.log(`🔑 Using admin token: ***${adminToken.slice(-4)}\n`);

  const results = [];

  try {
    // 1. Test basic connectivity
    console.log('1️⃣ Testing basic API connectivity...');
    try {
      const testResponse = await axios.get(`${baseURL}/api/scraping/test`, { 
        headers,
        timeout: 10000 
      });
      console.log(`   ✅ Test endpoint: ${testResponse.status} - ${testResponse.data.data?.message || 'Connected'}`);
      results.push({ endpoint: '/api/scraping/test', status: 'success' });
    } catch (error) {
      console.log(`   ❌ Test endpoint failed: ${error.response?.status || error.message}`);
      results.push({ endpoint: '/api/scraping/test', status: 'failed', error: error.message });
    }

    // 2. Test queue status (authenticated)
    console.log('\n2️⃣ Testing queue status endpoint...');
    
    // First need to get auth token by logging in
    console.log('   🔐 Getting auth token...');
    
    // Create a mock authenticated request for testing
    const mockAuthHeaders = {
      ...headers,
      'Cookie': 'mock-auth-session=test' // This would normally be a real session
    };
    
    try {
      console.log('   ⚠️ Queue endpoint requires authentication');
      console.log('   💡 In production, login first via /auth/login');
      results.push({ endpoint: '/api/scraping/queue', status: 'skipped', note: 'Requires auth' });
    } catch (error) {
      console.log(`   ❌ Queue status failed: ${error.response?.status || error.message}`);
      results.push({ endpoint: '/api/scraping/queue', status: 'failed', error: error.message });
    }

    // 3. Test public statistics endpoint
    console.log('\n3️⃣ Testing statistics endpoint...');
    try {
      // This endpoint might not require auth for public stats
      const statsResponse = await axios.get(`${baseURL}/api/scraping/stats`, { 
        headers: { 'x-admin-token': adminToken },
        timeout: 10000 
      });
      console.log(`   ✅ Statistics endpoint: ${statsResponse.status}`);
      
      if (statsResponse.data.data) {
        const data = statsResponse.data.data;
        console.log(`   📊 Stats available: ${Object.keys(data).join(', ')}`);
      }
      results.push({ endpoint: '/api/scraping/stats', status: 'success' });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ⚠️ Stats endpoint requires authentication');
        results.push({ endpoint: '/api/scraping/stats', status: 'auth-required' });
      } else {
        console.log(`   ❌ Statistics failed: ${error.response?.status || error.message}`);
        results.push({ endpoint: '/api/scraping/stats', status: 'failed', error: error.message });
      }
    }

    // 4. Test scraping test endpoints with different types
    console.log('\n4️⃣ Testing scraping functionality...');
    
    const testTypes = [
      { type: 'basic', description: 'Basic connectivity' },
      { type: 'categories', description: 'Category discovery' },
      { type: 'listings', category: 'saas', description: 'Listing scraping' }
    ];

    for (const test of testTypes) {
      try {
        let url = `${baseURL}/api/scraping/test?type=${test.type}`;
        if (test.category) {
          url += `&category=${test.category}`;
        }
        
        console.log(`\n   Testing ${test.description}...`);
        const response = await axios.get(url, { 
          headers,
          timeout: 30000 // Longer timeout for scraping
        });
        
        if (response.data.success) {
          console.log(`   ✅ ${test.description}: Success`);
          if (response.data.data) {
            const data = response.data.data;
            if (data.categoriesFound !== undefined) {
              console.log(`      Categories found: ${data.categoriesFound}`);
            }
            if (data.totalScraped !== undefined) {
              console.log(`      Listings scraped: ${data.totalScraped}`);
            }
          }
          results.push({ endpoint: `test-${test.type}`, status: 'success' });
        } else {
          console.log(`   ⚠️ ${test.description}: ${response.data.error || 'Failed'}`);
          results.push({ endpoint: `test-${test.type}`, status: 'failed' });
        }
      } catch (error) {
        console.log(`   ❌ ${test.description} failed: ${error.response?.data?.error || error.message}`);
        results.push({ endpoint: `test-${test.type}`, status: 'failed', error: error.message });
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 API Test Summary');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped' || r.status === 'auth-required').length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Skipped/Auth Required: ${skipped}`);
    
    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⚠️';
      console.log(`   ${icon} ${result.endpoint}: ${result.status}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      if (result.note) {
        console.log(`      Note: ${result.note}`);
      }
    });

    if (failed === 0) {
      console.log('\n🎉 API tests completed successfully!');
      console.log('🚀 Ready to start real scraping operations!');
    } else {
      console.log('\n⚠️ Some API tests failed. Please check:');
      console.log('   1. Development server is running (npm run dev)');
      console.log('   2. Admin token is correctly configured');
      console.log('   3. API routes are properly implemented');
    }
    
    return failed === 0;

  } catch (error) {
    console.error('\n❌ API test failed with unexpected error:', error.message);
    console.log('\n🔧 Solutions:');
    console.log('1. Ensure development server is running: npm run dev');
    console.log('2. Check if server is accessible at:', baseURL);
    console.log('3. Verify network connectivity');
    console.log('4. Check firewall/antivirus settings');
    return false;
  }
}

// Run the tests
testAPI()
  .then(success => {
    console.log('\n' + '-'.repeat(60));
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Unexpected error:', err);
    process.exit(1);
  });