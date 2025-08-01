// Comprehensive Flippa scraping system test
require('dotenv').config({ path: '.env.local' });
const { redisConnection } = require('../src/lib/redis/connection');
const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');

async function testFlippaSystem() {
  console.log('🎯 TheFounder Flippa Scraping System - Comprehensive Test');
  console.log('=' .repeat(60));
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(60));
  
  const results = {
    redis: false,
    queue: false,
    supabase: false,
    environment: false,
    overall: false
  };
  
  try {
    // 1. Test Environment Variables
    console.log('\n1️⃣ ENVIRONMENT CONFIGURATION');
    console.log('-'.repeat(40));
    
    const requiredEnvVars = [
      'REDIS_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'FLIPPA_BASE_URL',
      'SCRAPING_ENABLED'
    ];
    
    let envValid = true;
    for (const varName of requiredEnvVars) {
      const value = process.env[varName];
      if (value) {
        console.log(`   ✅ ${varName}: ${varName.includes('KEY') || varName.includes('PASSWORD') ? '***' : value}`);
      } else {
        console.log(`   ❌ ${varName}: NOT SET`);
        envValid = false;
      }
    }
    
    results.environment = envValid;
    
    // 2. Test Redis Connection
    console.log('\n2️⃣ REDIS CONNECTION');
    console.log('-'.repeat(40));
    
    try {
      const redis = await redisConnection.connect();
      const pong = await redis.ping();
      console.log('   ✅ Redis connected successfully');
      console.log(`   📍 Host: ${process.env.REDIS_HOST}`);
      console.log(`   🔗 Port: ${process.env.REDIS_PORT}`);
      results.redis = true;
    } catch (error) {
      console.log('   ❌ Redis connection failed:', error.message);
    }
    
    // 3. Test Queue System
    console.log('\n3️⃣ BULL QUEUE SYSTEM');
    console.log('-'.repeat(40));
    
    if (results.redis) {
      try {
        const testQueue = new Bull('flippa-test', process.env.REDIS_URL);
        
        // Add a test job
        const job = await testQueue.add({
          type: 'system-test',
          timestamp: new Date().toISOString()
        });
        
        console.log(`   ✅ Queue operational (test job ${job.id} created)`);
        
        // Clean up
        await testQueue.empty();
        await testQueue.close();
        
        results.queue = true;
      } catch (error) {
        console.log('   ❌ Queue system failed:', error.message);
      }
    } else {
      console.log('   ⏭️  Skipped (Redis not available)');
    }
    
    // 4. Test Supabase Connection
    console.log('\n4️⃣ SUPABASE DATABASE');
    console.log('-'.repeat(40));
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test query
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      console.log('   ✅ Supabase connected successfully');
      console.log(`   📍 URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
      results.supabase = true;
    } catch (error) {
      console.log('   ❌ Supabase connection failed:', error.message);
    }
    
    // 5. Test Scraping Configuration
    console.log('\n5️⃣ SCRAPING CONFIGURATION');
    console.log('-'.repeat(40));
    
    const scrapingConfig = {
      enabled: process.env.SCRAPING_ENABLED === 'true',
      headless: process.env.SCRAPING_HEADLESS === 'true',
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '3'),
      requestsPerMinute: parseInt(process.env.REQUESTS_PER_MINUTE || '20'),
      flippaEnabled: process.env.FLIPPA_SCRAPING_ENABLED === 'true'
    };
    
    console.log('   📋 Current Settings:');
    console.log(`      - Scraping Enabled: ${scrapingConfig.enabled ? '✅' : '❌'}`);
    console.log(`      - Headless Mode: ${scrapingConfig.headless ? '✅' : '❌'}`);
    console.log(`      - Max Concurrent: ${scrapingConfig.maxConcurrent}`);
    console.log(`      - Requests/Minute: ${scrapingConfig.requestsPerMinute}`);
    console.log(`      - Flippa Enabled: ${scrapingConfig.flippaEnabled ? '✅' : '❌'}`);
    
    // 6. System Readiness Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM READINESS SUMMARY');
    console.log('='.repeat(60));
    
    const allPassed = Object.values(results).filter(v => v === true).length >= 3; // At least 3 components working
    results.overall = allPassed;
    
    console.log(`\n   Environment Variables: ${results.environment ? '✅ READY' : '❌ MISSING'}`);
    console.log(`   Redis Connection: ${results.redis ? '✅ READY' : '❌ FAILED'}`);
    console.log(`   Queue System: ${results.queue ? '✅ READY' : '❌ FAILED'}`);
    console.log(`   Supabase Database: ${results.supabase ? '✅ READY' : '❌ FAILED'}`);
    
    if (allPassed) {
      console.log('\n🎉 SYSTEM STATUS: READY FOR SCRAPING!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Run database migration: npm run migrate');
      console.log('   2. Start the worker: npm run worker');
      console.log('   3. Test scraping: npm run scrape:test');
      console.log('   4. Monitor via API: GET /api/scraping/status');
    } else {
      console.log('\n⚠️  SYSTEM STATUS: NOT READY');
      console.log('\n🔧 Fix the failed components above before proceeding.');
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Cleanup
    await redisConnection.disconnect();
    
    return results.overall;
    
  } catch (error) {
    console.error('\n💥 System test error:', error);
    await redisConnection.disconnect();
    return false;
  }
}

// Run the test
testFlippaSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });