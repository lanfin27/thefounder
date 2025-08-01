// Analyze Flippa listings with focus on multiples and comprehensive data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeMultiples() {
  console.log('📊 Flippa Listings Analysis - Multiples & Comprehensive Data');
  console.log('=' .repeat(70));
  
  try {
    // Get all listings with multiples
    const { data: allListings, error } = await supabase
      .from('flippa_listings')
      .select('*')
      .or('profit_multiple.not.is.null,revenue_multiple.not.is.null')
      .order('asking_price', { ascending: false });
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    console.log(`\n📈 Found ${allListings.length} listings with multiples\n`);
    
    // Separate by price type from raw_data
    const askingListings = [];
    const soldListings = [];
    
    allListings.forEach(listing => {
      const rawData = listing.raw_data || {};
      if (rawData.price_type === 'sold' || rawData.is_sold) {
        soldListings.push(listing);
      } else {
        askingListings.push(listing);
      }
    });
    
    console.log(`💰 Asking Price Listings: ${askingListings.length}`);
    console.log(`✅ Sold Listings: ${soldListings.length}`);
    
    // Analyze asking price multiples
    if (askingListings.length > 0) {
      console.log('\n📊 ASKING PRICE MULTIPLES ANALYSIS:');
      console.log('-'.repeat(50));
      
      const profitMultiples = askingListings
        .filter(l => l.profit_multiple)
        .map(l => l.profit_multiple);
      
      const revenueMultiples = askingListings
        .filter(l => l.revenue_multiple)
        .map(l => l.revenue_multiple);
      
      if (profitMultiples.length > 0) {
        const avgProfit = profitMultiples.reduce((a, b) => a + b, 0) / profitMultiples.length;
        const minProfit = Math.min(...profitMultiples);
        const maxProfit = Math.max(...profitMultiples);
        
        console.log(`\nProfit Multiples (${profitMultiples.length} listings):`);
        console.log(`  Average: ${avgProfit.toFixed(2)}x`);
        console.log(`  Range: ${minProfit}x - ${maxProfit}x`);
      }
      
      if (revenueMultiples.length > 0) {
        const avgRevenue = revenueMultiples.reduce((a, b) => a + b, 0) / revenueMultiples.length;
        const minRevenue = Math.min(...revenueMultiples);
        const maxRevenue = Math.max(...revenueMultiples);
        
        console.log(`\nRevenue Multiples (${revenueMultiples.length} listings):`);
        console.log(`  Average: ${avgRevenue.toFixed(2)}x`);
        console.log(`  Range: ${minRevenue}x - ${maxRevenue}x`);
      }
      
      // Top listings by multiple
      console.log('\n🏆 Top 5 Asking Listings by Profit Multiple:');
      askingListings
        .filter(l => l.profit_multiple)
        .sort((a, b) => b.profit_multiple - a.profit_multiple)
        .slice(0, 5)
        .forEach((listing, i) => {
          console.log(`\n${i + 1}. ${listing.title} [${listing.listing_id}]`);
          console.log(`   Asking Price: $${(listing.asking_price || 0).toLocaleString()}`);
          console.log(`   Profit Multiple: ${listing.profit_multiple}x`);
          if (listing.revenue_multiple) {
            console.log(`   Revenue Multiple: ${listing.revenue_multiple}x`);
          }
          if (listing.monthly_profit) {
            console.log(`   Monthly Profit: $${listing.monthly_profit.toLocaleString()}`);
          }
          
          // Show badges from raw_data
          const badges = listing.raw_data?.badges || [];
          if (badges.length > 0) {
            console.log(`   Badges: ${badges.join(', ')}`);
          }
        });
    }
    
    // Analyze sold listings
    if (soldListings.length > 0) {
      console.log('\n\n📊 SOLD LISTINGS MULTIPLES ANALYSIS:');
      console.log('-'.repeat(50));
      
      // Similar analysis for sold listings...
      console.log(`\nFound ${soldListings.length} sold listings`);
      soldListings.slice(0, 3).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   Sold Price: $${(listing.asking_price || 0).toLocaleString()}`);
        if (listing.profit_multiple) {
          console.log(`   Profit Multiple: ${listing.profit_multiple}x`);
        }
        if (listing.revenue_multiple) {
          console.log(`   Revenue Multiple: ${listing.revenue_multiple}x`);
        }
      });
    }
    
    // Industry breakdown
    console.log('\n\n📊 MULTIPLES BY INDUSTRY:');
    console.log('-'.repeat(50));
    
    const industryGroups = {};
    askingListings.forEach(listing => {
      const industry = listing.industry || listing.sub_category || 'Unknown';
      if (!industryGroups[industry]) {
        industryGroups[industry] = {
          count: 0,
          profitMultiples: [],
          revenueMultiples: []
        };
      }
      
      industryGroups[industry].count++;
      if (listing.profit_multiple) {
        industryGroups[industry].profitMultiples.push(listing.profit_multiple);
      }
      if (listing.revenue_multiple) {
        industryGroups[industry].revenueMultiples.push(listing.revenue_multiple);
      }
    });
    
    Object.entries(industryGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .forEach(([industry, data]) => {
        console.log(`\n${industry} (${data.count} listings):`);
        
        if (data.profitMultiples.length > 0) {
          const avgProfit = data.profitMultiples.reduce((a, b) => a + b, 0) / data.profitMultiples.length;
          console.log(`  Avg Profit Multiple: ${avgProfit.toFixed(2)}x`);
        }
        
        if (data.revenueMultiples.length > 0) {
          const avgRevenue = data.revenueMultiples.reduce((a, b) => a + b, 0) / data.revenueMultiples.length;
          console.log(`  Avg Revenue Multiple: ${avgRevenue.toFixed(2)}x`);
        }
      });
    
    // Special badges analysis
    console.log('\n\n🏅 LISTINGS WITH SPECIAL BADGES:');
    console.log('-'.repeat(50));
    
    const verifiedCount = allListings.filter(l => l.is_verified).length;
    const featuredCount = allListings.filter(l => l.is_featured).length;
    
    console.log(`Verified Listings: ${verifiedCount}`);
    console.log(`Featured/Sponsored: ${featuredCount}`);
    
    // Broker listings
    const brokerListings = allListings.filter(l => 
      l.raw_data?.badges?.includes('Broker')
    );
    console.log(`Broker Listings: ${brokerListings.length}`);
    
    // Managed by Flippa
    const managedListings = allListings.filter(l => 
      l.raw_data?.badges?.includes('Managed by Flippa')
    );
    console.log(`Managed by Flippa: ${managedListings.length}`);
    
    // Editor's Choice
    const editorsChoice = allListings.filter(l => 
      l.raw_data?.badges?.includes("Editor's Choice")
    );
    console.log(`Editor's Choice: ${editorsChoice.length}`);
    
    console.log('\n' + '=' .repeat(70));
    console.log('✅ Analysis complete');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

analyzeMultiples().catch(console.error);