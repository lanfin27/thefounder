/**
 * Validate Collection Quality
 * Checks the quality of collected data against targets
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function validateQuality() {
  console.log('📊 COLLECTION QUALITY VALIDATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Fetch all listings
  console.log('📋 Fetching listings from database...');
  const { data: listings, error } = await supabase
    .from('flippa_listings')
    .select('*');
  
  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }
  
  console.log(`✅ Found ${listings.length} listings in database\n`);
  
  // Calculate metrics
  const metrics = {
    total: listings.length,
    withTitle: listings.filter(l => l.title && l.title.length > 3).length,
    withPrice: listings.filter(l => l.price && l.price > 0).length,
    withRevenue: listings.filter(l => (l.monthly_revenue && l.monthly_revenue > 0) || (l.monthly_profit && l.monthly_profit > 0)).length,
    withMultiple: listings.filter(l => l.multiple && l.multiple > 0).length,
    withUrl: listings.filter(l => l.url && l.url.includes('flippa.com')).length,
    withCategory: listings.filter(l => l.category || l.property_type).length
  };
  
  const rates = {
    title: (metrics.withTitle / metrics.total * 100).toFixed(1),
    price: (metrics.withPrice / metrics.total * 100).toFixed(1),
    revenue: (metrics.withRevenue / metrics.total * 100).toFixed(1),
    multiple: (metrics.withMultiple / metrics.total * 100).toFixed(1),
    url: (metrics.withUrl / metrics.total * 100).toFixed(1),
    category: (metrics.withCategory / metrics.total * 100).toFixed(1)
  };
  
  // Coverage calculation (assuming 5,900 marketplace size)
  const marketplaceSize = 5900;
  const coverage = (metrics.total / marketplaceSize * 100).toFixed(1);
  
  console.log('📊 COLLECTION QUALITY REPORT:');
  console.log(`   📋 Total Listings: ${metrics.total.toLocaleString()} (${coverage}% of ${marketplaceSize.toLocaleString()})`);
  console.log('');
  console.log('📈 EXTRACTION RATES:');
  console.log(`   📋 Title Rate: ${rates.title}% (Target: 90%+) ${parseFloat(rates.title) >= 90 ? '✅' : '❌'}`);
  console.log(`   💰 Price Rate: ${rates.price}% (Target: 95%+) ${parseFloat(rates.price) >= 95 ? '✅' : '❌'}`);
  console.log(`   📈 Revenue Rate: ${rates.revenue}% (Target: 80%+) ${parseFloat(rates.revenue) >= 80 ? '✅' : '❌'}`);
  console.log(`   📊 Multiple Rate: ${rates.multiple}% (Target: 75%+) ${parseFloat(rates.multiple) >= 75 ? '✅' : '❌'}`);
  console.log(`   🔗 URL Rate: ${rates.url}% (Target: 100%) ${parseFloat(rates.url) >= 100 ? '✅' : '❌'}`);
  console.log(`   🏷️ Category Rate: ${rates.category}%`);
  console.log('');
  
  // Target analysis
  const targets = {
    coverage: parseFloat(coverage) >= 90,
    title: parseFloat(rates.title) >= 90,
    price: parseFloat(rates.price) >= 95,
    revenue: parseFloat(rates.revenue) >= 80,
    multiple: parseFloat(rates.multiple) >= 75
  };
  
  const targetsMetCount = Object.values(targets).filter(Boolean).length;
  const success = targetsMetCount >= 4;
  
  console.log('🎯 TARGET ANALYSIS:');
  console.log(`   Coverage (90%+): ${targets.coverage ? '✅' : '❌'} ${coverage}%`);
  console.log(`   Title (90%+): ${targets.title ? '✅' : '❌'} ${rates.title}%`);
  console.log(`   Price (95%+): ${targets.price ? '✅' : '❌'} ${rates.price}%`);
  console.log(`   Revenue (80%+): ${targets.revenue ? '✅' : '❌'} ${rates.revenue}%`);
  console.log(`   Multiple (75%+): ${targets.multiple ? '✅' : '❌'} ${rates.multiple}%`);
  console.log('');
  console.log(`📊 Targets Met: ${targetsMetCount}/5`);
  console.log(`🎯 QUALITY STATUS: ${success ? '✅ SUCCESS - HIGH QUALITY' : '❌ NEEDS IMPROVEMENT'}`);
  
  // Sample analysis
  console.log('\n📋 SAMPLE DATA ANALYSIS:');
  const samples = listings.slice(0, 5);
  samples.forEach((listing, index) => {
    console.log(`\nSample ${index + 1}:`);
    console.log(`   Title: ${listing.title || '❌ Missing'}`);
    console.log(`   Price: ${listing.price ? '$' + listing.price.toLocaleString() : '❌ Missing'}`);
    console.log(`   Revenue: ${listing.monthly_revenue ? '$' + listing.monthly_revenue.toLocaleString() + '/mo' : '❌ Missing'}`);
    console.log(`   Multiple: ${listing.multiple ? listing.multiple + 'x' : '❌ Missing'}`);
    console.log(`   URL: ${listing.url ? '✅ Present' : '❌ Missing'}`);
  });
  
  // Recommendations
  if (!success) {
    console.log('\n💡 RECOMMENDATIONS:');
    if (!targets.coverage) {
      console.log('   - Run additional collection strategies to reach 90% coverage');
    }
    if (!targets.title) {
      console.log('   - Improve title extraction selectors and patterns');
    }
    if (!targets.revenue) {
      console.log('   - Enhance revenue detection patterns');
    }
    if (!targets.multiple) {
      console.log('   - Add more multiple extraction patterns');
    }
  }
  
  return { metrics, rates, targets, success };
}

// Execute validation
if (require.main === module) {
  validateQuality().catch(console.error);
}

module.exports = { validateQuality };