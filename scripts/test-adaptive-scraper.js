/**
 * Test script for adaptive marketplace scraping
 * Demonstrates how the system handles dynamic marketplace changes
 */

const AdaptiveFlippaScraper = require('./flippa-scraper-adaptive');
const MarketplaceTracker = require('./marketplace-tracker');
const winston = require('winston');

// Create test logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

async function testAdaptiveFeatures() {
  console.log('🧪 ADAPTIVE SCRAPER TEST SUITE\n');
  
  // Test 1: Marketplace detection strategies
  console.log('📋 Test 1: Marketplace Detection Strategies');
  console.log('='.repeat(50));
  
  const tracker = new MarketplaceTracker(logger);
  
  // Simulate different marketplace states
  const simulatedStates = [
    { total: 5635, source: 'pagination', confidence: 0.9 },
    { total: 5640, source: 'total_count', confidence: 0.95 },
    { total: 5650, source: 'api_hints', confidence: 0.88 }
  ];
  
  simulatedStates.forEach(state => {
    tracker.addToHistory({
      totalListings: state.total,
      confidence: state.confidence,
      sources: { [state.source]: state },
      timestamp: new Date().toISOString()
    });
  });
  
  const velocity = tracker.getMarketplaceVelocity();
  console.log(`\nMarketplace velocity: ${velocity.toFixed(2)} listings/hour`);
  console.log(`Recommendation: ${tracker.getRecommendation()}`);
  
  // Test 2: Completeness analysis
  console.log('\n📋 Test 2: Completeness Analysis');
  console.log('='.repeat(50));
  
  // Simulate scraped listings
  const mockListings = [];
  for (let i = 1; i <= 5000; i++) {
    mockListings.push({
      id: `listing_${i}`,
      pageNumber: Math.ceil(i / 25)
    });
  }
  
  const completeness = tracker.analyzeCompleteness(mockListings, 5635);
  console.log(`\nCompleteness: ${completeness.percentage}%`);
  console.log(`Scraped: ${completeness.scrapedCount}`);
  console.log(`Expected: ${completeness.expectedTotal}`);
  console.log(`Missing pages: ${completeness.missingPages.slice(0, 10).join(', ')}...`);
  console.log(`Target achieved: ${completeness.complete ? 'YES' : 'NO'}`);
  
  // Test 3: Adaptive delay calculation
  console.log('\n📋 Test 3: Adaptive Delay Strategy');
  console.log('='.repeat(50));
  
  const scraper = new AdaptiveFlippaScraper({ headless: true });
  
  const testPages = [1, 5, 10, 20, 50, 100];
  console.log('\nPage delays:');
  testPages.forEach(page => {
    const delay = scraper.calculateAdaptiveDelay(page, 2500);
    console.log(`  Page ${page}: ${(delay/1000).toFixed(1)}s delay`);
  });
  
  // Test 4: Stop conditions
  console.log('\n📋 Test 4: Dynamic Stop Conditions');
  console.log('='.repeat(50));
  
  const strategies = [
    { type: 'fixed_pages', pages: 10, description: 'Fixed 10 pages' },
    { type: 'standard', pages: 226, description: 'Standard mode' },
    { type: 'aggressive', pages: 236, description: 'Aggressive mode' },
    { type: 'exploratory', pages: 100, description: 'Exploratory mode' }
  ];
  
  strategies.forEach(strategy => {
    console.log(`\nStrategy: ${strategy.description}`);
    console.log(`  Should stop at page 230: ${scraper.shouldStopScraping(230, strategy, 0)}`);
    console.log(`  Should stop at page 240: ${scraper.shouldStopScraping(240, strategy, 0)}`);
    console.log(`  Should stop with 5 empty pages: ${scraper.shouldStopScraping(50, strategy, 5)}`);
  });
  
  // Test 5: Marketplace change detection
  console.log('\n📋 Test 5: Marketplace Change Detection');
  console.log('='.repeat(50));
  
  const changeTracker = new MarketplaceTracker(logger);
  
  // Simulate marketplace changes
  const timestamps = [
    new Date(Date.now() - 3600000), // 1 hour ago
    new Date(Date.now() - 1800000), // 30 min ago
    new Date()                       // now
  ];
  
  const counts = [5000, 5100, 5300]; // Rapid growth
  
  counts.forEach((count, i) => {
    changeTracker.addToHistory({
      totalListings: count,
      timestamp: timestamps[i].toISOString(),
      confidence: 0.95
    });
  });
  
  console.log(`\nMarketplace changed: ${changeTracker.hasMarketplaceChanged()}`);
  console.log(`Growth rate: ${changeTracker.getMarketplaceVelocity().toFixed(2)} listings/hour`);
  
  const prediction = changeTracker.predictNaturalEnd(200, 25);
  if (prediction) {
    console.log(`\nNatural end prediction:`);
    console.log(`  Expected last page: ${prediction.expectedLastPage}`);
    console.log(`  Buffer pages: ${prediction.bufferPages}`);
    console.log(`  Recommended stop: page ${prediction.recommendedStopPage}`);
  }
}

async function runLiveTest() {
  console.log('\n\n🚀 LIVE ADAPTIVE SCRAPING TEST');
  console.log('='.repeat(60));
  console.log('This will run a real adaptive scraping session with:');
  console.log('  - Dynamic marketplace detection');
  console.log('  - Adaptive page limits');
  console.log('  - Real-time completeness tracking');
  console.log('  - Automatic stop when 95% complete\n');
  
  const scraper = new AdaptiveFlippaScraper({
    headless: false, // Show browser for demo
    adaptiveMode: true,
    completenessTarget: 0.95,
    recheckInterval: 10 // Check more frequently for demo
  });
  
  try {
    const baseUrl = 'https://flippa.com/search?filter[property_type][]=website';
    const results = await scraper.scrapeAdaptive(baseUrl);
    
    console.log('\n✅ Test completed successfully!');
    console.log(`Total listings: ${results.listings.length}`);
    console.log(`Completeness: ${results.completeness.percentage}%`);
    console.log(`Pages processed: ${results.stats.pagesProcessed}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--live')) {
    await runLiveTest();
  } else {
    await testAdaptiveFeatures();
    console.log('\n\n💡 Run with --live flag to test real adaptive scraping');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAdaptiveFeatures, runLiveTest };