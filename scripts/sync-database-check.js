const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncDatabase() {
  console.log('🔄 Database Sync Check\n');
  
  // Check tables
  const tables = [
    'flippa_listings_enhanced',
    'flippa_change_log', 
    'flippa_monitoring_stats'
  ];
  
  const missing = [];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error?.message.includes('does not exist')) {
      console.log(`❌ Missing: ${table}`);
      missing.push(table);
    } else {
      console.log(`✅ Exists: ${table}`);
    }
  }
  
  if (missing.length > 0) {
    console.log('\n⚠️  Run create-enhanced-flippa-schema.sql in Supabase');
  }
  
  // Check data integrity
  const { count } = await supabase
    .from('flippa_listings_enhanced')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', true);
  
  if (count > 0) {
    console.log(`\n⚠️  ${count} records marked as deleted`);
    console.log('Fix with: UPDATE flippa_listings_enhanced SET is_deleted = false WHERE is_deleted = true;');
  }
}

syncDatabase().catch(console.error);