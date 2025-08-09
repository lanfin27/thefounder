// manual-database-fix.js
// Manual database fix using direct SQL execution

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualDatabaseFix() {
  console.log('🔧 Manual Database Fix - Adding missing columns...\n');

  const sqlCommands = [
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS failed_extractions INTEGER DEFAULT 0;",
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS stealth_level TEXT DEFAULT 'basic';",
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS browser_library TEXT DEFAULT 'playwright';", 
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'standard';",
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS extraction_rate NUMERIC(8,2) DEFAULT 0.0;",
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS pages_visited INTEGER DEFAULT 0;",
    "ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"
  ];

  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i];
    const columnName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
    
    try {
      console.log(`⚙️ Adding column: ${columnName}...`);
      
      // Try using the SQL editor approach
      const { data, error } = await supabase.rpc('exec', { sql });
      
      if (error) {
        console.log(`❌ RPC failed for ${columnName}: ${error.message}`);
        
        // Alternative: Try direct query
        const { error: directError } = await supabase
          .from('_realtime')
          .select('id')
          .limit(0); // This won't work but might give us insight
        
      } else {
        console.log(`✅ Successfully added column: ${columnName}`);
      }
      
    } catch (err) {
      console.log(`⚠️ Error with ${columnName}:`, err.message);
    }
  }

  // Try to test a simple query to see current state
  console.log('\n📊 Testing current table state...');
  try {
    const { data, error } = await supabase
      .from('scraping_sessions')
      .select('id, session_id, method, status')
      .limit(1);
    
    if (error) {
      console.log('❌ Table query error:', error.message);
    } else {
      console.log(`✅ Table is accessible - ${data?.length || 0} records found`);
      if (data && data.length > 0) {
        console.log('Available columns:', Object.keys(data[0]));
      }
    }
  } catch (error) {
    console.log('❌ Test query failed:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Go to Supabase dashboard SQL editor');
  console.log('2. Run the migration SQL file manually:');
  console.log('   supabase/migrations/20250105_update_scraping_sessions_schema.sql');
  console.log('3. Or execute these commands one by one in SQL editor:');
  sqlCommands.forEach((cmd, i) => {
    console.log(`   ${i + 1}. ${cmd}`);
  });
}

manualDatabaseFix();