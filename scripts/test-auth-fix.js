// Test script to verify authentication fix
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testAuthFix() {
  console.log('🔐 Testing Authentication Fix');
  console.log('=' .repeat(60));
  
  const baseURL = 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  
  console.log('📋 Configuration:');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Admin Token: ***${adminToken.slice(-8)}`);
  console.log('');
  
  const endpoints = [
    { name: 'Auth Test', method: 'GET', path: '/api/scraping/auth-test' },
    { name: 'Test Endpoint', method: 'GET', path: '/api/scraping/test' },
    { name: 'List Jobs', method: 'GET', path: '/api/scraping/jobs' },
    { name: 'Queue Status', method: 'GET', path: '/api/scraping/queue' },
    { name: 'Statistics', method: 'GET', path: '/api/scraping/stats' }
  ];
  
  console.log('🧪 Testing All Endpoints:');
  console.log('-'.repeat(60));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const endpoint of endpoints) {
    console.log(`\n📍 ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
    
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${baseURL}${endpoint.path}`,
        headers: {
          'x-admin-token': adminToken,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`   ✅ SUCCESS - Status: ${response.status}`);
      if (response.data.success !== undefined) {
        console.log(`   Response: success=${response.data.success}`);
      }
      passCount++;
      
    } catch (error) {
      console.log(`   ❌ FAILED - Status: ${error.response?.status || 'Network Error'}`);
      if (error.response?.data) {
        console.log(`   Error: ${error.response.data.error || JSON.stringify(error.response.data)}`);
      }
      failCount++;
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
  
  // Test job creation
  console.log('\n🚀 Testing Job Creation:');
  console.log('-'.repeat(60));
  
  const jobData = {
    jobType: 'listing_scan',
    config: {
      category: 'test',
      maxPages: 1,
      test: true
    }
  };
  
  try {
    const response = await axios.post(
      `${baseURL}/api/scraping/jobs`,
      jobData,
      {
        headers: {
          'x-admin-token': adminToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Job created successfully!');
    console.log(`   Job ID: ${response.data.data?.job?.id}`);
    console.log(`   Queue Job ID: ${response.data.data?.queueJobId}`);
    console.log(`   Success: ${response.data.success}`);
    
  } catch (error) {
    console.log('❌ Job creation failed');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Authentication Test Complete');
  
  if (failCount === 0) {
    console.log('✅ All endpoints are now properly authenticated!');
    console.log('🎉 The authentication system is working correctly.');
  } else {
    console.log('⚠️ Some endpoints still have authentication issues.');
    console.log('🔧 Please check the failed endpoints above.');
  }
  
  console.log('=' .repeat(60));
}

// Run the test
console.log('Starting authentication test...\n');
testAuthFix().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});