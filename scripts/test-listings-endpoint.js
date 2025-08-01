// Test the listings endpoint and debug any issues
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const baseURL = 'http://localhost:3000';
const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection');
  console.log('=' .repeat(60));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error, count } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Supabase query failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log(`   Table 'flippa_listings' has ${count || 0} rows`);
    
    // Try to fetch a few records
    const { data: sampleData, error: sampleError } = await supabase
      .from('flippa_listings')
      .select('id, title, asking_price, scraped_at')
      .limit(3);
    
    if (!sampleError && sampleData) {
      console.log(`   Sample records: ${sampleData.length}`);
      sampleData.forEach(record => {
        console.log(`   - ${record.title || 'No title'} ($${record.asking_price || 0})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
    return false;
  }
}

async function testListingsEndpoint() {
  console.log('\n🧪 Testing /api/listings Endpoint');
  console.log('=' .repeat(60));
  
  const tests = [
    {
      name: 'Basic request',
      url: '/api/listings'
    },
    {
      name: 'With pagination',
      url: '/api/listings?page=1&limit=5'
    },
    {
      name: 'With filters',
      url: '/api/listings?limit=10&sortBy=asking_price&sortOrder=desc'
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📍 Test: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${baseURL}${test.url}`, {
        headers: {
          'x-admin-token': adminToken,
          'x-request-start': startTime.toString()
        },
        timeout: 10000,
        validateStatus: null // Don't throw on any status
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`   Status: ${response.status} (${responseTime}ms)`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS');
        const data = response.data.data;
        console.log(`   Total listings: ${data.pagination.total}`);
        console.log(`   Returned: ${data.listings.length}`);
        console.log(`   Categories: ${data.categories.length}`);
        
        if (data.listings.length > 0) {
          const first = data.listings[0];
          console.log(`   First listing: ${first.title} - $${first.asking_price}`);
        }
      } else if (response.status === 500) {
        console.log('   ❌ INTERNAL SERVER ERROR');
        console.log('   Error:', response.data.error);
        if (response.data.debug) {
          console.log('   Debug info:', JSON.stringify(response.data.debug, null, 2));
        }
      } else {
        console.log(`   ⚠️  Status ${response.status}`);
        console.log('   Response:', response.data);
      }
      
    } catch (error) {
      console.log('   💥 Request failed:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('   Make sure the Next.js dev server is running (npm run dev)');
      }
    }
  }
}

async function debugEndpoint() {
  console.log('\n🔧 Direct API Call Debug');
  console.log('=' .repeat(60));
  
  try {
    // Make a direct call with full error capture
    const response = await fetch(`${baseURL}/api/listings`, {
      method: 'GET',
      headers: {
        'x-admin-token': adminToken,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    try {
      const json = JSON.parse(text);
      console.log('Response data:', JSON.stringify(json, null, 2));
    } catch {
      console.log('Response text:', text);
    }
    
  } catch (error) {
    console.log('Fetch error:', error);
  }
}

async function runTests() {
  console.log('🚀 Listings Endpoint Debugging');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${baseURL}`);
  console.log(`Admin Token: ***${adminToken.slice(-8)}`);
  
  // Test Supabase connection first
  const dbConnected = await testSupabaseConnection();
  
  if (!dbConnected) {
    console.log('\n⚠️  Database connection failed. Check your Supabase credentials.');
    console.log('Required environment variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  // Test the listings endpoint
  await testListingsEndpoint();
  
  // Debug endpoint if needed
  await debugEndpoint();
  
  console.log('\n' + '=' .repeat(60));
  console.log('💡 Debugging complete');
  console.log('=' .repeat(60));
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test script crashed:', error);
  process.exit(1);
});