// Enhanced monitoring dashboard for Flippa scraping
require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');
const { redisConnection } = require('../src/lib/redis/connection');

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Target categories
const CATEGORIES = [
  'saas', 'ecommerce', 'content', 'apps', 'services',
  'amazon-fba', 'digital-products', 'newsletters', 'communities',
  'crypto', 'gaming', 'education', 'marketplace', 'advertising', 'other'
];

async function monitorDashboard() {
  console.log('📊 TheFounder Scraping Dashboard');
  console.log('Starting real-time monitoring...\n');
  
  try {
    // Connect to Redis
    await redisConnection.connect();
    const queue = new Bull('flippa-scraping', process.env.REDIS_URL);
    
    // Start monitoring loop
    setInterval(async () => {
      await displayDashboard(queue);
    }, 5000); // Update every 5 seconds
    
    // Initial display
    await displayDashboard(queue);
    
  } catch (error) {
    console.error('❌ Monitor error:', error.message);
    process.exit(1);
  }
}

async function displayDashboard(queue) {
  console.clear();
  console.log('📊 TheFounder Scraping Dashboard');
  console.log('=' .repeat(80));
  console.log(`⏰ ${new Date().toLocaleString()}`);
  console.log('=' .repeat(80));
  
  // 1. Queue Status
  const queueStats = await queue.getJobCounts();
  console.log('\n🔄 QUEUE STATUS');
  console.log('-'.repeat(40));
  console.log(`Waiting:   ${padNumber(queueStats.waiting)} jobs`);
  console.log(`Active:    ${padNumber(queueStats.active)} jobs ${queueStats.active > 0 ? '🟢' : '⚫'}`);
  console.log(`Completed: ${padNumber(queueStats.completed)} jobs`);
  console.log(`Failed:    ${padNumber(queueStats.failed)} jobs ${queueStats.failed > 0 ? '🔴' : ''}`);
  
  // 2. Database Statistics
  console.log('\n📈 DATABASE STATISTICS');
  console.log('-'.repeat(40));
  
  // Total listings
  const { count: totalListings } = await supabase
    .from('flippa_listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total Listings: ${totalListings || 0}`);
  
  // Category breakdown
  console.log('\n📂 CATEGORY BREAKDOWN');
  console.log('-'.repeat(60));
  console.log('Category'.padEnd(20) + 'Count'.padEnd(10) + 'Avg Price'.padEnd(15) + 'Avg Multiple');
  console.log('-'.repeat(60));
  
  for (const category of CATEGORIES.slice(0, 5)) { // Show top 5 for space
    const { data: categoryData } = await supabase
      .from('flippa_listings')
      .select('asking_price, monthly_revenue')
      .eq('primary_category', category);
    
    if (categoryData && categoryData.length > 0) {
      const count = categoryData.length;
      const avgPrice = categoryData.reduce((sum, l) => sum + l.asking_price, 0) / count;
      const validRevenue = categoryData.filter(l => l.monthly_revenue > 0);
      let avgMultiple = 'N/A';
      
      if (validRevenue.length > 0) {
        const avgRev = validRevenue.reduce((sum, l) => sum + l.monthly_revenue, 0) / validRevenue.length;
        avgMultiple = (avgPrice / (avgRev * 12)).toFixed(2) + 'x';
      }
      
      console.log(
        category.padEnd(20) +
        count.toString().padEnd(10) +
        ('$' + Math.round(avgPrice).toLocaleString()).padEnd(15) +
        avgMultiple
      );
    } else {
      console.log(category.padEnd(20) + '0'.padEnd(10) + '-'.padEnd(15) + '-');
    }
  }
  
  // 3. Recent Activity
  console.log('\n🕐 RECENT ACTIVITY');
  console.log('-'.repeat(40));
  
  const { data: recentListings } = await supabase
    .from('flippa_listings')
    .select('title, asking_price, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(3);
  
  if (recentListings && recentListings.length > 0) {
    recentListings.forEach(listing => {
      const time = new Date(listing.scraped_at).toLocaleTimeString();
      const title = listing.title.length > 40 ? listing.title.substring(0, 40) + '...' : listing.title;
      console.log(`${time} - ${title} ($${listing.asking_price.toLocaleString()})`);
    });
  } else {
    console.log('No recent activity');
  }
  
  // 4. Performance Metrics
  console.log('\n⚡ PERFORMANCE METRICS');
  console.log('-'.repeat(40));
  
  const completedJobs = await queue.getCompleted(0, 10);
  if (completedJobs.length > 0) {
    const processingTimes = completedJobs.map(job => 
      job.finishedOn - job.processedOn
    ).filter(t => t > 0);
    
    if (processingTimes.length > 0) {
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      console.log(`Avg Processing Time: ${Math.round(avgTime)}ms`);
    }
  }
  
  console.log(`Jobs/Hour Rate: ${Math.round(queueStats.completed / 24)} (estimated)`);
  
  // 5. System Health
  console.log('\n💚 SYSTEM HEALTH');
  console.log('-'.repeat(40));
  
  const healthChecks = {
    'Redis Connection': await checkRedisHealth(),
    'Database Connection': await checkDatabaseHealth(),
    'Queue Processing': queueStats.active > 0 || queueStats.waiting > 0,
    'Error Rate': queueStats.failed / (queueStats.completed || 1) < 0.1
  };
  
  Object.entries(healthChecks).forEach(([check, status]) => {
    console.log(`${check}: ${status ? '✅ Healthy' : '❌ Issue'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('Press Ctrl+C to exit | Updates every 5 seconds');
}

function padNumber(num) {
  return num.toString().padStart(6);
}

async function checkRedisHealth() {
  try {
    return await redisConnection.isConnected();
  } catch {
    return false;
  }
}

async function checkDatabaseHealth() {
  try {
    const { error } = await supabase
      .from('flippa_listings')
      .select('count')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📛 Shutting down monitor...');
  await redisConnection.disconnect();
  process.exit(0);
});

// Start monitoring
monitorDashboard();