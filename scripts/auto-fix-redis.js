// Auto-fix Redis connection issue by trying multiple approaches
const Redis = require('ioredis');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config({ path: '.env.local' });

class RedisAutoFixer {
  constructor() {
    this.workingSolution = null;
    this.attempts = [];
  }

  async tryAllSolutions() {
    console.log('🔧 Redis Connection Auto-Fixer');
    console.log('=' .repeat(50));
    console.log('Attempting to find a working Redis connection method...\n');

    const solutions = [
      // Solution 1: Direct URL without any options
      {
        name: 'Minimal URL connection',
        create: () => new Redis(process.env.REDIS_URL)
      },
      
      // Solution 2: Parse URL and connect with explicit params
      {
        name: 'Parsed URL with explicit params',
        create: () => {
          const url = new URL(process.env.REDIS_URL);
          return new Redis({
            host: url.hostname,
            port: parseInt(url.port),
            password: url.password,
            username: url.username || 'default'
          });
        }
      },
      
      // Solution 3: With specific Redis Cloud settings
      {
        name: 'Redis Cloud optimized',
        create: () => new Redis(process.env.REDIS_URL, {
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          family: 4,
          showFriendlyErrorStack: true
        })
      },
      
      // Solution 4: With connection name
      {
        name: 'With connection name',
        create: () => new Redis(process.env.REDIS_URL, {
          connectionName: 'thefounder',
          enableAutoPipelining: true
        })
      },
      
      // Solution 5: Force string parser
      {
        name: 'String parser mode',
        create: () => new Redis(process.env.REDIS_URL, {
          stringNumbers: true,
          dropBufferSupport: true
        })
      },
      
      // Solution 6: Custom reconnect strategy
      {
        name: 'Custom reconnect strategy',
        create: () => new Redis(process.env.REDIS_URL, {
          reconnectOnError: () => 1,
          retryStrategy: () => 1000
        })
      }
    ];

    // Try each solution
    for (const solution of solutions) {
      const result = await this.testSolution(solution);
      if (result.success) {
        this.workingSolution = solution;
        break;
      }
    }

    // Report results
    this.reportResults();
    
    // If we found a working solution, update the connection files
    if (this.workingSolution) {
      await this.applyWorkingSolution();
    }
  }

  async testSolution(solution) {
    console.log(`\n🔄 Testing: ${solution.name}`);
    
    let client = null;
    const attempt = {
      name: solution.name,
      success: false,
      error: null,
      responseTime: null
    };

    try {
      const startTime = Date.now();
      client = solution.create();

      // Wait for connection with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout (5s)'));
        }, 5000);

        client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Test ping
      const pingStart = Date.now();
      const pong = await client.ping();
      const pingTime = Date.now() - pingStart;

      if (pong === 'PONG') {
        attempt.success = true;
        attempt.responseTime = pingTime;
        console.log(`   ✅ SUCCESS! Ping response in ${pingTime}ms`);
        
        // Additional validation
        await client.set('test_key', 'test_value', 'EX', 10);
        const value = await client.get('test_key');
        await client.del('test_key');
        
        if (value === 'test_value') {
          console.log(`   ✅ Read/write operations confirmed`);
        }
      }

    } catch (error) {
      attempt.error = error.message;
      console.log(`   ❌ FAILED: ${error.message}`);
    } finally {
      if (client) {
        try {
          client.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    }

    this.attempts.push(attempt);
    return attempt;
  }

  reportResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTS SUMMARY');
    console.log('='.repeat(50));

    const successful = this.attempts.filter(a => a.success);
    const failed = this.attempts.filter(a => !a.success);

    console.log(`\n✅ Successful methods: ${successful.length}`);
    successful.forEach(s => {
      console.log(`   - ${s.name} (${s.responseTime}ms)`);
    });

    console.log(`\n❌ Failed methods: ${failed.length}`);
    failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });

    if (this.workingSolution) {
      console.log(`\n🎉 WORKING SOLUTION FOUND: ${this.workingSolution.name}`);
    } else {
      console.log('\n😞 No working solution found');
      this.suggestAlternatives();
    }
  }

  async applyWorkingSolution() {
    console.log('\n📝 Applying working solution...');
    
    // Generate updated connection code
    const connectionCode = `// Auto-generated Redis connection based on working solution
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

// Working solution: ${this.workingSolution.name}
function createRedisClient() {
  ${this.workingSolution.create.toString()}
}

const redis = createRedisClient();

redis.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redis.on('connect', () => {
  console.log('Redis Client Connected');
});

module.exports = redis;
`;

    // Save to a new file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'src/lib/redis/working-connection.js');
    
    fs.writeFileSync(filePath, connectionCode);
    console.log(`✅ Working connection saved to: ${filePath}`);
    
    // Update package.json script
    console.log('\n💡 Update your test script to use:');
    console.log('   const redis = require("./src/lib/redis/working-connection");');
  }

  suggestAlternatives() {
    console.log('\n🔧 TROUBLESHOOTING SUGGESTIONS:');
    console.log('\n1. Check Windows Firewall:');
    console.log('   - Add Node.js to firewall exceptions');
    console.log('   - Temporarily disable firewall to test');
    
    console.log('\n2. Try WSL2:');
    console.log('   - Install WSL2: wsl --install');
    console.log('   - Run from WSL: cd /mnt/c/Users/KIMJAEHEON/the-founder && npm run test:redis');
    
    console.log('\n3. Use Redis Cloud Web CLI:');
    console.log('   - Go to Redis Cloud dashboard');
    console.log('   - Click "Connect" -> "Redis Insight"');
    console.log('   - Verify database is accessible');
    
    console.log('\n4. Alternative: Local Redis with Docker:');
    console.log('   - Install Docker Desktop');
    console.log('   - Run: docker run -d -p 6379:6379 redis:alpine');
    console.log('   - Update REDIS_URL=redis://localhost:6379');
  }

  async checkSystemIssues() {
    console.log('\n🔍 Checking system issues...');
    
    // Check if Node.js can make outbound connections
    try {
      const https = require('https');
      await new Promise((resolve, reject) => {
        https.get('https://www.google.com', (res) => {
          resolve();
        }).on('error', reject);
      });
      console.log('   ✅ Outbound HTTPS connections working');
    } catch (error) {
      console.log('   ❌ Outbound connections blocked');
    }

    // Check if redis-cli is available
    try {
      await execAsync('redis-cli --version');
      console.log('   ✅ redis-cli is available');
      
      // Try CLI connection
      const cliCommand = `redis-cli -u "${process.env.REDIS_URL}" ping`;
      const { stdout } = await execAsync(cliCommand);
      if (stdout.trim() === 'PONG') {
        console.log('   ✅ redis-cli connection works!');
        console.log('   ⚠️  This confirms the issue is with Node.js/ioredis');
      }
    } catch (error) {
      console.log('   ℹ️  redis-cli not available for testing');
    }
  }
}

// Run the auto-fixer
async function main() {
  const fixer = new RedisAutoFixer();
  
  try {
    await fixer.checkSystemIssues();
    await fixer.tryAllSolutions();
  } catch (error) {
    console.error('\n💥 Auto-fixer error:', error);
  }
}

main().catch(console.error);