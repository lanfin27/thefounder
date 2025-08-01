// Redis connection test script
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

async function testRedisConnection() {
  console.log('🔄 Testing Redis connection...');
  console.log(`   Using: ${process.env.REDIS_URL || 'redis://localhost:6379'}\n`);
  
  // Use minimal connection method that works with Redis Cloud
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // Handle connection errors
  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...');
    const pong = await redis.ping();
    console.log(`✅ Redis connection successful: ${pong}`);

    // Test basic operations
    console.log('\n2️⃣ Testing read/write operations...');
    await redis.set('test_key', 'test_value', 'EX', 60); // Expire in 60 seconds
    const value = await redis.get('test_key');
    console.log(`✅ Redis read/write test passed: ${value}`);

    // Test job queue functionality
    console.log('\n3️⃣ Testing queue operations...');
    await redis.lpush('test_queue', JSON.stringify({ job: 'test_job', timestamp: Date.now() }));
    const job = await redis.rpop('test_queue');
    const jobData = JSON.parse(job);
    console.log(`✅ Redis queue test passed: ${jobData.job}`);

    // Test hash operations (for job metadata)
    console.log('\n4️⃣ Testing hash operations...');
    await redis.hset('test_job_meta', 'status', 'pending', 'created_at', Date.now());
    const status = await redis.hget('test_job_meta', 'status');
    console.log(`✅ Redis hash test passed: status=${status}`);

    // Test pub/sub (for real-time updates)
    console.log('\n5️⃣ Testing pub/sub...');
    const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    await new Promise((resolve) => {
      subClient.on('message', (channel, message) => {
        console.log(`✅ Redis pub/sub test passed: ${message}`);
        subClient.unsubscribe();
        pubClient.disconnect();
        subClient.disconnect();
        resolve();
      });
      
      subClient.subscribe('test_channel');
      setTimeout(() => {
        pubClient.publish('test_channel', 'test_message');
      }, 100);
    });

    // Cleanup
    await redis.del('test_key', 'test_job_meta');
    
    console.log('\n🚀 All Redis tests passed! Redis is ready for job queue system!');
    console.log('\n📊 Redis Info:');
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/);
    if (version) console.log(`   Version: ${version[1]}`);
    
    await redis.disconnect();
    return true;

  } catch (error) {
    console.error('\n❌ Redis connection failed:', error.message);
    console.log('\n💡 Solutions for Windows:');
    console.log('\n1. WSL Option (Recommended):');
    console.log('   wsl --install');
    console.log('   wsl -e sudo apt update && sudo apt install redis-server');
    console.log('   wsl -e sudo service redis-server start');
    console.log('\n2. Memurai Option:');
    console.log('   Download from: https://www.memurai.com/get-memurai');
    console.log('   Install and start Memurai service');
    console.log('\n3. Redis Cloud Option:');
    console.log('   Sign up at: https://redis.com/try-free/');
    console.log('   Update REDIS_URL in .env.local with cloud credentials');
    console.log('\n4. Check current .env.local settings:');
    console.log('   REDIS_URL=' + (process.env.REDIS_URL || 'redis://localhost:6379'));
    
    await redis.disconnect();
    return false;
  }
}

// Run the test
testRedisConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });