// Vanilla JavaScript monitoring runner - no TypeScript compilation needed
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// Simple HTTP client using built-in modules
const https = require('https');
const http = require('http');

// Configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runMonitoring() {
  console.log('🚀 Starting Flippa Monitoring System...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check system status
    console.log('\n1. Checking monitoring system status...');
    const statusRes = await makeRequest(`${APP_URL}/api/monitoring/status`);
    
    if (statusRes.status !== 200) {
      throw new Error('Failed to get monitoring status');
    }
    
    const status = statusRes.data.data;
    console.log('✅ System status retrieved');
    console.log(`   - Last scan: ${status.lastScan ? new Date(status.lastScan.completed_at).toLocaleString() : 'Never'}`);
    console.log(`   - Total listings: ${status.totalListings || 0}`);
    
    // 2. Trigger manual scan
    console.log('\n2. Triggering manual scan...');
    console.log('   - This will scan first 5 pages of Flippa');
    console.log('   - Compare with baseline database');
    console.log('   - Identify changes and new listings');
    
    const scanRes = await makeRequest(`${APP_URL}/api/monitoring/scan`, {
      method: 'POST',
      body: { manual: true }
    });
    
    if (!scanRes.data.success) {
      throw new Error(scanRes.data.error || 'Scan failed');
    }
    
    const scanId = scanRes.data.scanId;
    console.log(`✅ Scan started with ID: ${scanId}`);
    
    // 3. Monitor progress
    console.log('\n3. Monitoring scan progress...');
    let completed = false;
    let lastProgress = 0;
    
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const progressRes = await makeRequest(`${APP_URL}/api/monitoring/scan/${scanId}/progress`);
      
      if (progressRes.status === 200) {
        const progress = progressRes.data.data;
        
        if (progress.progress !== lastProgress) {
          console.log(`   Progress: ${progress.progress}% - ${progress.message}`);
          lastProgress = progress.progress;
        }
        
        if (progress.status === 'completed' || progress.status === 'failed') {
          completed = true;
          
          if (progress.status === 'completed') {
            console.log('\n✅ Scan completed successfully!');
            console.log('   Results:');
            console.log(`   - Pages scanned: ${progress.stats.pagesScanned}`);
            console.log(`   - Listings found: ${progress.stats.listingsFound}`);
            console.log(`   - New listings: ${progress.stats.newListings}`);
          } else {
            console.log('\n❌ Scan failed:', progress.message);
          }
        }
      }
    }
    
    // 4. Get recent changes
    console.log('\n4. Fetching recent changes...');
    const changesRes = await makeRequest(`${APP_URL}/api/monitoring/changes?limit=5`);
    
    if (changesRes.status === 200 && changesRes.data.data.length > 0) {
      console.log('   Recent changes:');
      changesRes.data.data.forEach(change => {
        const type = change.change_type.replace('_', ' ');
        console.log(`   - ${type}: ${change.listing_snapshot?.title || 'Listing ' + change.listing_id}`);
      });
    }
    
    console.log('\n✅ Monitoring run completed!');
    
  } catch (error) {
    console.error('\n❌ Monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMonitoring().catch(console.error);
}

module.exports = { runMonitoring };