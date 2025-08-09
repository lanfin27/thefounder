#!/usr/bin/env node
// Simple monitoring script - no TypeScript, minimal dependencies
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

console.log('🚀 Flippa Monitoring System (Simple Mode)');
console.log('=' .repeat(50));

// Check if running through web API or direct
const isWebMode = process.env.NEXT_PUBLIC_APP_URL && !process.argv.includes('--direct');

if (isWebMode) {
  // Use the web API
  console.log('Mode: Web API');
  console.log('URL:', process.env.NEXT_PUBLIC_APP_URL);
  
  const { runMonitoring } = require('./run-monitoring.js');
  runMonitoring().catch(console.error);
} else {
  // Direct mode - simulate monitoring
  console.log('Mode: Direct (Simulation)');
  console.log('\n1. Initializing monitoring system...');
  
  setTimeout(() => {
    console.log('✅ System initialized');
    console.log('\n2. Starting scan simulation...');
    console.log('   - Would scan 5 pages of Flippa');
    console.log('   - Would compare with 5,645 baseline listings');
    console.log('   - Would identify new/updated/deleted listings');
    
    setTimeout(() => {
      console.log('\n3. Scan results (simulated):');
      console.log('   - Pages scanned: 5');
      console.log('   - Total listings found: 150');
      console.log('   - New listings: 12');
      console.log('   - Price drops: 4');
      console.log('   - Deleted listings: 3');
      
      console.log('\n✅ Monitoring simulation completed!');
      console.log('\nTo run actual monitoring:');
      console.log('1. Ensure the Next.js server is running: npm run dev');
      console.log('2. Run: node scripts/run-monitoring.js');
      console.log('\nOr use the admin dashboard at: /admin/scraping');
    }, 2000);
  }, 1000);
}