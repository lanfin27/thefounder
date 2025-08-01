// Test a single scraping job with debugging
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');

async function testSingleJob() {
  console.log('🧪 Testing Single Scraping Job');
  console.log('=' .repeat(60));
  
  // Initialize queue
  const queue = new Bull('flippa-scraping', process.env.REDIS_URL);
  
  // Check queue status
  const stats = await queue.getJobCounts();
  console.log('\n📊 Current queue status:');
  console.log(`   Waiting: ${stats.waiting}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Completed: ${stats.completed}`);
  console.log(`   Failed: ${stats.failed}`);
  
  // Create a test job
  console.log('\n📝 Creating test job...');
  const testJob = {
    jobType: 'listing_scan',
    category: 'saas',
    page: 1,
    useAdaptive: true,
    config: {
      debug: true,
      test: true
    }
  };
  
  const job = await queue.add('test-job', testJob, {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false
  });
  
  console.log(`✅ Job created with ID: ${job.id}`);
  console.log(`   Type: ${testJob.jobType}`);
  console.log(`   Category: ${testJob.category}`);
  console.log(`   Adaptive: ${testJob.useAdaptive}`);
  
  // Wait for job to complete
  console.log('\n⏳ Waiting for job to complete...');
  console.log('   (Make sure worker is running: npm run worker)');
  
  let completed = false;
  let checkCount = 0;
  const maxChecks = 60; // 5 minutes max
  
  while (!completed && checkCount < maxChecks) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const jobStatus = await job.getState();
    const progress = await job.progress();
    
    console.log(`   Status: ${jobStatus} (${progress}%)`);
    
    if (jobStatus === 'completed' || jobStatus === 'failed') {
      completed = true;
      
      if (jobStatus === 'completed') {
        const result = job.returnvalue;
        console.log('\n✅ Job completed successfully!');
        console.log('Result:', JSON.stringify(result, null, 2));
        
        // Check database for new listings
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { data: listings, count } = await supabase
          .from('flippa_listings')
          .select('*', { count: 'exact' })
          .eq('primary_category', 'saas')
          .order('scraped_at', { ascending: false })
          .limit(5);
        
        console.log(`\n💾 Database check:`);
        console.log(`   Total SaaS listings: ${count}`);
        if (listings && listings.length > 0) {
          console.log('   Recent listings:');
          listings.forEach(l => {
            console.log(`   - ${l.title} ($${l.asking_price})`);
          });
        }
      } else {
        console.log('\n❌ Job failed!');
        console.log('Error:', job.failedReason);
        
        // Get job logs
        const logs = await queue.getJobLogs(job.id);
        if (logs.logs.length > 0) {
          console.log('\nJob logs:');
          logs.logs.forEach(log => console.log(`   ${log}`));
        }
      }
    }
    
    checkCount++;
  }
  
  if (!completed) {
    console.log('\n⏱️ Job timed out - check worker logs');
  }
  
  await queue.close();
  
  console.log('\n' + '=' .repeat(60));
}

testSingleJob().catch(console.error);