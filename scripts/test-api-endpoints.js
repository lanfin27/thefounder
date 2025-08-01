// Comprehensive API endpoint testing script
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const baseURL = 'http://localhost:3000';
const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';

// Test configuration
const endpoints = [
  {
    name: 'Scraping Status',
    method: 'GET',
    path: '/api/scraping/status',
    description: 'Real-time scraping system status',
    validateResponse: (data) => {
      return data.system && data.queue && data.database && data.scraping;
    }
  },
  {
    name: 'Listings',
    method: 'GET',
    path: '/api/listings',
    description: 'Flippa listings with pagination',
    validateResponse: (data) => {
      return data.listings && data.pagination && data.categories;
    }
  },
  {
    name: 'Listings with Filters',
    method: 'GET',
    path: '/api/listings?page=1&limit=10&sortBy=asking_price&sortOrder=desc',
    description: 'Filtered listings',
    validateResponse: (data) => {
      return data.listings && data.pagination.limit === 10;
    }
  },
  {
    name: 'Queue Status',
    method: 'GET',
    path: '/api/scraping/queue',
    description: 'Queue statistics',
    validateResponse: (data) => {
      return data.stats && typeof data.stats.waiting === 'number';
    }
  },
  {
    name: 'Jobs List',
    method: 'GET',
    path: '/api/scraping/jobs',
    description: 'Scraping jobs list',
    validateResponse: (data) => {
      return data.jobs !== undefined && data.queueStats;
    }
  },
  {
    name: 'Scraping Stats',
    method: 'GET',
    path: '/api/scraping/stats',
    description: 'Scraping statistics',
    validateResponse: (data) => {
      return data.categories || data.statistics;
    }
  }
];

async function testEndpoint(endpoint) {
  console.log(`\n📍 Testing: ${endpoint.name}`);
  console.log(`   ${endpoint.method} ${endpoint.path}`);
  console.log(`   ${endpoint.description}`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios({
      method: endpoint.method,
      url: `${baseURL}${endpoint.path}`,
      headers: {
        'x-admin-token': adminToken,
        'x-request-start': startTime.toString()
      },
      timeout: 10000
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`   ✅ Status: ${response.status} (${responseTime}ms)`);
    
    // Validate response structure
    if (response.data.success && endpoint.validateResponse) {
      const isValid = endpoint.validateResponse(response.data.data);
      if (isValid) {
        console.log('   ✅ Response structure valid');
        
        // Show sample data
        if (endpoint.name === 'Scraping Status') {
          console.log(`   System Health: ${response.data.data.system.health.status}`);
          console.log(`   Queue Active: ${response.data.data.queue.stats.active}`);
          console.log(`   Total Listings: ${response.data.data.database.listings.total}`);
        } else if (endpoint.name === 'Listings') {
          console.log(`   Total Listings: ${response.data.data.pagination.total}`);
          console.log(`   Categories: ${response.data.data.categories.length}`);
          if (response.data.data.listings.length > 0) {
            const first = response.data.data.listings[0];
            console.log(`   Sample: ${first.title} - $${first.asking_price}`);
          }
        }
      } else {
        console.log('   ⚠️  Response structure unexpected');
      }
    }
    
    return { success: true, endpoint: endpoint.name };
    
  } catch (error) {
    console.log(`   ❌ FAILED - Status: ${error.response?.status || 'Network Error'}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.status === 404) {
      console.log('   💡 Endpoint not found - check file location');
    } else if (error.response?.status === 401) {
      console.log('   💡 Authentication failed - check admin token');
    } else if (error.response?.status === 500) {
      console.log('   💡 Server error - check logs for details');
    }
    
    return { success: false, endpoint: endpoint.name, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 API Endpoint Testing');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${baseURL}`);
  console.log(`Admin Token: ***${adminToken.slice(-8)}`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.endpoint}: ${r.error}`);
    });
  }
  
  if (successful === results.length) {
    console.log('\n🎉 All API endpoints are working correctly!');
  } else {
    console.log('\n⚠️  Some endpoints need attention');
  }
  
  console.log('=' .repeat(60));
}

// Add to package.json scripts
console.log('\n💡 Add this to package.json scripts:');
console.log('"test:api": "node scripts/test-api-endpoints.js"');

// Run tests
console.log('\n🚀 Starting API endpoint tests...\n');

setTimeout(() => {
  runTests().catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
}, 2000);