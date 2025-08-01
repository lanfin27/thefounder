// Quick verification that jobs endpoint is fixed
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function verifyFix() {
  console.log('🔍 Verifying Jobs Endpoint Fix');
  console.log('=' .repeat(50));
  
  const baseURL = 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  
  // Test 1: List jobs
  console.log('\n1️⃣ Testing GET /api/scraping/jobs');
  try {
    const response = await axios.get(`${baseURL}/api/scraping/jobs`, {
      headers: { 'x-admin-token': adminToken }
    });
    console.log('   ✅ SUCCESS - Jobs listing works!');
    console.log(`   Found ${response.data.data?.jobs?.length || 0} jobs`);
  } catch (error) {
    console.log('   ❌ FAILED');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
  }
  
  // Test 2: Create a job
  console.log('\n2️⃣ Testing POST /api/scraping/jobs');
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
    console.log('   ✅ SUCCESS - Job creation works!');
    console.log(`   Job ID: ${response.data.data?.job?.id}`);
    console.log(`   Status: ${response.data.data?.job?.status}`);
  } catch (error) {
    console.log('   ❌ FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.debug) {
      console.log('   Debug:', error.response.data.debug);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Verification Complete');
}

verifyFix().catch(console.error);