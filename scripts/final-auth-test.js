// Final comprehensive test of the authentication system
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function finalTest() {
  console.log('🎯 Final Authentication System Test');
  console.log('=' .repeat(60));
  
  const baseURL = 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  
  console.log('📋 Environment Check:');
  console.log(`   ADMIN_TOKEN: ${process.env.ADMIN_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Token: ***${adminToken.slice(-8)}`);
  console.log(`   Base URL: ${baseURL}`);
  console.log('');
  
  // Test all endpoints
  const tests = [
    {
      name: 'Auth Test Endpoint',
      method: 'GET',
      url: `${baseURL}/api/scraping/auth-test`,
      description: 'Verifies authentication system'
    },
    {
      name: 'Test Endpoint',
      method: 'GET',
      url: `${baseURL}/api/scraping/test`,
      description: 'Tests basic scraping functionality'
    },
    {
      name: 'List Jobs',
      method: 'GET',
      url: `${baseURL}/api/scraping/jobs`,
      description: 'Lists all scraping jobs'
    },
    {
      name: 'Queue Status',
      method: 'GET',
      url: `${baseURL}/api/scraping/queue`,
      description: 'Shows queue statistics'
    },
    {
      name: 'Statistics',
      method: 'GET',
      url: `${baseURL}/api/scraping/stats`,
      description: 'Shows scraping statistics'
    }
  ];
  
  console.log('🧪 Testing All Endpoints:');
  console.log('-'.repeat(60));
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\n📍 ${test.name}`);
    console.log(`   ${test.description}`);
    console.log(`   ${test.method} ${test.url}`);
    
    try {
      const response = await axios({
        method: test.method,
        url: test.url,
        headers: {
          'x-admin-token': adminToken
        },
        timeout: 10000
      });
      
      console.log(`   ✅ PASSED - Status: ${response.status}`);
      
      // Show relevant data
      if (test.name === 'List Jobs' && response.data.data) {
        console.log(`   Jobs found: ${response.data.data.jobs?.length || 0}`);
      } else if (test.name === 'Queue Status' && response.data.data) {
        const stats = response.data.data.stats;
        if (stats) {
          console.log(`   Queue: ${stats.waiting} waiting, ${stats.active} active`);
        }
      }
      
    } catch (error) {
      allPassed = false;
      console.log(`   ❌ FAILED - Status: ${error.response?.status || 'Network Error'}`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.status === 500) {
        console.log('   💡 Internal server error - check logs for details');
      }
    }
  }
  
  // Test job creation
  console.log('\n\n🚀 Testing Job Creation:');
  console.log('-'.repeat(60));
  
  const jobData = {
    jobType: 'listing_scan',
    config: {
      category: 'saas',
      maxPages: 1,
      priority: 'high',
      description: 'Test job from final auth test',
      test: true
    }
  };
  
  console.log('📝 Creating test job...');
  console.log(`   Type: ${jobData.jobType}`);
  console.log(`   Category: ${jobData.config.category}`);
  console.log(`   Pages: ${jobData.config.maxPages}`);
  
  try {
    const response = await axios.post(
      `${baseURL}/api/scraping/jobs`,
      jobData,
      {
        headers: {
          'x-admin-token': adminToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('\n   ✅ JOB CREATED SUCCESSFULLY!');
    console.log(`   Job ID: ${response.data.data?.job?.id}`);
    console.log(`   Status: ${response.data.data?.job?.status}`);
    console.log(`   Queue Job ID: ${response.data.data?.queueJobId}`);
    
  } catch (error) {
    allPassed = false;
    console.log('\n   ❌ JOB CREATION FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.status === 500 && error.response?.data?.error?.includes('supabase')) {
      console.log('\n   🔧 Supabase error detected - checking configuration...');
      console.log('   Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    }
  }
  
  console.log('\n\n' + '=' .repeat(60));
  console.log('📊 Test Summary:');
  console.log('=' .repeat(60));
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('🎉 The authentication system is fully functional.');
    console.log('\nYou can now run: npm run scrape:start');
  } else {
    console.log('❌ Some tests failed.');
    console.log('🔧 Please check the errors above and fix any issues.');
    console.log('\nCommon issues:');
    console.log('- Make sure the development server is running (npm run dev)');
    console.log('- Check that all environment variables are set');
    console.log('- Verify Redis is connected');
    console.log('- Check Supabase configuration');
  }
  
  console.log('=' .repeat(60));
}

// Run the test
console.log('🚀 Starting final authentication test...\n');
console.log('Make sure the development server is running (npm run dev)\n');

setTimeout(() => {
  finalTest().catch(error => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  });
}, 2000);