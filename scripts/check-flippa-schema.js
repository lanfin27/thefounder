// Check Flippa listings table schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('📊 Checking Flippa listings table schema...\n');
  
  // Get a sample row to see all columns
  const { data, error } = await supabase
    .from('flippa_listings')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Current columns in flippa_listings table:');
    Object.keys(data[0]).forEach(col => {
      const value = data[0][col];
      const type = value === null ? 'null' : typeof value;
      console.log(`- ${col} (${type})`);
    });
    
    console.log('\n\nMissing columns for comprehensive data:');
    const requiredColumns = [
      'price_type',
      'sold_price', 
      'original_price',
      'discount_percentage',
      'profit_multiple',
      'listing_status',
      'business_model',
      'badges',
      'geography',
      'confidential'
    ];
    
    const existingColumns = Object.keys(data[0]);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('The following columns need to be added:');
      missingColumns.forEach(col => {
        console.log(`- ${col}`);
      });
    } else {
      console.log('All required columns exist!');
    }
  }
}

checkSchema().catch(console.error);