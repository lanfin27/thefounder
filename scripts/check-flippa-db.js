// Check Flippa listings in database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('📊 Checking Flippa listings in database...\n');
  
  const { data, error } = await supabase
    .from('flippa_listings')
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.log('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} recent listings:\n`);
  
  data.forEach((item, index) => {
    console.log(`${index + 1}. [${item.listing_id}] ${item.title || 'No title'}`);
    console.log(`   Price: $${(item.asking_price || 0).toLocaleString()} ${item.currency || 'USD'}`);
    console.log(`   URL: ${item.url}`);
    console.log(`   Category: ${item.primary_category} / ${item.sub_category || 'N/A'}`);
    if (item.monthly_profit) {
      console.log(`   Monthly Profit: $${item.monthly_profit.toLocaleString()}`);
    }
    if (item.revenue_multiple) {
      console.log(`   Multiple: ${item.revenue_multiple}x`);
    }
    console.log(`   Scraped: ${new Date(item.scraped_at).toLocaleString()}`);
    console.log('');
  });
  
  // Check total count
  const { count } = await supabase
    .from('flippa_listings')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\nTotal listings in database: ${count}`);
}

checkDatabase().catch(console.error);