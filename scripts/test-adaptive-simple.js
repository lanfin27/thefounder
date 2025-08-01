// Simplified test script for adaptive scraping system
require('dotenv').config({ path: '.env.local' });
const AdaptiveScraper = require('../src/lib/scraping/adaptive-scraper');

async function runSimpleTest() {
  console.log('🧪 Simple Adaptive Scraper Test');
  console.log('=' .repeat(50));
  
  // Initialize scraper with optimized settings
  const scraper = new AdaptiveScraper({
    headless: false, // Show browser to see what's happening
    timeout: 60000, // 60 second timeout
    adaptationLevel: 'moderate', // Start with moderate adaptation
    learningEnabled: true,
    waitUntil: 'domcontentloaded' // Faster page load
  });
  
  // Simple test URL - just the main search page
  const testUrl = 'https://flippa.com/search';
  
  // What we're looking for (simplified)
  const targetData = {
    price: { min: 100, max: 10000000 },
    title: { pattern: '.+' }
  };
  
  console.log(`\n📍 Testing URL: ${testUrl}`);
  console.log('🎯 Looking for: price and title data');
  console.log('⏱️  Timeout: 60 seconds');
  console.log('🔄 Wait strategy: domcontentloaded\n');
  
  try {
    console.log('🚀 Starting adaptive scraping...\n');
    const startTime = Date.now();
    
    const result = await scraper.scrapeWithAdaptation(testUrl, targetData);
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Scraping completed!');
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)} seconds`);
    
    if (result.data && Object.keys(result.data).length > 0) {
      console.log('\n📊 Data extracted:');
      for (const [type, data] of Object.entries(result.data)) {
        console.log(`   ${type}: ${data.value}`);
        console.log(`     - Confidence: ${data.confidence}%`);
        console.log(`     - Method: ${data.method}`);
        if (data.selector) {
          console.log(`     - Selector: ${data.selector}`);
        }
      }
      
      console.log('\n📈 Metadata:');
      console.log(`   Overall confidence: ${result.metadata.confidence.toFixed(1)}%`);
      console.log(`   Strategies used: ${result.metadata.strategiesUsed.join(', ')}`);
      console.log(`   Adaptation triggered: ${result.metadata.adaptationTriggered ? 'Yes' : 'No'}`);
    } else {
      console.log('\n⚠️ No data extracted');
      console.log('   This might be due to:');
      console.log('   - Page structure changes');
      console.log('   - Rate limiting');
      console.log('   - Network issues');
    }
    
    // Show scraper statistics
    const stats = scraper.getStats();
    console.log('\n📊 Scraper Statistics:');
    console.log(`   Total scrapes: ${stats.totalScrapes}`);
    console.log(`   Success rate: ${stats.successRate}`);
    console.log(`   Strategies performance:`);
    if (stats.cascadePerformance) {
      for (const [strategy, perf] of Object.entries(stats.cascadePerformance)) {
        if (perf.attempts > 0) {
          console.log(`     - ${strategy}: ${perf.successRate}`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Error type:', error.name);
    
    if (error.message.includes('Timeout')) {
      console.log('\n💡 Timeout suggestions:');
      console.log('   - Try increasing timeout beyond 60 seconds');
      console.log('   - Check your internet connection');
      console.log('   - Flippa might be blocking automated requests');
    } else if (error.message.includes('net::')) {
      console.log('\n💡 Network error suggestions:');
      console.log('   - Check your internet connection');
      console.log('   - Try using a VPN');
      console.log('   - Check if Flippa is accessible in your browser');
    }
    
    console.log('\n📋 Error details:');
    console.log(error.stack);
  }
  
  console.log('\n🏁 Test complete');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});

// Run the test
console.log('Starting in 3 seconds...\n');
setTimeout(() => {
  runSimpleTest().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}, 3000);