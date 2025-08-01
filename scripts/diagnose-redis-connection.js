// Comprehensive Redis Connection Diagnostic Tool
const Redis = require('ioredis');
const net = require('net');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

class RedisConnectionDiagnostics {
  constructor() {
    this.results = [];
    this.config = {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || '0'
    };
  }

  log(level, message, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    this.results.push(entry);
    
    const icon = level === 'success' ? '✅' : level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '🔍';
    console.log(`${icon} ${message}`);
    if (Object.keys(details).length > 0 && level !== 'success') {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }
  }

  async diagnoseAll() {
    console.log('🔍 Redis Connection Comprehensive Diagnostics');
    console.log('=' .repeat(60));
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log('=' .repeat(60));

    // 1. Environment Analysis
    await this.analyzeEnvironment();
    
    // 2. Network Connectivity
    await this.testNetworkConnectivity();
    
    // 3. DNS Resolution
    await this.testDnsResolution();
    
    // 4. Multiple Connection Methods
    await this.testMultipleConnectionMethods();
    
    // 5. Generate Report and Solutions
    this.generateReport();
  }

  async analyzeEnvironment() {
    console.log('\n1️⃣ ENVIRONMENT ANALYSIS');
    console.log('-'.repeat(40));

    // Check .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      // Check for BOM
      if (envContent.charCodeAt(0) === 0xFEFF) {
        this.log('warning', 'BOM detected in .env.local file', { 
          fix: 'Remove BOM from file' 
        });
      }

      // Check Redis variables
      const redisVars = {
        REDIS_URL: process.env.REDIS_URL,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD
      };

      console.log('\n📋 Current Redis Configuration:');
      console.log(`   URL: ${redisVars.REDIS_URL ? redisVars.REDIS_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET'}`);
      console.log(`   Host: ${redisVars.REDIS_HOST || 'NOT SET'}`);
      console.log(`   Port: ${redisVars.REDIS_PORT || 'NOT SET'}`);
      console.log(`   Password: ${redisVars.REDIS_PASSWORD ? '***' + redisVars.REDIS_PASSWORD.slice(-4) : 'NOT SET'}`);

      // Validate URL format
      if (redisVars.REDIS_URL) {
        try {
          const url = new URL(redisVars.REDIS_URL);
          this.log('success', 'Redis URL format is valid');
          
          // Check for common issues
          if (url.protocol !== 'redis:') {
            this.log('warning', 'URL protocol is not redis:', { 
              current: url.protocol,
              expected: 'redis:' 
            });
          }
          
          if (!url.username || url.username !== 'default') {
            this.log('warning', 'Username might be missing or incorrect', {
              current: url.username || 'none',
              expected: 'default'
            });
          }
        } catch (error) {
          this.log('error', 'Invalid Redis URL format', { error: error.message });
        }
      } else {
        this.log('error', 'REDIS_URL not found in environment');
      }

      // Check for whitespace issues
      Object.entries(redisVars).forEach(([key, value]) => {
        if (value && value !== value.trim()) {
          this.log('warning', `${key} contains extra whitespace`, {
            original: `"${value}"`,
            trimmed: `"${value.trim()}"`
          });
        }
      });

      // Check for encoding issues
      const hasNonAscii = Object.values(redisVars).some(v => 
        v && !/^[\x00-\x7F]*$/.test(v)
      );
      
      if (hasNonAscii) {
        this.log('warning', 'Non-ASCII characters detected in Redis configuration');
      }

    } catch (error) {
      this.log('error', 'Failed to read .env.local', { error: error.message });
    }
  }

  async testNetworkConnectivity() {
    console.log('\n2️⃣ NETWORK CONNECTIVITY TEST');
    console.log('-'.repeat(40));

    const host = this.config.host;
    const port = parseInt(this.config.port);

    if (!host || !port) {
      this.log('error', 'Host or port not configured');
      return;
    }

    // Test raw TCP connection
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let connected = false;

      socket.setTimeout(5000);

      socket.on('connect', () => {
        connected = true;
        this.log('success', `TCP connection successful to ${host}:${port}`);
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        this.log('error', 'TCP connection timeout', { 
          host, 
          port,
          timeout: '5000ms' 
        });
        socket.destroy();
        resolve();
      });

      socket.on('error', (error) => {
        if (!connected) {
          this.log('error', 'TCP connection failed', { 
            host, 
            port,
            error: error.message,
            code: error.code
          });
        }
        resolve();
      });

      console.log(`   Attempting TCP connection to ${host}:${port}...`);
      socket.connect(port, host);
    });
  }

  async testDnsResolution() {
    console.log('\n3️⃣ DNS RESOLUTION TEST');
    console.log('-'.repeat(40));

    const host = this.config.host;
    if (!host) {
      this.log('error', 'No host configured for DNS test');
      return;
    }

    try {
      console.log(`   Resolving ${host}...`);
      const addresses = await dns.resolve4(host);
      this.log('success', `DNS resolution successful`, { 
        host,
        addresses 
      });
    } catch (error) {
      this.log('error', 'DNS resolution failed', { 
        host,
        error: error.message 
      });
    }
  }

  async testMultipleConnectionMethods() {
    console.log('\n4️⃣ MULTIPLE CONNECTION METHODS TEST');
    console.log('-'.repeat(40));

    const methods = [
      {
        name: 'Standard URL Connection',
        config: this.config.url
      },
      {
        name: 'URL with explicit options',
        config: {
          host: this.config.host,
          port: parseInt(this.config.port),
          password: this.config.password,
          username: 'default',
          db: parseInt(this.config.db),
          retryStrategy: false,
          enableOfflineQueue: false,
          lazyConnect: true
        }
      },
      {
        name: 'URL with minimal retry',
        config: this.config.url,
        options: {
          retryStrategy: (times) => {
            if (times > 1) return null;
            return 100;
          },
          connectTimeout: 10000,
          enableOfflineQueue: false,
          lazyConnect: true
        }
      },
      {
        name: 'Direct connection with TLS',
        config: {
          host: this.config.host,
          port: parseInt(this.config.port),
          password: this.config.password,
          username: 'default',
          tls: {},
          connectTimeout: 10000,
          enableOfflineQueue: false
        }
      },
      {
        name: 'Connection with family 4',
        config: {
          host: this.config.host,
          port: parseInt(this.config.port),
          password: this.config.password,
          username: 'default',
          family: 4,
          connectTimeout: 10000,
          enableOfflineQueue: false
        }
      }
    ];

    for (const method of methods) {
      console.log(`\n   Testing: ${method.name}`);
      await this.testSingleConnection(method);
    }
  }

  async testSingleConnection({ name, config, options = {} }) {
    let redis = null;
    
    try {
      // Merge options if config is a string
      const connectionConfig = typeof config === 'string' 
        ? config 
        : { ...config, ...options };
      
      const finalOptions = typeof config === 'string'
        ? options
        : {};

      redis = new Redis(connectionConfig, finalOptions);

      // Add connection event listeners
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout after 10s'));
        }, 10000);

        redis.once('connect', () => {
          clearTimeout(timeout);
          console.log('     🔗 Connected');
        });

        redis.once('ready', async () => {
          clearTimeout(timeout);
          console.log('     ✅ Ready');
          
          try {
            const pong = await redis.ping();
            this.log('success', `${name}: Connection successful`, { 
              response: pong,
              config: typeof config === 'string' ? 'URL' : 'Object'
            });
            resolve(true);
          } catch (pingError) {
            reject(pingError);
          }
        });

        redis.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      if (redis.options.lazyConnect) {
        await redis.connect();
      }

      await connectionPromise;

    } catch (error) {
      this.log('error', `${name}: Connection failed`, { 
        error: error.message,
        code: error.code,
        syscall: error.syscall
      });
    } finally {
      if (redis) {
        try {
          await redis.quit();
        } catch (e) {
          // Ignore quit errors
        }
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC REPORT');
    console.log('='.repeat(60));

    const successes = this.results.filter(r => r.level === 'success');
    const errors = this.results.filter(r => r.level === 'error');
    const warnings = this.results.filter(r => r.level === 'warning');

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Successes: ${successes.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n🔧 RECOMMENDED SOLUTIONS:');
      
      const hasConnectionError = errors.some(e => 
        e.message.includes('Connection failed') || 
        e.message.includes('TCP connection')
      );

      if (hasConnectionError) {
        console.log('\n1. Connection Issues:');
        console.log('   - Verify Redis Cloud database is active');
        console.log('   - Check firewall/antivirus settings');
        console.log('   - Try using a VPN if in restricted network');
        console.log('   - Test with mobile hotspot to rule out network issues');
      }

      const hasAuthError = errors.some(e => 
        e.details.error && (
          e.details.error.includes('WRONGPASS') || 
          e.details.error.includes('NOAUTH')
        )
      );

      if (hasAuthError) {
        console.log('\n2. Authentication Issues:');
        console.log('   - Verify password in Redis Cloud dashboard');
        console.log('   - Ensure URL includes "default:" username');
        console.log('   - Check for special characters in password');
      }

      // Generate corrected .env.local
      console.log('\n3. Corrected Configuration:');
      console.log('   Add these to your .env.local:');
      console.log('   ```');
      console.log(`   REDIS_URL=redis://default:${this.config.password}@${this.config.host}:${this.config.port}`);
      console.log(`   REDIS_HOST=${this.config.host}`);
      console.log(`   REDIS_PORT=${this.config.port}`);
      console.log(`   REDIS_PASSWORD=${this.config.password}`);
      console.log(`   REDIS_DB=0`);
      console.log('   ```');
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'redis-diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run diagnostics
async function main() {
  const diagnostics = new RedisConnectionDiagnostics();
  
  try {
    await diagnostics.diagnoseAll();
  } catch (error) {
    console.error('\n💥 Diagnostic tool error:', error);
  }
  
  console.log('\n🏁 Diagnostics complete');
}

main().catch(console.error);