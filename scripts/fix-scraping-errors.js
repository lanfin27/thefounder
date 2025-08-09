const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

console.log('🚨 Emergency Fix Script for The Founder');
console.log('======================================\n');

const fixes = {
  build: { status: 'pending', message: '' },
  cache: { status: 'pending', message: '' },
  api: { status: 'pending', message: '' },
  database: { status: 'pending', message: '' },
  server: { status: 'pending', message: '' }
};

// Fix 1: Clean and rebuild Next.js
async function fixBuild() {
  console.log('1️⃣ Fixing Next.js build...');
  
  try {
    // Clean .next directory
    const nextDir = path.join(__dirname, '..', '.next');
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log('   ✅ Cleaned .next directory');
    }
    
    // Clean node_modules cache
    const cacheDir = path.join(__dirname, '..', 'node_modules', '.cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('   ✅ Cleaned node_modules cache');
    }
    
    // Create empty .next directory
    fs.mkdirSync(nextDir, { recursive: true });
    
    fixes.build.status = 'success';
    fixes.build.message = 'Build directories cleaned';
    console.log('   ✅ Build fix complete\n');
  } catch (error) {
    fixes.build.status = 'failed';
    fixes.build.message = error.message;
    console.log(`   ❌ Build fix failed: ${error.message}\n`);
  }
}

// Fix 2: Clear all caches
async function fixCache() {
  console.log('2️⃣ Fixing cache issues...');
  
  try {
    const cacheDirs = [
      path.join(__dirname, '..', '.next', 'cache'),
      path.join(__dirname, '..', 'node_modules', '.cache'),
      path.join(__dirname, '..', '.turbo'),
      path.join(__dirname, '..', '.swc')
    ];
    
    let cleaned = 0;
    cacheDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        cleaned++;
      }
    });
    
    fixes.cache.status = 'success';
    fixes.cache.message = `Cleaned ${cleaned} cache directories`;
    console.log(`   ✅ Cleaned ${cleaned} cache directories\n`);
  } catch (error) {
    fixes.cache.status = 'failed';
    fixes.cache.message = error.message;
    console.log(`   ❌ Cache fix failed: ${error.message}\n`);
  }
}

// Fix 3: Create missing API routes
async function fixAPIs() {
  console.log('3️⃣ Fixing API routes...');
  
  try {
    // Create a generic error handler for missing routes
    const errorHandler = `import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is not implemented yet',
    timestamp: new Date().toISOString()
  }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is not implemented yet',
    timestamp: new Date().toISOString()
  }, { status: 501 })
}`;

    // List of potentially missing routes
    const missingRoutes = [
      'src/app/api/monitoring/cron/route.ts',
      'src/app/api/listings/recent/route.ts'
    ];
    
    let created = 0;
    missingRoutes.forEach(route => {
      const fullPath = path.join(__dirname, '..', route);
      if (!fs.existsSync(fullPath)) {
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, errorHandler);
        created++;
      }
    });
    
    fixes.api.status = 'success';
    fixes.api.message = `Created ${created} missing API routes`;
    console.log(`   ✅ Created ${created} missing API routes\n`);
  } catch (error) {
    fixes.api.status = 'failed';
    fixes.api.message = error.message;
    console.log(`   ❌ API fix failed: ${error.message}\n`);
  }
}

// Fix 4: Test database connection
async function fixDatabase() {
  console.log('4️⃣ Testing database connection...');
  
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
    
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasUrl || !hasAnon) {
      throw new Error('Missing Supabase configuration');
    }
    
    // Test connection
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { count, error } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    fixes.database.status = 'success';
    fixes.database.message = `Connected successfully (${count} records)`;
    console.log(`   ✅ Database connected (${count} records)\n`);
  } catch (error) {
    fixes.database.status = 'failed';
    fixes.database.message = error.message;
    console.log(`   ❌ Database fix failed: ${error.message}\n`);
  }
}

// Fix 5: Restart server
async function fixServer() {
  console.log('5️⃣ Checking server status...');
  
  try {
    // Check if server is running
    let serverRunning = false;
    try {
      const response = await fetch('http://localhost:3000/api/health');
      serverRunning = true;
    } catch (e) {
      try {
        const response = await fetch('http://localhost:3001/api/health');
        serverRunning = true;
      } catch (e2) {
        serverRunning = false;
      }
    }
    
    if (serverRunning) {
      fixes.server.status = 'success';
      fixes.server.message = 'Server is running';
      console.log('   ✅ Server is already running\n');
    } else {
      console.log('   ⚠️  Server not running. Start with: npm run dev\n');
      fixes.server.status = 'warning';
      fixes.server.message = 'Server needs to be started manually';
    }
  } catch (error) {
    fixes.server.status = 'failed';
    fixes.server.message = error.message;
    console.log(`   ❌ Server check failed: ${error.message}\n`);
  }
}

// Create recovery instructions
function createRecoveryInstructions() {
  const instructions = `
# Recovery Instructions

After running the emergency fix script, follow these steps:

1. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Test the dashboard:**
   - Open http://localhost:3000/admin (or port 3001)
   - Check if Total Listings shows 5,636
   - Try the "Start Incremental Scraping" button

3. **If issues persist:**
   - Run: \`npm run build\` to create production build
   - Check logs in the \`logs/\` directory
   - Run: \`node scripts/test-all-apis.js\` to test all endpoints

4. **For database issues:**
   - Verify .env.local has correct Supabase keys
   - Run: \`node scripts/check-environment.js\`
   - Check Supabase dashboard for RLS policies

5. **Quick commands:**
   \`\`\`bash
   # Test APIs
   node scripts/test-all-apis.js
   
   # Check environment
   node scripts/check-environment.js
   
   # Verify database
   node scripts/verify-supabase-data.js
   \`\`\`
`;

  const recoveryPath = path.join(__dirname, '..', 'RECOVERY_INSTRUCTIONS.md');
  fs.writeFileSync(recoveryPath, instructions);
  console.log(`📄 Recovery instructions saved to: ${recoveryPath}`);
}

// Main execution
async function runFixes() {
  console.log('Starting emergency fixes...\n');
  
  await fixBuild();
  await fixCache();
  await fixAPIs();
  await fixDatabase();
  await fixServer();
  
  // Summary
  console.log('📊 Fix Summary:');
  console.log('==============');
  Object.entries(fixes).forEach(([fix, result]) => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${fix}: ${result.message}`);
  });
  
  createRecoveryInstructions();
  
  console.log('\n✅ Emergency fix complete!');
  console.log('Next step: Run "npm run dev" to start the server');
}

// Run all fixes
runFixes().catch(console.error);