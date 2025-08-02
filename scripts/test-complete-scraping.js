// Test script for complete Flippa scraping system
require('dotenv').config({ path: '.env.local' });

async function testCompleteScraping() {
  console.log('🧪 Testing Complete Flippa Scraping System');
  console.log('=' .repeat(70));
  
  // Test 1: Database Integration
  console.log('\n📊 Test 1: Database Integration');
  try {
    const FlippaDatabase = require('../src/lib/database/flippa-integration');
    const db = new FlippaDatabase();
    
    // Test getting existing listings
    const existingListings = await db.getExistingListings();
    console.log(`✅ Found ${existingListings.size} existing listings in database`);
    
    // Test stats
    const stats = await db.getScrapingStats(7);
    console.log(`✅ Database stats:`, stats);
  } catch (error) {
    console.log(`❌ Database test failed:`, error.message);
  }
  
  // Test 2: API Endpoint
  console.log('\n🌐 Test 2: API Endpoint');
  try {
    const response = await fetch('http://localhost:3000/api/scraping/trigger', {
      method: 'GET',
      headers: {
        'x-admin-token': process.env.ADMIN_TOKEN || ''
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API endpoint working:`, data.stats);
    } else {
      console.log(`❌ API endpoint returned ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ API test failed:`, error.message);
  }
  
  // Test 3: Manual Trigger
  console.log('\n🔧 Test 3: Manual Trigger (Quick Scrape)');
  try {
    const response = await fetch('http://localhost:3000/api/scraping/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': process.env.ADMIN_TOKEN || ''
      },
      body: JSON.stringify({
        type: 'quick',
        options: {
          maxPages: 1
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Quick scrape triggered:`, data);
      
      // Wait a bit then check status
      console.log('⏳ Waiting 5 seconds to check job status...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`http://localhost:3000/api/scraping/trigger?jobId=${data.jobId}`, {
        headers: {
          'x-admin-token': process.env.ADMIN_TOKEN || ''
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`📊 Job status:`, statusData.status);
      }
    } else {
      console.log(`❌ Trigger failed with status ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Trigger test failed:`, error.message);
  }
  
  // Test 4: Complete Scraper Module
  console.log('\n🚀 Test 4: Complete Scraper (Dry Run)');
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('📋 Testing page setup...');
    await page.goto('https://flippa.com/search');
    await page.waitForTimeout(5000);
    
    // Test clear button visibility
    const clearButton = await page.locator('div.btn.btn-link.btn-sm:has-text("Clear")');
    const isClearVisible = await clearButton.isVisible();
    console.log(`✅ Clear button visible: ${isClearVisible}`);
    
    // Test status section with multiple strategies
    console.log('🔍 Testing status section detection...');
    let hasStatusSection = false;
    
    // Strategy 1: Try different selectors for status section
    const statusSelectors = [
      'section:has-text("Status")',
      'div:has-text("Status"):has(label)',
      '.filter-section:has-text("Status")',
      'div.filter-group:has-text("Status")',
      'fieldset:has-text("Status")'
    ];
    
    for (const selector of statusSelectors) {
      try {
        const section = await page.locator(selector);
        if (await section.count() > 0) {
          hasStatusSection = true;
          console.log(`✅ Status section found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    // Strategy 2: Look for Recently Sold text directly
    if (!hasStatusSection) {
      const recentlySoldElement = await page.locator('text="Recently Sold"');
      if (await recentlySoldElement.count() > 0) {
        hasStatusSection = true;
        console.log('✅ Found "Recently Sold" text on page');
      }
    }
    
    // Strategy 3: JavaScript DOM search
    if (!hasStatusSection) {
      hasStatusSection = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const statusElement = elements.find(el => 
          el.textContent?.includes('Status') && 
          el.textContent?.includes('Recently Sold')
        );
        return !!statusElement;
      });
      
      if (hasStatusSection) {
        console.log('✅ Status section found via DOM search');
      }
    }
    
    console.log(`📊 Status section detection result: ${hasStatusSection}`);
    
    // Test sort dropdown
    const sortSelect = await page.locator('select[name="sort_alias"]');
    const hasSortSelect = await sortSelect.count() > 0;
    console.log(`✅ Sort dropdown found: ${hasSortSelect}`);
    
    // Test listings
    await page.waitForSelector('[id^="listing-"]', { timeout: 30000 });
    const listingCount = await page.locator('[id^="listing-"]').count();
    console.log(`✅ Found ${listingCount} listings on page`);
    
    await browser.close();
  } catch (error) {
    console.log(`❌ Scraper test failed:`, error.message);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('🧪 Testing complete!');
  console.log('\nNext steps:');
  console.log('1. Run: node scripts/scrape-flippa-complete.js');
  console.log('2. Start worker: node scripts/worker-flippa-scheduler.js');
  console.log('3. Visit: http://localhost:3000/admin/scraping-status');
}

// Run tests
testCompleteScraping().catch(console.error);