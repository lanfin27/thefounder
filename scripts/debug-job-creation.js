// Debug job creation issue
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function debugJobCreation() {
  console.log('🔍 Debugging Job Creation Issue');
  console.log('=' .repeat(60));
  
  const baseURL = 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  
  // Test with minimal job data
  const testCases = [
    {
      name: 'Minimal job data',
      data: {
        jobType: 'listing_scan'
      }
    },
    {
      name: 'With basic config',
      data: {
        jobType: 'listing_scan',
        config: {
          test: true
        }
      }
    },
    {
      name: 'Full config',
      data: {
        jobType: 'listing_scan',
        config: {
          category: 'saas',
          maxPages: 1,
          priority: 'high',
          test: true
        }
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('   Payload:', JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await axios.post(
        `${baseURL}/api/scraping/jobs`,
        testCase.data,
        {
          headers: {
            'x-admin-token': adminToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: null // Don't throw on any status
        }
      );
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 || response.status === 201) {
        console.log('   ✅ SUCCESS');
        console.log('   Job ID:', response.data.data?.job?.id);
      } else if (response.status === 500) {
        console.log('   ❌ Server Error');
        console.log('   Error:', response.data.error);
        if (response.data.stack) {
          console.log('   Stack:', response.data.stack);
        }
      } else {
        console.log(`   ⚠️  Status ${response.status}`);
        console.log('   Response:', response.data);
      }
      
    } catch (error) {
      console.log('   💥 Request failed:', error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('💡 Next Steps:');
  console.log('1. Check the Next.js server logs for detailed error messages');
  console.log('2. Verify Supabase connection and table structure');
  console.log('3. Check if the scraping_jobs table exists in Supabase');
  console.log('=' .repeat(60));
}

debugJobCreation().catch(console.error);