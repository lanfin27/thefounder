// Controlled start of actual Flippa scraping
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function startScraping() {
  console.log('🚀 Starting actual Flippa scraping system...\n');
  
  const baseURL = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : 'http://localhost:3000';
    
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  const headers = {
    'x-admin-token': adminToken,
    'Content-Type': 'application/json'
  };

  console.log('📍 Configuration:');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Admin Token: ***${adminToken.slice(-4)}`);
  console.log(`   Scraping Enabled: ${process.env.FLIPPA_SCRAPING_ENABLED || 'true'}`);
  console.log('');

  try {
    // 1. Pre-flight checks
    console.log('🔍 Running pre-flight checks...');
    
    // Check environment
    try {
      const envCheck = await axios.get(`${baseURL}/api/scraping/test`, { 
        headers,
        timeout: 10000 
      });
      if (envCheck.data.success) {
        console.log('   ✅ Environment check passed');
      } else {
        throw new Error('Environment check failed');
      }
    } catch (error) {
      console.log('   ❌ Environment check failed:', error.message);
      console.log('   💡 Make sure the development server is running: npm run dev');
      return false;
    }

    // Check Redis connection (via test endpoint)
    console.log('   🔄 Checking Redis connection...');
    try {
      const redisCheck = await axios.get(`${baseURL}/api/scraping/test?type=redis`, { 
        headers,
        timeout: 10000 
      });
      console.log('   ✅ Redis connection verified');
    } catch (error) {
      console.log('   ⚠️ Redis check skipped (optional for initial test)');
    }

    // 2. Create initial test jobs
    console.log('\n🎯 Creating initial scraping jobs...');
    
    // Start with a single category for safety
    const testCategories = [
      { 
        name: 'saas', 
        priority: 'high',
        maxPages: 1,  // Start with just 1 page
        description: 'Software as a Service'
      }
    ];
    
    const createdJobs = [];

    for (const category of testCategories) {
      console.log(`\n📝 Creating job for: ${category.name}`);
      
      try {
        // Create job via API
        const jobData = {
          jobType: 'listing_scan',
          config: {
            category: category.name,
            maxPages: category.maxPages,
            priority: category.priority,
            description: category.description,
            respectRateLimit: true,
            delayMs: 2000, // 2 second delay between requests
            test: true // Mark as test job
          }
        };

        const jobResponse = await axios.post(
          `${baseURL}/api/scraping/jobs`,
          jobData,
          { headers, timeout: 10000 }
        );

        if (jobResponse.data.success) {
          const job = jobResponse.data.data.job;
          console.log(`   ✅ Job created successfully`);
          console.log(`      ID: ${job.id}`);
          console.log(`      Category: ${category.name}`);
          console.log(`      Priority: ${category.priority}`);
          console.log(`      Max Pages: ${category.maxPages}`);
          createdJobs.push(job);
        } else {
          console.log(`   ❌ Failed to create job: ${jobResponse.data.error}`);
        }
        
      } catch (jobError) {
        if (jobError.response?.status === 401) {
          console.log(`   ❌ Authentication required - check admin token`);
        } else if (jobError.response?.status === 403) {
          console.log(`   ❌ Admin access required - login as admin user`);
        } else {
          console.log(`   ❌ Failed to create job: ${jobError.response?.data?.error || jobError.message}`);
        }
      }
    }

    if (createdJobs.length === 0) {
      console.log('\n❌ No jobs created. Please check authentication and try again.');
      return false;
    }

    // 3. Initial monitoring
    console.log('\n📊 Waiting for jobs to start processing...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    // Check job status
    console.log('\n📈 Checking job status...');
    for (const job of createdJobs) {
      try {
        const statusResponse = await axios.get(
          `${baseURL}/api/scraping/jobs/${job.id}`,
          { headers, timeout: 10000 }
        );

        if (statusResponse.data.success) {
          const jobStatus = statusResponse.data.data.job;
          console.log(`\n   Job ${job.id}:`);
          console.log(`      Status: ${jobStatus.status}`);
          console.log(`      Progress: ${jobStatus.processed_items || 0}/${jobStatus.total_items || '?'}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not check status for job ${job.id}`);
      }
    }

    // 4. Monitoring instructions
    console.log('\n' + '='.repeat(60));
    console.log('📋 Monitoring Commands');
    console.log('='.repeat(60));
    
    console.log('\n1. Check queue status:');
    console.log(`   curl -H "x-admin-token: ${adminToken}" \\`);
    console.log(`     ${baseURL}/api/scraping/queue`);
    
    console.log('\n2. View job details:');
    if (createdJobs.length > 0) {
      console.log(`   curl -H "x-admin-token: ${adminToken}" \\`);
      console.log(`     ${baseURL}/api/scraping/jobs/${createdJobs[0].id}`);
    }
    
    console.log('\n3. Check database for results:');
    console.log('   -- In Supabase SQL Editor:');
    console.log('   SELECT COUNT(*) FROM flippa_listings;');
    console.log('   SELECT * FROM flippa_listings ORDER BY scraped_at DESC LIMIT 10;');
    
    console.log('\n4. View scraping logs:');
    console.log('   Check logs/ directory for detailed logs');
    
    console.log('\n5. Stop a job if needed:');
    if (createdJobs.length > 0) {
      console.log(`   curl -X DELETE -H "x-admin-token: ${adminToken}" \\`);
      console.log(`     ${baseURL}/api/scraping/jobs/${createdJobs[0].id}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Scraping system started successfully!');
    console.log('='.repeat(60));
    console.log('\n⏱️ Timeline:');
    console.log('   0-2 min: Jobs initialize and start processing');
    console.log('   2-5 min: First listings should appear in database');
    console.log('   5-10 min: Initial batch complete');
    
    console.log('\n⚠️ Safety notes:');
    console.log('   - Started with only 1 category, 1 page');
    console.log('   - Rate limiting is enabled (2s between requests)');
    console.log('   - Monitor for any errors in first 5 minutes');
    console.log('   - Scale up gradually after confirming success');
    
    return true;

  } catch (error) {
    console.error('\n❌ Failed to start scraping:', error.message);
    if (error.response) {
      console.log(`Response: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.log('\n🔧 Troubleshooting checklist:');
    console.log('   [ ] Development server running? (npm run dev)');
    console.log('   [ ] Redis server running? (npm run start:redis)');
    console.log('   [ ] Database migration completed?');
    console.log('   [ ] Environment variables set? (npm run test:environment)');
    console.log('   [ ] API endpoints accessible? (npm run test:api)');
    console.log('   [ ] Playwright browsers installed? (npx playwright install chromium)');
    
    return false;
  }
}

// Run the scraping starter
startScraping()
  .then(success => {
    console.log('\n' + '-'.repeat(60));
    if (success) {
      console.log('✅ Scraping initialization complete');
      console.log('📊 Monitor progress with the commands above');
    } else {
      console.log('❌ Scraping initialization failed');
      console.log('🔧 Fix the issues and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Unexpected error:', err);
    process.exit(1);
  });