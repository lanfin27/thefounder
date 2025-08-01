// Test Bull queue with fixed Redis connection
const Bull = require('bull');
const { redisConnection } = require('../src/lib/redis/connection');
require('dotenv').config({ path: '.env.local' });

async function testBullQueue() {
  console.log('🐂 Testing Bull Queue with fixed Redis connection...\n');
  
  let queue = null;
  let jobProcessed = false;
  
  try {
    // 1. Connect to Redis first
    console.log('1️⃣ Connecting to Redis...');
    const client = await redisConnection.connect();
    console.log('✅ Redis connected successfully');
    
    // 2. Create Bull queue with minimal configuration
    console.log('\n2️⃣ Creating Bull queue...');
    queue = new Bull('thefounder-test-queue', process.env.REDIS_URL, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      }
    });
    
    console.log('✅ Queue created successfully');
    
    // 3. Set up job processor
    console.log('\n3️⃣ Setting up job processor...');
    queue.process(async (job) => {
      console.log(`   📥 Processing job ${job.id}: ${JSON.stringify(job.data)}`);
      jobProcessed = true;
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true, timestamp: new Date().toISOString() };
    });
    
    console.log('✅ Job processor registered');
    
    // 4. Add test jobs
    console.log('\n4️⃣ Adding test jobs...');
    const jobs = [];
    
    for (let i = 1; i <= 3; i++) {
      const job = await queue.add({
        type: 'test-job',
        id: i,
        message: `Test job ${i}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`   ✅ Added job ${job.id}`);
      jobs.push(job);
    }
    
    // 5. Wait for processing
    console.log('\n5️⃣ Waiting for job processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Check queue stats
    console.log('\n6️⃣ Checking queue statistics...');
    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const completed = await queue.getCompletedCount();
    const failed = await queue.getFailedCount();
    
    console.log(`   📊 Queue Stats:`);
    console.log(`      - Waiting: ${waiting}`);
    console.log(`      - Active: ${active}`);
    console.log(`      - Completed: ${completed}`);
    console.log(`      - Failed: ${failed}`);
    
    // 7. Test priority jobs
    console.log('\n7️⃣ Testing priority jobs...');
    const priorityJob = await queue.add(
      { type: 'priority-job', message: 'High priority task' },
      { priority: 1 }
    );
    console.log(`   ✅ Added priority job ${priorityJob.id}`);
    
    // 8. Test delayed job
    console.log('\n8️⃣ Testing delayed job...');
    const delayedJob = await queue.add(
      { type: 'delayed-job', message: 'Delayed task' },
      { delay: 5000 }
    );
    console.log(`   ✅ Added delayed job ${delayedJob.id} (5s delay)`);
    
    // 9. Clean up
    console.log('\n9️⃣ Cleaning up...');
    await queue.empty();
    await queue.close();
    console.log('✅ Queue cleaned and closed');
    
    // Disconnect Redis
    await redisConnection.disconnect();
    
    if (jobProcessed) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Bull Queue test passed!');
      console.log('🚀 Queue system is ready for TheFounder scraping!');
      console.log('='.repeat(50));
      return true;
    } else {
      throw new Error('No jobs were processed');
    }
    
  } catch (error) {
    console.error('\n❌ Bull Queue test failed:', error.message);
    console.error('Stack:', error.stack);
    
    if (queue) {
      try {
        await queue.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    await redisConnection.disconnect();
    return false;
  }
}

// Run the test
testBullQueue()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });