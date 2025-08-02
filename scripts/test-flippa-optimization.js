// Test script for optimized Flippa scraper targeting 95%+ Apify standard
require('dotenv').config({ path: '.env.local' });
const FlippaScraperEngine = require('./flippa-scraper-engine');

async function testFlippaOptimization() {
  console.log('🚀 Testing Optimized Flippa Scraper for 95%+ Apify Standard');
  console.log('='.repeat(70));
  
  const scraper = new FlippaScraperEngine({
    headless: false, // Set to true for production
    maxRetries: 3,
    timeout: 120000,
    qualityThreshold: 50, // Lower to capture more listings
    targetSuccessRate: 95
  });
  
  try {
    // Test multiple URLs to get better coverage
    const testUrls = [
      'https://flippa.com/search?filter[status][]=sold',
      'https://flippa.com/search?filter[property_type][]=website',
      'https://flippa.com/search?sort_alias=price_desc'
    ];
    
    console.log('\n📊 Test Configuration:');
    console.log(`- Quality Threshold: ${scraper.config.qualityThreshold}`);
    console.log(`- Target Success Rate: ${scraper.config.targetSuccessRate}%`);
    console.log(`- Timeout: ${scraper.config.timeout}ms`);
    console.log(`- URLs to test: ${testUrls.length}`);
    
    const allListings = [];
    const testResults = [];
    
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      console.log(`\n🔍 Test ${i + 1}/${testUrls.length}: ${url}`);
      
      const startTime = Date.now();
      
      try {
        const listings = await scraper.scrapeWithApifyMethodology(url, {
          filterRecentlySold: i === 0, // Only for first test
          maxPages: 1
        });
        
        const duration = Date.now() - startTime;
        allListings.push(...listings);
        
        testResults.push({
          url,
          success: true,
          listingsCount: listings.length,
          duration,
          averageQuality: listings.length > 0 ? 
            (listings.reduce((sum, l) => sum + l._qualityScore, 0) / listings.length).toFixed(1) : 0
        });
        
        console.log(`  ✅ Extracted: ${listings.length} listings in ${(duration/1000).toFixed(1)}s`);
        console.log(`  📊 Average Quality: ${testResults[testResults.length-1].averageQuality}`);
        
      } catch (error) {
        testResults.push({
          url,
          success: false,
          error: error.message
        });
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
    
    // Analyze combined results
    console.log('\n' + '='.repeat(70));
    console.log('📈 COMBINED RESULTS ANALYSIS');
    console.log('='.repeat(70));
    
    console.log(`\n📊 Overall Extraction:`);
    console.log(`- Total Listings: ${allListings.length}`);
    console.log(`- Unique Listings: ${new Set(allListings.map(l => l.id)).size}`);
    console.log(`- Success Rate: ${(testResults.filter(r => r.success).length / testResults.length * 100).toFixed(1)}%`);
    
    // Initialize fieldStats outside if block
    let fieldStats = {};
    
    if (allListings.length > 0) {
      // Quality analysis
      const qualityBuckets = {
        high: allListings.filter(l => l._qualityScore >= 80).length,
        medium: allListings.filter(l => l._qualityScore >= 50 && l._qualityScore < 80).length,
        low: allListings.filter(l => l._qualityScore < 50).length
      };
      
      console.log('\n📊 Quality Distribution:');
      console.log(`- High (80+): ${qualityBuckets.high} (${(qualityBuckets.high/allListings.length*100).toFixed(1)}%)`);
      console.log(`- Medium (50-79): ${qualityBuckets.medium} (${(qualityBuckets.medium/allListings.length*100).toFixed(1)}%)`);
      console.log(`- Low (<50): ${qualityBuckets.low} (${(qualityBuckets.low/allListings.length*100).toFixed(1)}%)`);
      
      // Field completeness
      fieldStats = {
        title: allListings.filter(l => l.title && l.title !== 'Untitled Business').length,
        price: allListings.filter(l => l.price > 0).length,
        category: allListings.filter(l => l.category).length,
        propertyType: allListings.filter(l => l.property_type).length,
        revenue: allListings.filter(l => l.revenue_average > 0).length,
        profit: allListings.filter(l => l.profit_average > 0).length,
        multiple: allListings.filter(l => l.multiple > 0).length,
        url: allListings.filter(l => l.listing_url && l.listing_url.includes('flippa.com')).length
      };
      
      console.log('\n📊 Field Extraction Rates:');
      Object.entries(fieldStats).forEach(([field, count]) => {
        const rate = (count / allListings.length * 100).toFixed(1);
        const status = rate >= 80 ? '✅' : rate >= 50 ? '⚠️' : '❌';
        console.log(`${status} ${field}: ${count}/${allListings.length} (${rate}%)`);
      });
      
      // Title quality check
      const titleQuality = allListings.slice(0, 5).map(l => ({
        id: l.id,
        title: l.title,
        hasGoodTitle: l.title && !l.title.match(/confidential|untitled|business #/i)
      }));
      
      console.log('\n📝 Sample Titles (First 5):');
      titleQuality.forEach((t, i) => {
        console.log(`${i+1}. [${t.id}] ${t.hasGoodTitle ? '✅' : '❌'} "${t.title}"`);
      });
      
      // Financial data quality
      const withFinancials = allListings.filter(l => 
        l.revenue_average > 0 || l.profit_average > 0 || l.multiple > 0
      );
      
      console.log('\n💰 Financial Data Quality:');
      console.log(`- With Any Financial Data: ${withFinancials.length} (${(withFinancials.length/allListings.length*100).toFixed(1)}%)`);
      if (withFinancials.length > 0) {
        const avgRevenue = withFinancials
          .filter(l => l.revenue_average > 0)
          .reduce((sum, l) => sum + l.revenue_average, 0) / withFinancials.length;
        console.log(`- Average Revenue: $${avgRevenue.toFixed(0)}`);
      }
    }
    
    // Get final performance report
    const performance = scraper.getPerformanceReport();
    console.log('\n📈 Final Performance Report:');
    console.log(`- Success Rate: ${performance.successRate}`);
    console.log(`- Average Quality Score: ${performance.averageQuality}`);
    console.log(`- Average Processing Time: ${performance.averageProcessingTime}`);
    console.log(`- Extraction Rate: ${performance.extractionRate} listings/attempt`);
    console.log(`- Meets Apify Standard (95%+): ${performance.meetsApifyStandard ? '✅ YES' : '❌ NO'}`);
    
    // Recommendations
    console.log('\n💡 Optimization Recommendations:');
    const recommendations = [];
    
    if (parseFloat(performance.successRate) < 95) {
      recommendations.push('- Increase listing detection by analyzing page structure');
    }
    if (parseFloat(performance.averageQuality) < 85) {
      recommendations.push('- Improve field extraction patterns and selectors');
    }
    if (allListings.length < 60) { // 3 pages × 20 expected
      recommendations.push('- Enhance listing element selectors to capture more items');
    }
    if (allListings.length > 0) {
      const revenueRate = allListings.filter(l => l.revenue_average > 0).length / allListings.length;
      if (revenueRate < 0.5) {
        recommendations.push('- Improve financial data extraction patterns');
      }
      const titleRate = allListings.filter(l => l.title && !l.title.match(/Business #/)).length / allListings.length;
      if (titleRate < 0.8) {
        recommendations.push('- Enhance title extraction to avoid confidential/placeholder text');
      }
    }
    
    if (recommendations.length > 0) {
      recommendations.forEach(r => console.log(r));
    } else {
      console.log('✅ Scraper meets Apify standard!');
    }
    
    // Save detailed results
    const fs = require('fs').promises;
    const results = {
      timestamp: new Date().toISOString(),
      configuration: scraper.config,
      testResults,
      listings: allListings.slice(0, 10), // Save first 10 for analysis
      performance,
      fieldStats: allListings.length > 0 ? fieldStats : {},
      recommendations
    };
    
    await fs.writeFile(
      'test-optimization-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Detailed results saved to test-optimization-results.json');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the optimization test
testFlippaOptimization().catch(console.error);