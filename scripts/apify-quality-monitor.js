/**
 * Apify Quality Monitor
 * Monitors extraction quality and compares to Apify standards
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function monitorApifyQuality() {
  console.log('📊 APIFY QUALITY MONITORING SYSTEM');
  console.log('🎯 Comparing our extraction to Apify standards');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Get all listings
  console.log('📋 Fetching listings from database...');
  const { data: listings, error } = await supabase
    .from('flippa_listings')
    .select('*');
  
  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }
  
  console.log(`✅ Found ${listings.length} listings\n`);
  
  // Calculate quality metrics
  const apifyQualityMetrics = {
    totalListings: listings.length,
    titleQuality: listings.filter(l => l.title && l.title.length > 10).length,
    priceQuality: listings.filter(l => l.price && l.price > 0).length,
    urlQuality: listings.filter(l => l.url && l.url.includes('flippa.com')).length,
    revenueQuality: listings.filter(l => l.monthly_revenue !== null && l.monthly_revenue !== undefined).length,
    multipleQuality: listings.filter(l => l.multiple !== null && l.multiple > 0).length,
    hasRawData: listings.filter(l => l.raw_data).length,
    apifyDataRichness: 0
  };
  
  // Calculate percentages
  const rates = {
    title: (apifyQualityMetrics.titleQuality / apifyQualityMetrics.totalListings * 100).toFixed(1),
    price: (apifyQualityMetrics.priceQuality / apifyQualityMetrics.totalListings * 100).toFixed(1),
    url: (apifyQualityMetrics.urlQuality / apifyQualityMetrics.totalListings * 100).toFixed(1),
    revenue: (apifyQualityMetrics.revenueQuality / apifyQualityMetrics.totalListings * 100).toFixed(1),
    multiple: (apifyQualityMetrics.multipleQuality / apifyQualityMetrics.totalListings * 100).toFixed(1),
    rawData: (apifyQualityMetrics.hasRawData / apifyQualityMetrics.totalListings * 100).toFixed(1)
  };
  
  // Check Apify-level fields in raw_data
  let totalApifyFields = 0;
  let listingsWithApifyData = 0;
  
  listings.forEach(listing => {
    if (listing.raw_data) {
      try {
        const rawData = typeof listing.raw_data === 'string' ? 
          JSON.parse(listing.raw_data) : listing.raw_data;
        
        const apifyFields = rawData.apify_fields || rawData;
        const fieldCount = Object.keys(apifyFields).filter(k => 
          apifyFields[k] !== null && 
          apifyFields[k] !== undefined &&
          !k.startsWith('_')
        ).length;
        
        if (fieldCount > 10) {
          listingsWithApifyData++;
          totalApifyFields += fieldCount;
        }
      } catch (e) {
        // Parsing error
      }
    }
  });
  
  const avgApifyFields = listingsWithApifyData > 0 ? 
    (totalApifyFields / listingsWithApifyData).toFixed(1) : 0;
  
  apifyQualityMetrics.apifyDataRichness = 
    (listingsWithApifyData / apifyQualityMetrics.totalListings * 100).toFixed(1);
  
  console.log('📊 APIFY QUALITY COMPARISON:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Total Listings: ${apifyQualityMetrics.totalListings.toLocaleString()} (Apify: 5,635)`);
  console.log('');
  console.log('📈 FIELD EXTRACTION RATES:');
  console.log(`   📝 Title Quality: ${rates.title}% (Apify: 100%) ${parseFloat(rates.title) >= 90 ? '✅' : '❌'}`);
  console.log(`   💰 Price Quality: ${rates.price}% (Apify: 100%) ${parseFloat(rates.price) >= 95 ? '✅' : '❌'}`);
  console.log(`   🔗 URL Quality: ${rates.url}% (Apify: 100%) ${parseFloat(rates.url) >= 95 ? '✅' : '❌'}`);
  console.log(`   📈 Revenue Quality: ${rates.revenue}% (Apify: ~95%) ${parseFloat(rates.revenue) >= 80 ? '✅' : '❌'}`);
  console.log(`   📊 Multiple Quality: ${rates.multiple}% (Apify: ~90%) ${parseFloat(rates.multiple) >= 75 ? '✅' : '❌'}`);
  console.log('');
  console.log('🎯 DATA RICHNESS:');
  console.log(`   📁 Has Raw Data: ${rates.rawData}%`);
  console.log(`   🌟 Apify-Level Data: ${apifyQualityMetrics.apifyDataRichness}%`);
  console.log(`   📊 Avg Fields/Listing: ${avgApifyFields} (Apify: 75)`);
  
  // Calculate overall score
  const criticalFields = [
    parseFloat(rates.title),
    parseFloat(rates.price),
    parseFloat(rates.url),
    parseFloat(rates.revenue),
    parseFloat(rates.multiple)
  ];
  
  const overallScore = criticalFields.reduce((a, b) => a + b, 0) / criticalFields.length;
  
  console.log('');
  console.log('🏆 OVERALL QUALITY SCORE:');
  console.log(`   Score: ${overallScore.toFixed(1)}% (Target: 90%+)`);
  console.log(`   Grade: ${getGrade(overallScore)}`);
  
  // Sample data analysis
  console.log('\n📋 SAMPLE DATA ANALYSIS:');
  const samples = listings.slice(0, 3);
  
  samples.forEach((listing, index) => {
    console.log(`\nSample ${index + 1}:`);
    console.log(`   ID: ${listing.listing_id || '❌ Missing'}`);
    console.log(`   Title: ${listing.title ? listing.title.substring(0, 50) + '...' : '❌ Missing'}`);
    console.log(`   Price: ${listing.price ? '$' + listing.price.toLocaleString() : '❌ Missing'}`);
    console.log(`   Revenue: ${listing.monthly_revenue ? '$' + listing.monthly_revenue.toLocaleString() + '/mo' : '❌ Missing'}`);
    console.log(`   Multiple: ${listing.multiple ? listing.multiple + 'x' : '❌ Missing'}`);
    console.log(`   URL: ${listing.url || '❌ Missing'}`);
    
    // Check for Apify fields
    if (listing.raw_data) {
      try {
        const rawData = typeof listing.raw_data === 'string' ? 
          JSON.parse(listing.raw_data) : listing.raw_data;
        
        const apifyFields = rawData.apify_fields || {};
        const extraFields = Object.keys(apifyFields).filter(k => apifyFields[k]).length;
        
        if (extraFields > 0) {
          console.log(`   🌟 Apify Fields: ${extraFields} additional fields`);
        }
      } catch (e) {}
    }
  });
  
  // Recommendations
  if (overallScore < 90) {
    console.log('\n💡 RECOMMENDATIONS TO ACHIEVE APIFY QUALITY:');
    
    if (parseFloat(rates.title) < 90) {
      console.log('   ❗ Title extraction needs improvement');
      console.log('      - Inspect actual Flippa HTML structure');
      console.log('      - Update selectors to match current markup');
    }
    
    if (parseFloat(rates.url) < 95) {
      console.log('   ❗ URL extraction critical failure');
      console.log('      - Ensure all listings have proper Flippa URLs');
      console.log('      - Format: https://flippa.com/[listing-id]');
    }
    
    if (parseFloat(rates.price) < 95) {
      console.log('   ❗ Price extraction below target');
      console.log('      - Add more price pattern variations');
      console.log('      - Handle different currency formats');
    }
    
    if (avgApifyFields < 50) {
      console.log('   ❗ Data richness insufficient');
      console.log('      - Extract more fields per listing');
      console.log('      - Target 75 fields like Apify');
    }
  } else {
    console.log('\n✅ APIFY-LEVEL QUALITY ACHIEVED!');
  }
  
  return {
    metrics: apifyQualityMetrics,
    rates,
    overallScore,
    avgApifyFields
  };
}

function getGrade(score) {
  if (score >= 95) return '🌟 A+ (Apify Level)';
  if (score >= 90) return '✅ A (Excellent)';
  if (score >= 80) return '👍 B (Good)';
  if (score >= 70) return '⚠️ C (Needs Improvement)';
  if (score >= 60) return '❌ D (Poor)';
  return '💀 F (Critical Failure)';
}

// Execute monitoring
if (require.main === module) {
  monitorApifyQuality().catch(console.error);
}

module.exports = { monitorApifyQuality };