const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyData() {
    console.log('🔍 Verifying Supabase Data Access');
    console.log('=================================\n');

    try {
        // 1. Total count
        const { count: totalCount, error: countError } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });

        console.log(`📊 Total listings: ${totalCount || 0}`);
        if (countError) console.log('   Error:', countError.message);

        // 2. Recent listings
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: recentCount } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', sevenDaysAgo.toISOString());

        console.log(`📅 Recent listings (7 days): ${recentCount || 0}`);

        // 3. Sample listings
        const { data: samples, error: sampleError } = await supabase
            .from('flippa_listings')
            .select('id, title, asking_price, category, created_at')
            .limit(5)
            .order('id', { ascending: false });

        if (samples && samples.length > 0) {
            console.log('\n📋 Sample listings:');
            samples.forEach(listing => {
                console.log(`   ID ${listing.id}: ${listing.title || 'Untitled'} - $${listing.asking_price || 0}`);
                console.log(`      Category: ${listing.category || 'N/A'}, Created: ${new Date(listing.created_at).toLocaleDateString()}`);
            });
        }

        // 4. Categories breakdown
        const { data: categories } = await supabase
            .from('flippa_listings')
            .select('category')
            .not('category', 'is', null);

        if (categories) {
            const categoryCounts = {};
            categories.forEach(item => {
                const cat = item.category || 'Other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });

            console.log('\n📂 Categories:');
            Object.entries(categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .forEach(([cat, count]) => {
                    console.log(`   ${cat}: ${count}`);
                });
        }

        // 5. Price ranges
        const { data: priceData } = await supabase
            .from('flippa_listings')
            .select('asking_price')
            .not('asking_price', 'is', null)
            .gt('asking_price', 0);

        if (priceData && priceData.length > 0) {
            const prices = priceData.map(p => p.asking_price).sort((a, b) => a - b);
            console.log('\n💰 Price statistics:');
            console.log(`   Min: $${prices[0].toLocaleString()}`);
            console.log(`   Max: $${prices[prices.length - 1].toLocaleString()}`);
            console.log(`   Median: $${prices[Math.floor(prices.length / 2)].toLocaleString()}`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

verifyData();