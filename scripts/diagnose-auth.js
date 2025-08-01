// Diagnostic script for authentication issues
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function diagnoseAuth() {
  console.log('🔍 Authentication Diagnosis Tool');
  console.log('=' .repeat(60));
  
  // 1. Environment Variable Check
  console.log('\n1️⃣ Environment Variables:');
  console.log(`   ADMIN_TOKEN: ${process.env.ADMIN_TOKEN ? '✅ Set' : '❌ Not set'} (${process.env.ADMIN_TOKEN?.length || 0} chars)`);
  console.log(`   NEXT_PUBLIC_ADMIN_TOKEN: ${process.env.NEXT_PUBLIC_ADMIN_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   FLIPPA_ADMIN_TOKEN: ${process.env.FLIPPA_ADMIN_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Token value: ${process.env.ADMIN_TOKEN ? `***${process.env.ADMIN_TOKEN.slice(-8)}` : 'N/A'}`);
  
  const baseURL = 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  
  // 2. Test Different Authentication Methods
  console.log('\n2️⃣ Testing Authentication Methods:');
  
  // Test x-admin-token header
  console.log('\n   A. Testing x-admin-token header:');
  try {
    const response = await axios.get(`${baseURL}/api/scraping/test`, {
      headers: { 'x-admin-token': adminToken }
    });
    console.log('      ✅ x-admin-token works!');
    console.log(`      Response: ${response.data.success ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.log(`      ❌ x-admin-token failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`      Error: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  // Test Authorization Bearer header
  console.log('\n   B. Testing Authorization Bearer header:');
  try {
    const response = await axios.get(`${baseURL}/api/scraping/test`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('      ✅ Bearer token works!');
  } catch (error) {
    console.log(`      ❌ Bearer token failed: ${error.response?.status}`);
  }
  
  // Test custom header variations
  console.log('\n   C. Testing other header variations:');
  const headerVariations = [
    { 'X-Admin-Token': adminToken },
    { 'Admin-Token': adminToken },
    { 'x-api-key': adminToken },
    { 'api-key': adminToken }
  ];
  
  for (const headers of headerVariations) {
    const headerName = Object.keys(headers)[0];
    try {
      await axios.get(`${baseURL}/api/scraping/test`, { headers });
      console.log(`      ✅ ${headerName} works!`);
    } catch (error) {
      console.log(`      ❌ ${headerName} failed`);
    }
  }
  
  // 3. Test Different Endpoints
  console.log('\n3️⃣ Testing Different Endpoints:');
  
  const endpoints = [
    { path: '/api/scraping/test', method: 'GET', name: 'Test endpoint' },
    { path: '/api/scraping/jobs', method: 'GET', name: 'List jobs' },
    { path: '/api/scraping/queue', method: 'GET', name: 'Queue status' },
    { path: '/api/scraping/stats', method: 'GET', name: 'Statistics' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n   Testing ${endpoint.name} (${endpoint.method} ${endpoint.path}):`);
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${baseURL}${endpoint.path}`,
        headers: { 'x-admin-token': adminToken }
      });
      console.log(`      ✅ Success: ${response.status}`);
    } catch (error) {
      console.log(`      ❌ Failed: ${error.response?.status} ${error.response?.statusText}`);
      if (error.response?.data?.error) {
        console.log(`      Error: ${error.response.data.error}`);
      }
    }
  }
  
  // 4. Test Job Creation with Different Auth
  console.log('\n4️⃣ Testing Job Creation:');
  
  const jobData = {
    jobType: 'listing_scan',
    config: {
      category: 'test',
      maxPages: 1
    }
  };
  
  console.log('   A. With x-admin-token:');
  try {
    const response = await axios.post(`${baseURL}/api/scraping/jobs`, jobData, {
      headers: { 
        'x-admin-token': adminToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('      ✅ Job created successfully!');
  } catch (error) {
    console.log(`      ❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
  }
  
  // 5. Check for Auth Middleware
  console.log('\n5️⃣ Authentication Analysis:');
  console.log('   /api/scraping/test: Uses x-admin-token header ✅');
  console.log('   /api/scraping/jobs: Uses Supabase auth.getUser() ❌');
  console.log('   This mismatch is causing the authentication failure!');
  
  console.log('\n📋 Diagnosis Summary:');
  console.log('   Problem: API routes use different authentication methods');
  console.log('   - Test endpoint: Checks x-admin-token header');
  console.log('   - Jobs endpoint: Checks Supabase user authentication');
  console.log('   Solution: Update jobs endpoint to use admin token like test endpoint');
  
  console.log('\n' + '=' .repeat(60));
}

// Run diagnosis
diagnoseAuth().catch(error => {
  console.error('Diagnosis failed:', error);
});