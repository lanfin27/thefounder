// Fixed Redis connection test using the new connection handler
const { redisConnection } = require('../src/lib/redis/connection');

async function testRedisFixed() {
  console.log('🔄 Testing Redis connection with fixed handler...\n');
  
  try {
    // 1. Connect to Redis
    console.log('1️⃣ Connecting to Redis Cloud...');
    const client = await redisConnection.connect();
    console.log('✅ Connected successfully!');

    // 2. Basic operations test
    console.log('\n2️⃣ Testing basic operations...');
    
    // Set/Get test
    const testKey = 'thefounder:test:' + Date.now();
    const testValue = 'Hello from TheFounder!';
    
    await client.set(testKey, testValue, 'EX', 60);
    const retrieved = await client.get(testKey);
    
    if (retrieved === testValue) {
      console.log('✅ Set/Get operations working');
    } else {
      throw new Error('Set/Get test failed');
    }

    // Delete test
    await client.del(testKey);
    console.log('✅ Delete operation working');

    // 3. Queue operations test
    console.log('\n3️⃣ Testing queue operations...');
    const queueKey = 'thefounder:queue:test';
    const jobData = { id: Date.now(), task: 'test_job' };
    
    await client.lpush(queueKey, JSON.stringify(jobData));
    const job = await client.rpop(queueKey);
    const parsed = JSON.parse(job);
    
    if (parsed.task === 'test_job') {
      console.log('✅ Queue operations working');
    } else {
      throw new Error('Queue test failed');
    }

    // 4. Hash operations test (for Bull)
    console.log('\n4️⃣ Testing hash operations...');
    const hashKey = 'thefounder:job:' + Date.now();
    await client.hset(hashKey, {
      status: 'pending',
      progress: 0,
      data: JSON.stringify({ test: true })
    });
    
    const status = await client.hget(hashKey, 'status');
    await client.del(hashKey);
    
    if (status === 'pending') {
      console.log('✅ Hash operations working');
    } else {
      throw new Error('Hash test failed');
    }

    // 5. Connection stability test
    console.log('\n5️⃣ Testing connection stability...');
    const isConnected = await redisConnection.isConnected();
    console.log(`✅ Connection stable: ${isConnected}`);

    // 6. Get server info
    console.log('\n6️⃣ Getting server info...');
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`✅ Redis version: ${versionMatch[1]}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All Redis tests passed!');
    console.log('🚀 Redis is ready for TheFounder scraping system!');
    console.log('='.repeat(50));

    // Disconnect
    await redisConnection.disconnect();
    
    return true;

  } catch (error) {
    console.error('\n❌ Redis test failed:', error.message);
    console.error('Stack:', error.stack);
    
    await redisConnection.disconnect();
    return false;
  }
}

// Run the test
testRedisFixed()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });