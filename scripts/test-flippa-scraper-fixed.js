// Test script for the fixed Flippa scraper engine
require('dotenv').config({ path: '.env.local' });
const FlippaScraperEngine = require('./flippa-scraper-engine');

async function testFlippaScraperFixed() {
  console.log('🧪 Testing Fixed Flippa Scraper Engine');
  console.log('='.repeat(60));
  
  const scraper = new FlippaScraperEngine({
    headless: false, // Set to true for production
    maxRetries: 3,
    timeout: 60000,
    qualityThreshold: 30 // Lower threshold for testing
  });
  
  try {
    // Test URL with Recently Sold filter already applied
    const testUrl = 'https://flippa.com/search?filter[status][]=sold';
    
    console.log('\n📊 Test Configuration:');
    console.log(`- URL: ${testUrl}`);
    console.log(`- Quality Threshold: ${scraper.config.qualityThreshold}`);
    console.log(`- Timeout: ${scraper.config.timeout}ms`);
    
    console.log('\n🚀 Starting scraping test...');
    const startTime = Date.now();
    
    const listings = await scraper.scrapeWithApifyMethodology(testUrl, {
      filterRecentlySold: true,
      maxPages: 1
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Scraping completed successfully!');
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Listings extracted: ${listings.length}`);
    
    if (listings.length > 0) {
      console.log('\n📋 Sample Listing:');
      const sample = listings[0];
      console.log(`- ID: ${sample.id}`);
      console.log(`- Title: ${sample.title}`);
      console.log(`- Price: $${sample.price?.toLocaleString() || 'N/A'}`);
      console.log(`- Category: ${sample.category || 'N/A'}`);
      console.log(`- Property Type: ${sample.property_type || 'N/A'}`);
      console.log(`- Status: ${sample.status || 'N/A'}`);
      console.log(`- Quality Score: ${sample._qualityScore}`);
      console.log(`- Extraction Confidence: ${sample._extractionConfidence}`);
      console.log(`- URL: ${sample.listing_url}`);
      
      // Show quality distribution
      const highQuality = listings.filter(l => l._qualityScore >= 70).length;
      const mediumQuality = listings.filter(l => l._qualityScore >= 40 && l._qualityScore < 70).length;
      const lowQuality = listings.filter(l => l._qualityScore < 40).length;
      
      console.log('\n📊 Quality Distribution:');
      console.log(`- High (70+): ${highQuality} (${(highQuality/listings.length*100).toFixed(1)}%)`);
      console.log(`- Medium (40-69): ${mediumQuality} (${(mediumQuality/listings.length*100).toFixed(1)}%)`);
      console.log(`- Low (<40): ${lowQuality} (${(lowQuality/listings.length*100).toFixed(1)}%)`);
      
      // Show field completeness
      const withRevenue = listings.filter(l => l.revenue_average > 0).length;
      const withProfit = listings.filter(l => l.profit_average > 0).length;
      const withCategory = listings.filter(l => l.category).length;
      const withType = listings.filter(l => l.property_type).length;
      
      console.log('\n📊 Field Completeness:');
      console.log(`- With Revenue: ${withRevenue} (${(withRevenue/listings.length*100).toFixed(1)}%)`);
      console.log(`- With Profit: ${withProfit} (${(withProfit/listings.length*100).toFixed(1)}%)`);
      console.log(`- With Category: ${withCategory} (${(withCategory/listings.length*100).toFixed(1)}%)`);
      console.log(`- With Type: ${withType} (${(withType/listings.length*100).toFixed(1)}%)`);
    }
    
    // Get performance report
    const performance = scraper.getPerformanceReport();
    console.log('\n📈 Performance Report:');
    console.log(`- Success Rate: ${performance.successRate}`);
    console.log(`- Average Quality: ${performance.averageQuality}`);
    console.log(`- Average Processing Time: ${performance.averageProcessingTime}`);
    console.log(`- Meets Apify Standard: ${performance.meetsApifyStandard ? '✅ YES' : '❌ NO'}`);
    
    // Save results for analysis
    const fs = require('fs').promises;
    await fs.writeFile(
      'test-results-fixed.json',
      JSON.stringify({ listings, performance, duration }, null, 2)
    );
    console.log('\n💾 Results saved to test-results-fixed.json');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testFlippaScraperFixed().catch(console.error);