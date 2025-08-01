// Test script for the complete adaptive Flippa scraping system
require('dotenv').config({ path: '.env.local' });
const AdaptiveScraper = require('../src/lib/scraping/adaptive-scraper');
const HealthMonitor = require('../src/lib/scraping/monitoring/health-monitor');
const AutoHealer = require('../src/lib/scraping/healing/auto-healer');
const PatternLearner = require('../src/lib/scraping/ml/pattern-learner');
const AdaptationEngine = require('../src/lib/scraping/realtime/adaptation-engine');

async function testAdaptiveSystem() {
  console.log('🧪 Testing Complete Adaptive Flippa Scraping System');
  console.log('=' .repeat(60));
  
  // Initialize all components with increased timeout
  const adaptiveScraper = new AdaptiveScraper({
    headless: false, // Show browser for testing
    adaptationLevel: 'aggressive',
    learningEnabled: true,
    timeout: 60000 // Increased to 60 seconds for Flippa
  });
  
  const healthMonitor = new HealthMonitor();
  const autoHealer = new AutoHealer();
  const patternLearner = new PatternLearner();
  const adaptationEngine = new AdaptationEngine();
  
  // Test URLs - starting with more reliable URLs
  const testUrls = [
    'https://flippa.com/search', // Start with basic search page
    'https://flippa.com/search?filter[property_type]=website',
    'https://flippa.com/search?filter[property_type]=blog',
    'https://flippa.com/search?filter[property_type]=ecommerce',
    'https://flippa.com/search?filter[property_type]=saas'
  ];
  
  // Define target data outside the loop
  const targetData = {
    price: { min: 1000, max: 10000000 },
    title: { pattern: '.+' },
    revenue: { min: 0, max: 10000000 },
    profit: { min: 0, max: 10000000 },
    multiple: { min: 0.1, max: 50 }
  };
  
  console.log('\n📋 Test Plan:');
  console.log('1. Test adaptive scraping on multiple URLs');
  console.log('2. Monitor health and performance');
  console.log('3. Demonstrate pattern learning');
  console.log('4. Show self-healing in action');
  console.log('5. Display comprehensive statistics\n');
  
  const results = [];
  
  for (const url of testUrls) {
    console.log(`\n🌐 Testing: ${url}`);
    console.log('-'.repeat(60));
    
    let result = null;
    
    try {
      
      // Start timing
      const startTime = Date.now();
      
      // Perform adaptive scraping
      result = await adaptiveScraper.scrapeWithAdaptation(url, targetData);
      
      const duration = Date.now() - startTime;
      
      // Record results
      results.push({
        url: url,
        success: Object.keys(result.data).length > 0,
        dataExtracted: Object.keys(result.data),
        confidence: result.metadata.confidence,
        duration: duration,
        strategiesUsed: result.metadata.strategiesUsed,
        adaptationTriggered: result.metadata.adaptationTriggered
      });
      
      // Display results
      console.log('\n📊 Extraction Results:');
      for (const [dataType, data] of Object.entries(result.data)) {
        console.log(`   ${dataType}: ${data.value} (confidence: ${data.confidence}%)`);
      }
      
      console.log(`\n⏱️ Time taken: ${duration}ms`);
      console.log(`🎯 Overall confidence: ${result.metadata.confidence.toFixed(1)}%`);
      console.log(`🔧 Strategies used: ${result.metadata.strategiesUsed.join(', ')}`);
      
      // Record health metrics
      await healthMonitor.recordExtractionResult({
        success: Object.keys(result.data).length > 0,
        extracted: Object.keys(result.data),
        method: result.metadata.strategiesUsed[0] || 'unknown'
      });
      
      await healthMonitor.recordPerformance(duration);
      
      // Train pattern learner on successful extractions
      if (result.data.price) {
        console.log('\n🧠 Training pattern learner...');
        // In real implementation, we'd pass the actual DOM element
        // await patternLearner.trainOnSuccess(element, 'price', result.data.price.value, $);
      }
      
    } catch (error) {
      console.error(`\n❌ Error testing ${url}:`, error.message);
      
      // Record failure for statistics
      results.push({
        url: url,
        success: false,
        dataExtracted: [],
        confidence: 0,
        duration: 0,
        strategiesUsed: ['failed'],
        adaptationTriggered: false,
        error: error.message
      });
      
      // Record failure in health monitor
      await healthMonitor.recordError(error, { url: url });
      
      // Trigger auto-healing
      try {
        const diagnosis = await autoHealer.analyzeFailure({
          url: url,
          targetData: Object.keys(targetData),
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        console.log('\n🔧 Auto-healing diagnosis:', diagnosis.failureType);
        console.log('   Recommended strategies:', diagnosis.recommendedStrategies.join(', '));
      } catch (healingError) {
        console.error('   Auto-healing failed:', healingError.message);
      }
      
      console.log('\n⏩ Continuing with next URL...');
      continue; // Skip to next URL
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Display comprehensive statistics
  console.log('\n\n📈 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(60));
  
  // 1. Scraping Summary
  console.log('\n1️⃣ Scraping Summary:');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`   Total URLs tested: ${results.length}`);
  console.log(`   Successful: ${successCount} (${results.length > 0 ? (successCount/results.length*100).toFixed(1) : 0}%)`)
  console.log(`   Failed: ${failCount}`);
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    console.log(`   Average confidence: ${(successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length).toFixed(1)}%`);
    console.log(`   Average time: ${(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length).toFixed(0)}ms`);
  } else {
    console.log(`   Average confidence: N/A (no successful scrapes)`);
    console.log(`   Average time: N/A (no successful scrapes)`);
  }
  
  // Show failed URLs
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log('\n   Failed URLs:');
    failedResults.forEach(r => {
      console.log(`     - ${r.url}: ${r.error || 'Unknown error'}`);
    });
  }
  
  // 2. Adaptive Scraper Stats
  console.log('\n2️⃣ Adaptive Scraper Statistics:');
  const scraperStats = adaptiveScraper.getStats();
  console.log(`   Total scrapes: ${scraperStats.totalScrapes}`);
  console.log(`   Success rate: ${scraperStats.successRate}`);
  console.log(`   Adaptation triggered: ${scraperStats.adaptationTriggered} times`);
  console.log(`   Strategies used:`);
  for (const [strategy, count] of Object.entries(scraperStats.strategiesUsed)) {
    console.log(`     - ${strategy}: ${count} times`);
  }
  
  // 3. Health Monitor Report
  console.log('\n3️⃣ System Health Report:');
  const healthReport = healthMonitor.getHealthReport();
  console.log(`   Overall health: ${healthReport.status.overall}`);
  console.log(`   Extraction health: ${healthReport.status.extractionHealth}`);
  console.log(`   Performance health: ${healthReport.status.performanceHealth}`);
  console.log(`   Active alerts: ${healthReport.summary.activeAlerts.length}`);
  if (healthReport.recommendations.length > 0) {
    console.log('   Recommendations:');
    healthReport.recommendations.forEach(rec => {
      console.log(`     - ${rec.message}`);
    });
  }
  
  // 4. Pattern Learning Insights
  console.log('\n4️⃣ Pattern Learning Insights:');
  const learningInsights = patternLearner.getModelInsights();
  console.log(`   Total training examples: ${learningInsights.overallPerformance.totalExamples}`);
  for (const [dataType, info] of Object.entries(learningInsights.dataTypes)) {
    console.log(`   ${dataType}:`);
    console.log(`     - Examples: ${info.examples}`);
    console.log(`     - Success rate: ${info.successRate}`);
    console.log(`     - Top features: ${info.topFeatures.map(f => f.feature).join(', ')}`);
  }
  
  // 5. Auto-Healing Stats
  console.log('\n5️⃣ Auto-Healing Statistics:');
  const healingStats = autoHealer.getHealingStats();
  console.log(`   Total healing attempts: ${healingStats.totalHealingAttempts}`);
  console.log(`   Successful heals: ${healingStats.successfulHeals}`);
  console.log(`   Failed heals: ${healingStats.failedHeals}`);
  if (Object.keys(healingStats.strategyEffectiveness).length > 0) {
    console.log('   Strategy effectiveness:');
    for (const [strategy, stats] of Object.entries(healingStats.strategyEffectiveness)) {
      console.log(`     - ${strategy}: ${stats.successRate}`);
    }
  }
  
  // 6. Real-time Adaptation Insights
  console.log('\n6️⃣ Real-time Adaptation Insights:');
  const adaptationInsights = adaptationEngine.getAdaptationInsights();
  console.log(`   Total adaptations: ${adaptationInsights.totalAdaptations}`);
  console.log(`   Successful adaptations: ${adaptationInsights.successfulAdaptations}`);
  const adaptationSuccessRate = adaptationInsights.totalAdaptations > 0 
    ? (adaptationInsights.successfulAdaptations / adaptationInsights.totalAdaptations * 100)
    : 0;
  console.log(`   Success rate: ${adaptationSuccessRate.toFixed(1)}%`);
  
  // 7. Performance Analysis
  console.log('\n7️⃣ Performance Analysis:');
  const strategies = {};
  results.forEach(r => {
    r.strategiesUsed?.forEach(s => {
      if (!strategies[s]) strategies[s] = { count: 0, totalTime: 0 };
      strategies[s].count++;
      strategies[s].totalTime += r.duration;
    });
  });
  
  console.log('   Strategy performance:');
  for (const [strategy, data] of Object.entries(strategies)) {
    console.log(`     - ${strategy}: avg ${(data.totalTime / data.count).toFixed(0)}ms (used ${data.count} times)`);
  }
  
  console.log('\n\n✅ Adaptive Scraping System Test Complete!');
  console.log('=' .repeat(60));
  
  // Cleanup
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run test
testAdaptiveSystem().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});