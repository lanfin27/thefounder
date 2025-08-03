/**
 * Check actual database count
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkCount() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Get count
  const { count, error: countError } = await supabase
    .from('flippa_listings')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total listings in database:', count);
  
  // Get sample with different query
  const { data: sample, error } = await supabase
    .from('flippa_listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\nLatest 5 entries:');
  sample?.forEach((item, i) => {
    console.log(`${i+1}. ID: ${item.listing_id}, Title: ${item.title || 'N/A'}, Source: ${item.source}`);
  });
  
  // Get all listings count without limit
  const { data: allData } = await supabase
    .from('flippa_listings')
    .select('listing_id');
  
  console.log('\nActual fetched count:', allData?.length);
}

checkCount().catch(console.error);