// Test script for the insight-driven Flippa scraper
require('dotenv').config({ path: '.env.local' });
const InsightDrivenFlippaScraper = require('./flippa-scraper-insight-driven');
const fs = require('fs').promises;
const path = require('path');

async function testInsightDrivenScraper() {
  console.log('🧪 Testing Insight-Driven Flippa Scraper');
  console.log('=' .repeat(60));
  
  const scraper = new InsightDrivenFlippaScraper({
    headless: false, // Visual testing
    insightMode: true,
    maxConcurrent: 3
  });
  
  try {
    // Test 1: Initialize scraper
    console.log('\n📊 Test 1: Initializing scraper with insights...');
    await scraper.initialize();
    console.log('✅ Scraper initialized successfully');
    
    // Test 2: Scrape with insights (limited for testing)
    console.log('\n📊 Test 2: Running insight-driven scraping...');
    const startTime = Date.now();
    
    const listings = await scraper.scrapeWithInsights('https://flippa.com/search', {
      maxPages: 2, // Limited for testing
      filterRecentlySold: true,
      sortBy: 'newest'
    });
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Scraped ${listings.length} listings in ${duration.toFixed(1)}s`);
    
    // Test 3: Analyze results
    console.log('\n📊 Test 3: Analyzing extraction quality...');
    analyzeResults(listings);
    
    // Test 4: Compare with baseline
    console.log('\n📊 Test 4: Comparing with baseline metrics...');
    compareWithBaseline(scraper, listings);
    
    // Test 5: Check improvement suggestions
    console.log('\n📊 Test 5: Reviewing improvement suggestions...');
    checkImprovements(listings);
    
    // Test 6: Save test results
    console.log('\n📊 Test 6: Saving test results...');
    await saveTestResults(listings);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await scraper.close();
  }
}

function analyzeResults(listings) {
  console.log(`\n📈 Results Analysis:`);
  console.log(`Total listings: ${listings.length}`);
  
  // Quality distribution
  const highQuality = listings.filter(l => l._quality_score >= 70).length;
  const mediumQuality = listings.filter(l => l._quality_score >= 40 && l._quality_score < 70).length;
  const lowQuality = listings.filter(l => l._quality_score < 40).length;
  
  console.log(`\nQuality Distribution:`);
  console.log(`- High Quality (70+): ${highQuality} (${(highQuality/listings.length*100).toFixed(1)}%)`);
  console.log(`- Medium Quality (40-69): ${mediumQuality} (${(mediumQuality/listings.length*100).toFixed(1)}%)`);
  console.log(`- Low Quality (<40): ${lowQuality} (${(lowQuality/listings.length*100).toFixed(1)}%)`);
  
  // Field completeness
  const withRevenue = listings.filter(l => l.revenue_average > 0).length;
  const withProfit = listings.filter(l => l.profit_average > 0).length;
  const verified = listings.filter(l => l.has_verified_traffic || l.has_verified_revenue).length;
  
  console.log(`\nField Completeness:`);
  console.log(`- With Revenue: ${withRevenue} (${(withRevenue/listings.length*100).toFixed(1)}%)`);
  console.log(`- With Profit: ${withProfit} (${(withProfit/listings.length*100).toFixed(1)}%)`);
  console.log(`- Verified: ${verified} (${(verified/listings.length*100).toFixed(1)}%)`);
  
  // Category distribution
  const categories = {};
  listings.forEach(l => {
    if (l.category) categories[l.category] = (categories[l.category] || 0) + 1;
  });
  
  console.log(`\nTop Categories:`);
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([cat, count]) => {
      console.log(`- ${cat}: ${count} (${(count/listings.length*100).toFixed(1)}%)`);
    });
    
  // Sample high-quality listing
  const bestListing = listings.sort((a, b) => b._quality_score - a._quality_score)[0];
  if (bestListing) {
    console.log(`\n🌟 Best Quality Listing:`);
    console.log(`- Title: ${bestListing.title}`);
    console.log(`- Price: $${bestListing.price?.toLocaleString() || 'N/A'}`);
    console.log(`- Category: ${bestListing.category}`);
    console.log(`- Quality Score: ${bestListing._quality_score}`);
    console.log(`- Verified: ${bestListing.has_verified_traffic ? 'Traffic' : ''} ${bestListing.has_verified_revenue ? 'Revenue' : ''}`);
  }
}

function compareWithBaseline(scraper, listings) {
  const baseline = scraper.baseline;
  
  console.log(`\n📊 Baseline Comparison:`);
  
  // Data completeness
  const currentCompleteness = (listings.filter(l => l._quality_score >= 60).length / listings.length * 100);
  console.log(`\nData Completeness:`);
  console.log(`- Baseline: ${baseline.dataCompleteness}%`);
  console.log(`- Current: ${currentCompleteness.toFixed(1)}%`);
  console.log(`- Difference: ${(currentCompleteness - baseline.dataCompleteness).toFixed(1)}%`);
  
  // Revenue data availability
  const revenueAvailable = (listings.filter(l => l.revenue_average > 0).length / listings.length * 100);
  console.log(`\nRevenue Data:`);
  console.log(`- Baseline: ${baseline.revenueDataAvailable}%`);
  console.log(`- Current: ${revenueAvailable.toFixed(1)}%`);
  console.log(`- Difference: ${(revenueAvailable - baseline.revenueDataAvailable).toFixed(1)}%`);
  
  // Verification rates
  const verifiedRate = (listings.filter(l => l.has_verified_traffic || l.has_verified_revenue).length / listings.length * 100);
  console.log(`\nVerification Rate:`);
  console.log(`- Baseline (Traffic): ${baseline.verifiedTrafficRate}%`);
  console.log(`- Current (Any): ${verifiedRate.toFixed(1)}%`);
}

function checkImprovements(listings) {
  console.log(`\n🔧 Improvement Analysis:`);
  
  // Common issues
  const issues = {
    missingTitle: 0,
    placeholderTitle: 0,
    missingRevenue: 0,
    missingCategory: 0,
    lowQuality: 0
  };
  
  listings.forEach(listing => {
    if (!listing.title) issues.missingTitle++;
    if (listing.title === 'Extracted title') issues.placeholderTitle++;
    if (!listing.revenue_average && listing.price > 10000) issues.missingRevenue++;
    if (!listing.category) issues.missingCategory++;
    if (listing._quality_score < 40) issues.lowQuality++;
  });
  
  console.log(`\nCommon Issues Found:`);
  Object.entries(issues).forEach(([issue, count]) => {
    if (count > 0) {
      const percentage = (count / listings.length * 100).toFixed(1);
      console.log(`- ${issue}: ${count} listings (${percentage}%)`);
    }
  });
  
  // Improvement suggestions from listings
  const allSuggestions = {};
  listings.forEach(listing => {
    if (listing._insights?.improvement_suggestions) {
      listing._insights.improvement_suggestions.forEach(suggestion => {
        const key = `${suggestion.field}_${suggestion.priority}`;
        allSuggestions[key] = (allSuggestions[key] || 0) + 1;
      });
    }
  });
  
  if (Object.keys(allSuggestions).length > 0) {
    console.log(`\nTop Improvement Suggestions:`);
    Object.entries(allSuggestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([suggestion, count]) => {
        console.log(`- ${suggestion}: ${count} occurrences`);
      });
  }
}

async function saveTestResults(listings) {
  const timestamp = Date.now();
  const resultsDir = path.join('data', 'test-results');
  
  try {
    await fs.mkdir(resultsDir, { recursive: true });
    
    // Save full results
    const fullPath = path.join(resultsDir, `insight-test-full-${timestamp}.json`);
    await fs.writeFile(fullPath, JSON.stringify(listings, null, 2));
    console.log(`✅ Full results saved to: ${fullPath}`);
    
    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      total_listings: listings.length,
      avg_quality: listings.reduce((sum, l) => sum + l._quality_score, 0) / listings.length,
      high_quality_rate: (listings.filter(l => l._quality_score >= 70).length / listings.length * 100).toFixed(1),
      revenue_data_rate: (listings.filter(l => l.revenue_average > 0).length / listings.length * 100).toFixed(1),
      verified_rate: (listings.filter(l => l.has_verified_traffic || l.has_verified_revenue).length / listings.length * 100).toFixed(1),
      categories: [...new Set(listings.map(l => l.category).filter(Boolean))],
      top_issues: getTopIssues(listings)
    };
    
    const summaryPath = path.join(resultsDir, `insight-test-summary-${timestamp}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.error('Failed to save test results:', error);
  }
}

function getTopIssues(listings) {
  const issues = {};
  
  listings.forEach(listing => {
    if (listing._warnings) {
      listing._warnings.forEach(warning => {
        issues[warning] = (issues[warning] || 0) + 1;
      });
    }
    if (listing._errors) {
      listing._errors.forEach(error => {
        issues[error] = (issues[error] || 0) + 1;
      });
    }
  });
  
  return Object.entries(issues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
}

// Run the test
testInsightDrivenScraper().catch(console.error);