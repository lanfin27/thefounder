// Test multiple Redis connection methods to find the working one
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

console.log('🔍 Testing Multiple Redis Connection Methods');
console.log('=' .repeat(50));
console.log(`URL: ${REDIS_URL}`);
console.log(`Host: ${REDIS_HOST}`);
console.log(`Port: ${REDIS_PORT}`);
console.log('=' .repeat(50));

async function testConnection(name, createRedis) {
  console.log(`\n📝 Testing ${name}...`);
  
  let redis = null;
  try {
    redis = await createRedis();
    
    // Wait for ready event
    if (redis.status !== 'ready') {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        redis.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        redis.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
    
    // Test ping
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;
    
    if (pong === 'PONG') {
      console.log(`✅ SUCCESS: ${name} (${latency}ms)`);
      
      // Test basic operations
      await redis.set('test:method', name, 'EX', 10);
      const value = await redis.get('test:method');
      await redis.del('test:method');
      
      console.log(`   - Read/Write: ✅`);
      console.log(`   - Latency: ${latency}ms`);
      
      await redis.quit();
      return { success: true, method: name, latency };
    }
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    if (redis) {
      try { await redis.quit(); } catch (e) {}
    }
    return { success: false, method: name, error: error.message };
  }
}

async function runAllTests() {
  const methods = [
    // Method 1: Minimal URL Connection
    {
      name: 'Method 1: Minimal URL',
      create: async () => new Redis(REDIS_URL)
    },
    
    // Method 2: Explicit Configuration
    {
      name: 'Method 2: Explicit Config',
      create: async () => new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        username: 'default',
        password: REDIS_PASSWORD,
        connectTimeout: 10000,
        lazyConnect: true
      })
    },
    
    // Method 3: Redis Cloud Optimized
    {
      name: 'Method 3: Cloud Optimized',
      create: async () => new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableOfflineQueue: true,  // Changed to true
        connectTimeout: 10000
      })
    },
    
    // Method 4: No Options URL
    {
      name: 'Method 4: Pure URL (no options)',
      create: async () => {
        const redis = new Redis(REDIS_URL);
        return redis;
      }
    },
    
    // Method 5: Manual Connect
    {
      name: 'Method 5: Manual Connect',
      create: async () => {
        const redis = new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
          username: 'default',
          lazyConnect: true,
          enableReadyCheck: true,
          connectTimeout: 10000
        });
        await redis.connect();
        return redis;
      }
    },
    
    // Method 6: Family 4 (IPv4 only)
    {
      name: 'Method 6: IPv4 Only',
      create: async () => new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        username: 'default',
        family: 4,
        connectTimeout: 10000
      })
    },
    
    // Method 7: Sentinel-like config
    {
      name: 'Method 7: Compatibility Mode',
      create: async () => new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        db: 0,
        connectTimeout: 10000,
        commandTimeout: 5000,
        keepAlive: 10000
      })
    },
    
    // Method 8: URL with minimal retry
    {
      name: 'Method 8: Minimal Retry',
      create: async () => new Redis(REDIS_URL, {
        retryStrategy: () => 1000,
        maxRetriesPerRequest: 1
      })
    }
  ];
  
  const results = [];
  let workingMethod = null;
  
  for (const method of methods) {
    const result = await testConnection(method.name, method.create);
    results.push(result);
    if (result.success && !workingMethod) {
      workingMethod = method;
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}`);
  successful.forEach(r => console.log(`   - ${r.method} (${r.latency}ms)`));
  
  console.log(`\n❌ Failed: ${failed.length}`);
  failed.forEach(r => console.log(`   - ${r.method}: ${r.error}`));
  
  if (workingMethod) {
    console.log('\n🎉 RECOMMENDED METHOD:');
    console.log(`   ${workingMethod.name}`);
    console.log('\n📝 Implementation:');
    console.log('```javascript');
    console.log(workingMethod.create.toString());
    console.log('```');
    
    // Save working method
    const fs = require('fs');
    const workingConfig = `// Working Redis Configuration
// Generated: ${new Date().toISOString()}
// Method: ${workingMethod.name}

const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

function createRedisClient() {
  ${workingMethod.create.toString()}
}

module.exports = { createRedisClient };
`;
    
    fs.writeFileSync('scripts/redis-working-config.js', workingConfig);
    console.log('\n✅ Working configuration saved to: scripts/redis-working-config.js');
  } else {
    console.log('\n❌ No working method found!');
  }
}

// Run tests
runAllTests().catch(console.error);