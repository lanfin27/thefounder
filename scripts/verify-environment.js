// Comprehensive environment verification
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function verifyEnvironment() {
  console.log('🔍 Verifying TheFounder scraping environment...\n');
  
  const checks = [];
  let hasErrors = false;
  
  // 1. Check Node.js version
  console.log('📦 System Information:');
  const nodeVersion = process.version;
  const platform = process.platform;
  console.log(`   Node.js: ${nodeVersion}`);
  console.log(`   Platform: ${platform}`);
  console.log(`   Architecture: ${process.arch}`);
  
  const nodeMajor = parseInt(nodeVersion.split('.')[0].substring(1));
  if (nodeMajor >= 16) {
    checks.push({ name: 'Node.js', status: 'success', version: nodeVersion });
  } else {
    checks.push({ name: 'Node.js', status: 'error', error: `Version ${nodeVersion} too old (need 16+)` });
    hasErrors = true;
  }

  // 2. Check required dependencies
  const requiredDeps = [
    'playwright', 'bull', 'ioredis', 'cheerio', 
    'p-limit', 'winston', 'axios', 'user-agents', 'dotenv'
  ];
  
  console.log('\n📚 Checking dependencies:');
  for (const dep of requiredDeps) {
    try {
      const depPath = require.resolve(dep);
      const packageJson = require(path.join(dep, 'package.json'));
      console.log(`   ✅ ${dep} (v${packageJson.version || 'unknown'})`);
      checks.push({ name: dep, status: 'success', version: packageJson.version });
    } catch (error) {
      console.log(`   ❌ ${dep} - MISSING`);
      checks.push({ name: dep, status: 'error', error: 'Not installed' });
      hasErrors = true;
    }
  }

  // 3. Check environment variables
  console.log('\n🔧 Checking environment variables:');
  const requiredEnvVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', display: 'Supabase URL' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', display: 'Supabase Anon Key' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', display: 'Supabase Service Key' },
    { name: 'REDIS_URL', display: 'Redis URL' },
    { name: 'FLIPPA_BASE_URL', display: 'Flippa Base URL' },
    { name: 'FLIPPA_SCRAPING_ENABLED', display: 'Scraping Enabled' },
    { name: 'ADMIN_TOKEN', display: 'Admin Token' }
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar.name]) {
      const value = envVar.name.includes('KEY') || envVar.name.includes('TOKEN') 
        ? '***' + process.env[envVar.name].slice(-4)
        : process.env[envVar.name];
      console.log(`   ✅ ${envVar.display}: ${value}`);
      checks.push({ name: envVar.display, status: 'success' });
    } else {
      console.log(`   ❌ ${envVar.display} - NOT SET`);
      checks.push({ name: envVar.display, status: 'error', error: 'Not configured' });
      hasErrors = true;
    }
  }

  // 4. Check file structure
  console.log('\n📁 Checking file structure:');
  const requiredFiles = [
    { path: 'src/lib/scraping/config.ts', name: 'Scraping Config' },
    { path: 'src/lib/scraping/flippa/types.ts', name: 'Type Definitions' },
    { path: 'src/lib/scraping/flippa/scraper.ts', name: 'Scraper Class' },
    { path: 'src/lib/scraping/flippa/validator.ts', name: 'Data Validator' },
    { path: 'src/lib/scraping/queue/setup.ts', name: 'Queue Setup' },
    { path: 'src/lib/scraping/utils/logger.ts', name: 'Logger' },
    { path: 'src/lib/scraping/services/supabase.ts', name: 'Database Service' },
    { path: 'supabase/migrations/20250102_flippa_scraping_tables.sql', name: 'Database Migration' }
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file.path)) {
      const stats = fs.statSync(file.path);
      console.log(`   ✅ ${file.name} (${Math.round(stats.size / 1024)}KB)`);
      checks.push({ name: file.name, status: 'success', size: stats.size });
    } else {
      console.log(`   ❌ ${file.name} - MISSING`);
      checks.push({ name: file.name, status: 'error', error: 'File not found' });
      hasErrors = true;
    }
  }

  // 5. Check directories
  console.log('\n📂 Checking directories:');
  const requiredDirs = [
    'src/lib/scraping',
    'src/lib/scraping/flippa',
    'src/lib/scraping/queue',
    'src/lib/scraping/utils',
    'src/app/api/scraping',
    'logs'
  ];

  for (const dir of requiredDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs.readdirSync(dir).length;
      console.log(`   ✅ ${dir} (${files} files)`);
      checks.push({ name: dir, status: 'success', files });
    } else {
      console.log(`   ❌ ${dir} - MISSING`);
      checks.push({ name: dir, status: 'error', error: 'Directory not found' });
      // Create missing directories
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`      📁 Created missing directory`);
      } catch (e) {
        console.log(`      ⚠️ Failed to create directory: ${e.message}`);
      }
    }
  }

  // 6. Test database connection
  console.log('\n🗄️ Testing database connection:');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test with a simple query
    const { data, error } = await supabase
      .from('flippa_categories')
      .select('count')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('   ⚠️ Flippa tables not yet created (run migration)');
      checks.push({ name: 'Database Tables', status: 'warning', error: 'Tables need migration' });
    } else if (error) {
      throw error;
    } else {
      console.log('   ✅ Supabase connection successful');
      checks.push({ name: 'Supabase', status: 'success' });
    }
  } catch (error) {
    console.log(`   ❌ Supabase connection failed: ${error.message}`);
    checks.push({ name: 'Supabase', status: 'error', error: error.message });
    hasErrors = true;
  }

  // 7. Check Playwright browsers
  console.log('\n🌐 Checking Playwright browsers:');
  try {
    const { chromium } = require('playwright');
    const browserPath = chromium.executablePath();
    if (fs.existsSync(browserPath)) {
      console.log(`   ✅ Chromium installed at: ${browserPath}`);
      checks.push({ name: 'Chromium Browser', status: 'success' });
    } else {
      console.log('   ⚠️ Chromium not installed (run: npx playwright install chromium)');
      checks.push({ name: 'Chromium Browser', status: 'warning', error: 'Not installed' });
    }
  } catch (error) {
    console.log('   ❌ Playwright not properly configured');
    checks.push({ name: 'Playwright', status: 'error', error: error.message });
  }

  // 8. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Environment Verification Summary:');
  console.log('='.repeat(60));
  
  const successful = checks.filter(c => c.status === 'success').length;
  const warnings = checks.filter(c => c.status === 'warning').length;
  const failed = checks.filter(c => c.status === 'error').length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0 && warnings === 0) {
    console.log('\n🚀 Environment is fully ready for scraping!');
    console.log('\nNext steps:');
    console.log('1. Start Redis: npm run start:redis');
    console.log('2. Run database migration in Supabase');
    console.log('3. Test scraping: npm run test:scraping');
    return true;
  } else {
    console.log('\n⚠️ Please address the issues above before proceeding.');
    
    if (failed > 0) {
      console.log('\n🔧 Required fixes:');
      checks.filter(c => c.status === 'error').forEach(check => {
        console.log(`   - ${check.name}: ${check.error}`);
      });
    }
    
    if (warnings > 0) {
      console.log('\n💡 Recommended actions:');
      checks.filter(c => c.status === 'warning').forEach(check => {
        console.log(`   - ${check.name}: ${check.error}`);
      });
    }
    
    console.log('\n📚 Setup commands:');
    console.log('   npm install                    # Install dependencies');
    console.log('   npx playwright install chromium # Install browser');
    console.log('   npm run start:redis            # Start Redis server');
    
    return false;
  }
}

// Run verification
verifyEnvironment()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Verification error:', err);
    process.exit(1);
  });