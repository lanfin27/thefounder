// scripts/check-current-extraction-rates.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkCurrentRates() {
  console.log('📊 CHECKING CURRENT EXTRACTION RATES');
  console.log('=' .repeat(60));
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Get all listings
  const { data: listings, error } = await supabase
    .from('flippa_listings')
    .select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📋 Total listings in database: ${listings.length}`);
  
  // Calculate extraction rates
  const stats = {
    title: listings.filter(l => l.title && l.title.length > 0).length,
    price: listings.filter(l => l.price && l.price > 0).length,
    revenue: listings.filter(l => l.monthly_revenue && l.monthly_revenue > 0).length,
    profit: listings.filter(l => l.monthly_profit && l.monthly_profit > 0).length,
    multiple: listings.filter(l => l.multiple && l.multiple > 0).length,
    url: listings.filter(l => l.url && l.url.length > 0).length,
    category: listings.filter(l => l.category && l.category.length > 0).length
  };
  
  console.log('\n📈 EXTRACTION RATES:');
  Object.entries(stats).forEach(([field, count]) => {
    const rate = ((count / listings.length) * 100).toFixed(1);
    const status = rate >= 70 ? '✅' : rate >= 40 ? '⚠️' : '❌';
    console.log(`   ${status} ${field}: ${rate}% (${count}/${listings.length})`);
  });
  
  // Show sample listings
  console.log('\n📝 SAMPLE LISTINGS:');
  listings.slice(0, 3).forEach((listing, i) => {
    console.log(`\n   Listing ${i + 1}:`);
    console.log(`   - ID: ${listing.listing_id}`);
    console.log(`   - Title: ${listing.title || 'N/A'}`);
    console.log(`   - Price: ${listing.price ? '$' + listing.price.toLocaleString() : 'N/A'}`);
    console.log(`   - Revenue: ${listing.monthly_revenue ? '$' + listing.monthly_revenue.toLocaleString() : 'N/A'}`);
    console.log(`   - Multiple: ${listing.multiple || 'N/A'}`);
    console.log(`   - URL: ${listing.url || 'N/A'}`);
  });
  
  // Check data sources
  const sources = {};
  listings.forEach(listing => {
    const source = listing.raw_data?.source || 'unknown';
    sources[source] = (sources[source] || 0) + 1;
  });
  
  console.log('\n📊 DATA SOURCES:');
  Object.entries(sources).forEach(([source, count]) => {
    console.log(`   ${source}: ${count} listings`);
  });
}

checkCurrentRates().catch(console.error);