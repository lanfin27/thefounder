// Real-time monitoring of scraping progress
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function monitorProgress() {
  console.log('📊 Starting scraping progress monitor...\n');
  
  const baseURL = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : 'http://localhost:3000';
    
  const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';
  const headers = {
    'x-admin-token': adminToken
  };

  // Initialize Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let previousCounts = {};
  let iteration = 0;

  // Monitor function
  async function checkProgress() {
    try {
      iteration++;
      
      // Clear console for clean display
      console.clear();
      console.log('📊 TheFounder Scraping Progress Monitor');
      console.log('=' .repeat(60));
      console.log(`⏰ ${new Date().toLocaleString()} (Update #${iteration})`);
      console.log('=' .repeat(60));

      // 1. Queue Status via API
      console.log('\n🔄 Queue Status:');
      try {
        const queueResponse = await axios.get(`${baseURL}/api/scraping/queue`, { 
          headers,
          timeout: 5000 
        });
        
        if (queueResponse.data.success && queueResponse.data.data) {
          const stats = queueResponse.data.data.stats;
          console.log(`   Waiting: ${stats.waiting || 0}`);
          console.log(`   Active: ${stats.active || 0}`);
          console.log(`   Completed: ${stats.completed || 0}`);
          console.log(`   Failed: ${stats.failed || 0}`);
          
          // Show recent jobs
          const recentJobs = queueResponse.data.data.recentJobs;
          if (recentJobs && recentJobs.length > 0) {
            console.log('\n   Recent Jobs:');
            recentJobs.slice(0, 3).forEach(job => {
              const status = job.status || 'unknown';
              const progress = job.progress || 0;
              console.log(`     ${job.id}: ${status} (${progress}%)`);
            });
          }
        } else {
          console.log('   ⚠️ Queue API not accessible (auth required)');
        }
      } catch (error) {
        console.log('   ⚠️ Could not fetch queue status');
      }

      // 2. Database Statistics
      console.log('\n📊 Database Statistics:');
      
      // Total listings count
      try {
        const { count: totalCount, error: totalError } = await supabase
          .from('flippa_listings')
          .select('*', { count: 'exact', head: true });
        
        if (!totalError) {
          const currentTotal = totalCount || 0;
          const previousTotal = previousCounts.total || 0;
          const newListings = currentTotal - previousTotal;
          
          console.log(`   Total Listings: ${currentTotal}`);
          if (newListings > 0) {
            console.log(`   ✨ New this update: +${newListings}`);
          }
          previousCounts.total = currentTotal;
        } else {
          console.log(`   ⚠️ Could not fetch total count: ${totalError.message}`);
        }
      } catch (error) {
        console.log('   ❌ Database error:', error.message);
      }

      // Count by category
      console.log('\n   By Category:');
      try {
        const { data: categories, error: catError } = await supabase
          .from('flippa_listings')
          .select('primary_category')
          .not('primary_category', 'is', null);
        
        if (!catError && categories) {
          const categoryCounts = {};
          categories.forEach(item => {
            const cat = item.primary_category;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
          
          Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([category, count]) => {
              const previous = previousCounts[`cat_${category}`] || 0;
              const diff = count - previous;
              const diffStr = diff > 0 ? ` (+${diff})` : '';
              console.log(`     ${category}: ${count}${diffStr}`);
              previousCounts[`cat_${category}`] = count;
            });
        }
      } catch (error) {
        console.log('     ⚠️ Could not fetch categories');
      }

      // 3. Recent Listings
      console.log('\n🆕 Most Recent Listings:');
      try {
        const { data: recentListings, error: recentError } = await supabase
          .from('flippa_listings')
          .select('title, asking_price, primary_category, scraped_at')
          .order('scraped_at', { ascending: false })
          .limit(5);

        if (!recentError && recentListings && recentListings.length > 0) {
          recentListings.forEach((listing, index) => {
            const price = listing.asking_price 
              ? `$${listing.asking_price.toLocaleString()}` 
              : 'N/A';
            const time = new Date(listing.scraped_at).toLocaleTimeString();
            const title = listing.title ? listing.title.substring(0, 40) : 'Untitled';
            const category = listing.primary_category || 'Unknown';
            
            console.log(`   ${index + 1}. [${time}] ${title}...`);
            console.log(`      ${category} - ${price}`);
          });
        } else {
          console.log('   No listings found yet');
        }
      } catch (error) {
        console.log('   ⚠️ Could not fetch recent listings');
      }

      // 4. Scraping Jobs Status
      console.log('\n📋 Active Scraping Jobs:');
      try {
        const { data: activeJobs, error: jobsError } = await supabase
          .from('scraping_jobs')
          .select('*')
          .in('status', ['pending', 'running'])
          .order('scraped_at', { ascending: false })
          .limit(5);

        if (!jobsError && activeJobs && activeJobs.length > 0) {
          activeJobs.forEach(job => {
            const runtime = job.started_at 
              ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
              : 0;
            const progress = job.total_items > 0 
              ? Math.round((job.processed_items / job.total_items) * 100)
              : 0;
            
            console.log(`   ${job.job_type} - ${job.status}`);
            console.log(`      Progress: ${job.processed_items}/${job.total_items || '?'} (${progress}%)`);
            if (runtime > 0) {
              console.log(`      Runtime: ${runtime}s`);
            }
          });
        } else {
          console.log('   No active jobs');
        }
      } catch (error) {
        console.log('   ⚠️ Could not fetch job status');
      }

      // 5. Performance Metrics
      console.log('\n⚡ Performance Metrics:');
      try {
        const { data: recentJobs, error: perfError } = await supabase
          .from('scraping_jobs')
          .select('duration_seconds, success_count, error_count')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(10);

        if (!perfError && recentJobs && recentJobs.length > 0) {
          const avgDuration = recentJobs.reduce((sum, job) => sum + (job.duration_seconds || 0), 0) / recentJobs.length;
          const totalSuccess = recentJobs.reduce((sum, job) => sum + (job.success_count || 0), 0);
          const totalErrors = recentJobs.reduce((sum, job) => sum + (job.error_count || 0), 0);
          const successRate = totalSuccess + totalErrors > 0 
            ? Math.round((totalSuccess / (totalSuccess + totalErrors)) * 100)
            : 0;
          
          console.log(`   Avg Job Duration: ${Math.round(avgDuration)}s`);
          console.log(`   Success Rate: ${successRate}%`);
          console.log(`   Total Processed: ${totalSuccess} successful, ${totalErrors} errors`);
        }
      } catch (error) {
        console.log('   ⚠️ Could not fetch performance metrics');
      }

      console.log('\n' + '-'.repeat(60));
      console.log('Press Ctrl+C to stop monitoring');
      console.log('Next update in 30 seconds...');

    } catch (error) {
      console.error('❌ Monitor error:', error.message);
      console.log('\nRetrying in 30 seconds...');
    }
  }

  // Start monitoring loop
  console.log('Starting monitor loop (updates every 30 seconds)...\n');
  
  // Initial check
  await checkProgress();
  
  // Set up interval
  const interval = setInterval(checkProgress, 30000); // Every 30 seconds

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping monitor...');
    clearInterval(interval);
    
    // Final summary
    console.log('\n📊 Final Summary:');
    console.log(`   Total updates: ${iteration}`);
    console.log(`   Total new listings: ${previousCounts.total || 0}`);
    console.log(`   Monitoring duration: ${Math.round(iteration * 0.5)} minutes`);
    
    process.exit(0);
  });
}

// Run the monitor
monitorProgress().catch(err => {
  console.error('❌ Failed to start monitor:', err);
  process.exit(1);
});