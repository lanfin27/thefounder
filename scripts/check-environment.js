const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function verifyEnvironment() {
  console.log('🔍 Environment Verification');
  console.log('==========================\n');
  
  const results = {
    environment: {},
    ports: {},
    database: {},
    files: {},
    api: {}
  };
  
  // 1. Check Node environment
  console.log('1️⃣ Node Environment:');
  results.environment.NODE_ENV = process.env.NODE_ENV || 'development';
  results.environment.nodeVersion = process.version;
  results.environment.platform = process.platform;
  results.environment.cwd = process.cwd();
  
  console.log(`   NODE_ENV: ${results.environment.NODE_ENV}`);
  console.log(`   Node Version: ${results.environment.nodeVersion}`);
  console.log(`   Platform: ${results.environment.platform}`);
  console.log(`   Working Directory: ${results.environment.cwd}`);
  
  // 2. Check environment variables
  console.log('\n2️⃣ Environment Variables:');
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    MONITORING_MODE: process.env.MONITORING_MODE || 'not set',
    FLARESOLVERR_URL: !!process.env.FLARESOLVERR_URL
  };
  
  results.environment.envVars = envVars;
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`   ${key}: ${value === true ? '✅ Set' : value === false ? '❌ Missing' : value}`);
  });
  
  // 3. Check which ports are being used
  console.log('\n3️⃣ Server Ports:');
  const ports = [3000, 3001];
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      results.ports[port] = response.ok ? 'active' : 'responding';
      console.log(`   Port ${port}: ✅ Active`);
    } catch (error) {
      results.ports[port] = 'inactive';
      console.log(`   Port ${port}: ❌ Inactive`);
    }
  }
  
  // Determine active port
  results.environment.activePort = Object.entries(results.ports)
    .find(([port, status]) => status === 'active')?.[0] || 'unknown';
  
  // 4. Test database connections
  console.log('\n4️⃣ Database Connections:');
  
  // Test with service role key
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { count, error } = await serviceClient
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true });
      
      results.database.serviceRole = {
        connected: !error,
        count: count || 0,
        error: error?.message
      };
      
      console.log(`   Service Role: ${!error ? `✅ Connected (${count} records)` : `❌ Error: ${error.message}`}`);
    } catch (err) {
      results.database.serviceRole = {
        connected: false,
        error: err.message
      };
      console.log(`   Service Role: ❌ Error: ${err.message}`);
    }
  }
  
  // Test with anon key
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      const { count, error } = await anonClient
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true });
      
      results.database.anonKey = {
        connected: !error,
        count: count || 0,
        error: error?.message
      };
      
      console.log(`   Anon Key: ${!error ? `✅ Connected (${count} records)` : `❌ Error: ${error.message}`}`);
    } catch (err) {
      results.database.anonKey = {
        connected: false,
        error: err.message
      };
      console.log(`   Anon Key: ❌ Error: ${err.message}`);
    }
  }
  
  // 5. Check critical files
  console.log('\n5️⃣ Critical Files:');
  const criticalFiles = [
    '.env.local',
    'package.json',
    'next.config.js',
    'tsconfig.json',
    '.next/BUILD_ID',
    'data/flippa_baseline.db'
  ];
  
  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(filePath);
    results.files[file] = exists;
    console.log(`   ${file}: ${exists ? '✅ Exists' : '❌ Missing'}`);
  });
  
  // 6. Test key API endpoints
  console.log('\n6️⃣ API Endpoints:');
  const activePort = results.environment.activePort;
  if (activePort !== 'unknown') {
    const endpoints = [
      '/api/monitoring/status',
      '/api/scraping/listings-count-v2',
      '/api/dashboard/stats'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:${activePort}${endpoint}`);
        const contentType = response.headers.get('content-type');
        results.api[endpoint] = {
          status: response.status,
          ok: response.ok,
          isJson: contentType?.includes('application/json')
        };
        console.log(`   ${endpoint}: ${response.ok ? '✅' : '❌'} ${response.status}`);
      } catch (error) {
        results.api[endpoint] = {
          status: 'error',
          ok: false,
          error: error.message
        };
        console.log(`   ${endpoint}: ❌ Error`);
      }
    }
  }
  
  // 7. Generate recommendations
  console.log('\n7️⃣ Recommendations:');
  const recommendations = [];
  
  if (!envVars.SUPABASE_SERVICE_ROLE_KEY) {
    recommendations.push('Set SUPABASE_SERVICE_ROLE_KEY for full database access');
  }
  
  if (results.database.serviceRole?.count === 0 && results.database.anonKey?.count > 0) {
    recommendations.push('Service role key might be incorrect - it shows 0 records while anon key shows records');
  }
  
  if (results.database.anonKey?.count === 0 && results.database.serviceRole?.count > 0) {
    recommendations.push('RLS policies might be blocking anonymous access');
  }
  
  if (!results.files['.next/BUILD_ID']) {
    recommendations.push('Run "npm run build" to create production build');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Environment looks good! 🎉');
  }
  
  recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
  
  // Save report
  const reportPath = path.join(__dirname, '..', 'logs', 'environment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return results;
}

// Run verification
verifyEnvironment().catch(console.error);