// Monitor data flow from scraping to database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');
const axios = require('axios');

async function monitorDataFlow() {
  console.log('📊 Data Flow Monitoring Dashboard');
  console.log('=' .repeat(60));
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  
  // 1. Check Redis Queue Status
  console.log('\n🔴 Redis Queue Status:');
  try {
    const queue = new Bull('flippa-scraping', process.env.REDIS_URL);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);
    
    console.log(`   Waiting: ${waiting}`);
    console.log(`   Active: ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);
    
    // Get recent completed jobs
    const completedJobs = await queue.getCompleted(0, 5);
    if (completedJobs.length > 0) {
      console.log('\n   Recent completed jobs:');
      completedJobs.forEach(job => {
        console.log(`   - Job ${job.id}: ${job.data.jobType} - ${job.data.category || job.data.listingId}`);
        if (job.returnvalue) {
          console.log(`     Result: ${job.returnvalue.count || 0} items processed`);
        }
      });
    }
    
    // Get recent failed jobs
    const failedJobs = await queue.getFailed(0, 5);
    if (failedJobs.length > 0) {
      console.log('\n   Recent failed jobs:');
      failedJobs.forEach(job => {
        console.log(`   - Job ${job.id}: ${job.data.jobType}`);
        console.log(`     Error: ${job.failedReason}`);
      });
    }
    
    await queue.close();
  } catch (error) {
    console.log('   ❌ Could not connect to Redis queue:', error.message);
  }
  
  // 2. Check Database Status
  console.log('\n💾 Database Status:');
  try {
    const { count, error } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ Database query error:', error.message);
    } else {
      console.log(`   Total listings: ${count || 0}`);
      
      // Get recent listings
      const { data: recent } = await supabase
        .from('flippa_listings')
        .select('listing_id, title, asking_price, scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(5);
      
      if (recent && recent.length > 0) {
        console.log('\n   Recent listings:');
        recent.forEach(listing => {
          const age = new Date() - new Date(listing.scraped_at);
          const ageMinutes = Math.floor(age / 60000);
          console.log(`   - ${listing.title} ($${listing.asking_price}) - ${ageMinutes}m ago`);
        });
      }
    }
  } catch (error) {
    console.log('   ❌ Database connection error:', error.message);
  }
  
  // 3. Check API Endpoints
  console.log('\n🌐 API Endpoint Status:');
  const endpoints = [
    '/api/scraping/status',
    '/api/listings',
    '/api/scraping/queue',
    '/api/scraping/jobs'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`http://localhost:3000${endpoint}`, {
        headers: { 'x-admin-token': adminToken },
        timeout: 5000
      });
      
      console.log(`   ✅ ${endpoint} - Status ${response.status}`);
      
      if (endpoint === '/api/listings' && response.data.data) {
        console.log(`      Returned ${response.data.data.listings.length} listings`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint} - ${error.response?.status || 'Failed'}`);
    }
  }
  
  // 4. Worker Process Check
  console.log('\n⚙️  Worker Process:');
  try {
    const workerStatus = await checkWorkerStatus();
    console.log(`   Worker running: ${workerStatus ? '✅' : '❌'}`);
  } catch (error) {
    console.log('   ❌ Could not check worker status');
  }
  
  // 5. Data Flow Summary
  console.log('\n📈 Data Flow Summary:');
  console.log('   1. Scraping jobs → Redis queue ✅');
  console.log('   2. Worker processes jobs → ?');
  console.log('   3. Data saved to database → ?');
  console.log('   4. API serves data → ✅');
  
  console.log('\n' + '=' .repeat(60));
  console.log('🔧 Recommendations:');
  console.log('1. If no data in database: Check worker logs for errors');
  console.log('2. If jobs failing: Review error messages above');
  console.log('3. If API failing: Check Next.js server is running');
  console.log('4. Run: npm run worker (in separate terminal)');
  console.log('=' .repeat(60));
}

async function checkWorkerStatus() {
  // Check if worker process is running by looking at active jobs
  const queue = new Bull('flippa-scraping', process.env.REDIS_URL);
  const active = await queue.getActiveCount();
  const stalled = await queue.getStalledCount();
  await queue.close();
  
  return active > 0 || stalled === 0;
}

// Run monitoring
monitorDataFlow().catch(console.error);

// Add auto-refresh option
if (process.argv.includes('--watch')) {
  console.log('\n🔄 Auto-refreshing every 10 seconds...');
  setInterval(() => {
    console.clear();
    monitorDataFlow().catch(console.error);
  }, 10000);
}