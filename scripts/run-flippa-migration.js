// Run Flippa schema migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔄 Running Flippa schema migration...\n');
  
  try {
    console.log('⚠️  IMPORTANT: Please run the following SQL in your Supabase SQL Editor:\n');
    
    const sqlPath = path.join(__dirname, 'migrate-flippa-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(sql);
    
    console.log('\n\n📋 Steps to complete migration:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click Run to execute the migration');
    console.log('\n✅ After running the migration, the scraper will be able to store comprehensive data.');
    
    const { data, error } = await supabase
      .from('flippa_listings')
      .select('listing_id')
      .limit(1);
    
    if (\!error) {
      console.log('\n✅ Database connection verified');
    } else {
      console.log('\n❌ Database error:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

runMigration().catch(console.error);
