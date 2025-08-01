// Test Flippa scraping with a small dataset
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const { redisConnection } = require('../src/lib/redis/connection');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testScraping() {
  console.log('🧪 Flippa Scraping Test');
  console.log('=' .repeat(50));
  console.log('Testing with single category (SaaS) and limited pages\n');
  
  let queue = null;
  
  try {
    // 1. Connect to Redis
    console.log('1️⃣ Connecting to Redis...');
    await redisConnection.connect();
    console.log('✅ Redis connected');
    
    // 2. Create queue
    console.log('\n2️⃣ Creating job queue...');
    queue = new Bull('flippa-scraping', process.env.REDIS_URL);
    console.log('✅ Queue created');
    
    // 3. Check initial database state
    console.log('\n3️⃣ Checking database state...');
    const { count: initialCount } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .eq('primary_category', 'saas');
    
    console.log(`   Initial SaaS listings: ${initialCount || 0}`);
    
    // 4. Create test scraping job
    console.log('\n4️⃣ Creating test scraping job...');
    const testJob = await queue.add({
      jobType: 'scrape-listings',
      category: 'saas',
      page: 1,
      test: true
    }, {
      attempts: 1,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    });
    
    console.log(`✅ Test job created: ${testJob.id}`);
    
    // 5. Monitor job progress
    console.log('\n5️⃣ Monitoring job progress...');
    console.log('   Waiting for worker to process job...');
    console.log('   (Make sure worker is running: npm run worker)\n');
    
    // Wait for job completion
    const checkInterval = setInterval(async () => {
      const job = await queue.getJob(testJob.id);
      const state = await job.getState();
      
      console.log(`   Job ${job.id} status: ${state}`);
      
      if (state === 'completed') {
        clearInterval(checkInterval);
        
        const result = job.returnvalue;
        console.log('\n✅ Job completed successfully!');
        console.log(`   Category: ${result.category}`);
        console.log(`   Page: ${result.page}`);
        console.log(`   Listings found: ${result.count}`);
        
        // Check final database state
        await checkDatabaseResults();
        
        // Clean up
        await queue.close();
        await redisConnection.disconnect();
        
        console.log('\n🎉 Scraping test completed successfully!');
        process.exit(0);
      } else if (state === 'failed') {
        clearInterval(checkInterval);
        
        console.log('\n❌ Job failed!');
        const failedReason = job.failedReason;
        console.log(`   Error: ${failedReason}`);
        
        await queue.close();
        await redisConnection.disconnect();
        process.exit(1);
      }
    }, 2000);
    
    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('\n⏱️ Test timeout - job did not complete in 60 seconds');
      console.log('   Make sure the worker is running: npm run worker');
      queue.close();
      redisConnection.disconnect();
      process.exit(1);
    }, 60000);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    
    if (queue) await queue.close();
    await redisConnection.disconnect();
    process.exit(1);
  }
}

async function checkDatabaseResults() {
  console.log('\n6️⃣ Checking database results...');
  
  try {
    // Get recent SaaS listings
    const { data: listings, error } = await supabase
      .from('flippa_listings')
      .select('*')
      .eq('primary_category', 'saas')
      .order('scraped_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (listings && listings.length > 0) {
      console.log(`✅ Found ${listings.length} recent SaaS listings:`);
      
      listings.forEach((listing, index) => {
        console.log(`\n   ${index + 1}. ${listing.title}`);
        console.log(`      Price: $${listing.asking_price.toLocaleString()}`);
        console.log(`      Revenue: $${(listing.monthly_revenue || 0).toLocaleString()}/mo`);
        console.log(`      Profit: $${(listing.monthly_profit || 0).toLocaleString()}/mo`);
        console.log(`      URL: ${listing.url}`);
      });
      
      // Calculate industry statistics
      const avgPrice = listings.reduce((sum, l) => sum + l.asking_price, 0) / listings.length;
      const avgRevenue = listings.reduce((sum, l) => sum + (l.monthly_revenue || 0), 0) / listings.length;
      
      console.log('\n📊 Quick Statistics:');
      console.log(`   Average Price: $${avgPrice.toLocaleString()}`);
      console.log(`   Average Revenue: $${avgRevenue.toLocaleString()}/mo`);
      
      if (avgRevenue > 0) {
        const avgMultiple = avgPrice / (avgRevenue * 12);
        console.log(`   Average Revenue Multiple: ${avgMultiple.toFixed(2)}x`);
      }
    } else {
      console.log('⚠️  No listings found in database');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

// Start test
testScraping();