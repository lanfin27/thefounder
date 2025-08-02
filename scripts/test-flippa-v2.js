// Test script for Flippa Scraper Engine V2
require('dotenv').config({ path: '.env.local' });
const FlippaScraperEngineV2 = require('./flippa-scraper-engine-v2');

async function testFlippaV2() {
  console.log('🚀 Testing Flippa Scraper Engine V2 - Targeting 95%+ Success Rate');
  console.log('='.repeat(70));
  
  const scraper = new FlippaScraperEngineV2({
    headless: false, // Set to true for production
    maxRetries: 3,
    timeout: 120000,
    qualityThreshold: 40
  });
  
  try {
    // Test with website property type filter
    const testUrl = 'https://flippa.com/search?filter[property_type][]=website';
    
    console.log('\n📊 Test Configuration:');
    console.log(`- URL: ${testUrl}`);
    console.log(`- Quality Threshold: ${scraper.config.qualityThreshold}`);
    console.log(`- Target Success Rate: ${scraper.config.targetSuccessRate}%`);
    
    console.log('\n🔍 Starting extraction...');
    const startTime = Date.now();
    
    const listings = await scraper.scrapeWithOptimizedApproach(testUrl, {
      applyFilters: false
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Extraction completed!');
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Listings extracted: ${listings.length}`);
    
    // Initialize fieldStats outside if block
    let fieldStats = {};
    let qualityBuckets = {};
    
    if (listings.length > 0) {
      // Show first 3 listings in detail
      console.log('\n📋 Sample Listings:');
      listings.slice(0, 3).forEach((listing, i) => {
        console.log(`\n--- Listing ${i + 1} ---`);
        console.log(`ID: ${listing.id}`);
        console.log(`Title: ${listing.title}`);
        console.log(`Price: $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`Monthly Profit: $${listing.profit_average?.toLocaleString() || 'N/A'}`);
        console.log(`Category: ${listing.category || 'N/A'}`);
        console.log(`Type: ${listing.property_type || 'N/A'}`);
        console.log(`Location: ${listing.country_name || 'N/A'}`);
        console.log(`Multiple: ${listing.multiple || listing.profit_multiple || 'N/A'}x`);
        console.log(`Verified: ${listing.manually_vetted ? '✅' : '❌'}`);
        console.log(`Quality Score: ${listing._qualityScore}`);
        console.log(`URL: ${listing.listing_url}`);
      });
      
      // Field extraction analysis
      fieldStats = {
        withTitle: listings.filter(l => l.title && !l.title.includes('Listing #')).length,
        withPrice: listings.filter(l => l.price > 0).length,
        withProfit: listings.filter(l => l.profit_average > 0).length,
        withRevenue: listings.filter(l => l.revenue_average > 0).length,
        withCategory: listings.filter(l => l.category).length,
        withType: listings.filter(l => l.property_type).length,
        withLocation: listings.filter(l => l.country_name).length,
        withMultiple: listings.filter(l => l.multiple || l.profit_multiple).length,
        verified: listings.filter(l => l.manually_vetted || l.has_verified_revenue).length
      };
      
      console.log('\n📊 Field Extraction Rates:');
      Object.entries(fieldStats).forEach(([field, count]) => {
        const rate = (count / listings.length * 100).toFixed(1);
        const status = rate >= 80 ? '✅' : rate >= 50 ? '⚠️' : '❌';
        console.log(`${status} ${field}: ${count}/${listings.length} (${rate}%)`);
      });
      
      // Quality distribution
      qualityBuckets = {
        excellent: listings.filter(l => l._qualityScore >= 80).length,
        good: listings.filter(l => l._qualityScore >= 60 && l._qualityScore < 80).length,
        fair: listings.filter(l => l._qualityScore >= 40 && l._qualityScore < 60).length,
        poor: listings.filter(l => l._qualityScore < 40).length
      };
      
      console.log('\n📊 Quality Distribution:');
      console.log(`- Excellent (80+): ${qualityBuckets.excellent} (${(qualityBuckets.excellent/listings.length*100).toFixed(1)}%)`);
      console.log(`- Good (60-79): ${qualityBuckets.good} (${(qualityBuckets.good/listings.length*100).toFixed(1)}%)`);
      console.log(`- Fair (40-59): ${qualityBuckets.fair} (${(qualityBuckets.fair/listings.length*100).toFixed(1)}%)`);
      console.log(`- Poor (<40): ${qualityBuckets.poor} (${(qualityBuckets.poor/listings.length*100).toFixed(1)}%)`);
    }
    
    // Performance report
    const performance = scraper.getPerformanceReport();
    console.log('\n📈 Performance Report:');
    console.log(`- Success Rate: ${performance.successRate}`);
    console.log(`- Average Quality: ${performance.averageQuality}`);
    console.log(`- Processing Time: ${performance.averageProcessingTime}`);
    console.log(`- Extraction Rate: ${performance.extractionRate} listings/attempt`);
    console.log(`- Meets Apify Standard (95%+): ${performance.meetsApifyStandard ? '✅ YES' : '❌ NO'}`);
    
    // Save results
    const fs = require('fs').promises;
    const results = {
      timestamp: new Date().toISOString(),
      config: scraper.config,
      listings: listings.slice(0, 10), // Save first 10
      fieldStats,
      qualityBuckets,
      performance,
      duration
    };
    
    await fs.writeFile(
      'test-v2-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Results saved to test-v2-results.json');
    
    // Success criteria check
    console.log('\n🎯 Success Criteria Check:');
    const criteria = {
      'Extraction Volume (25 listings)': listings.length >= 25,
      'Success Rate (95%+)': parseFloat(performance.successRate) >= 95,
      'Quality Score (80+)': parseFloat(performance.averageQuality) >= 80,
      'Title Extraction (80%+)': listings.length > 0 ? fieldStats.withTitle / listings.length >= 0.8 : false,
      'Financial Data (50%+)': listings.length > 0 ? (fieldStats.withProfit + fieldStats.withRevenue) / (listings.length * 2) >= 0.5 : false
    };
    
    Object.entries(criteria).forEach(([criterion, met]) => {
      console.log(`${met ? '✅' : '❌'} ${criterion}`);
    });
    
    const allMet = Object.values(criteria).every(v => v);
    console.log(`\n${allMet ? '🎉 ALL CRITERIA MET!' : '⚠️ Some criteria not met, further optimization needed'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testFlippaV2().catch(console.error);