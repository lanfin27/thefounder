// run-database-migration-simple.js
// Simplified database migration script for Enhanced Browser System

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSimpleMigration() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Check current schema
    console.log('📋 Checking current schema...');
    const { data: currentColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'scraping_sessions');

    const existingColumns = currentColumns?.map(c => c.column_name) || [];
    console.log('Current columns:', existingColumns.length);

    // Add missing columns one by one
    const columnsToAdd = [
      'failed_extractions INTEGER DEFAULT 0',
      'stealth_level TEXT DEFAULT \'basic\'',
      'browser_library TEXT DEFAULT \'playwright\'',
      'session_type TEXT DEFAULT \'standard\'',
      'extraction_rate NUMERIC(8,2) DEFAULT 0.0',
      'pages_visited INTEGER DEFAULT 0',
      'last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
    ];

    console.log('⚙️ Adding missing columns...');
    
    for (const column of columnsToAdd) {
      try {
        const [columnName] = column.split(' ');
        if (!existingColumns.includes(columnName)) {
          const { error } = await supabase.rpc('exec', {
            sql: `ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS ${column};`
          });
          
          if (!error) {
            console.log(`✅ Added column: ${columnName}`);
          } else {
            console.log(`⚠️ Column ${columnName}:`, error.message);
          }
        } else {
          console.log(`⏭️ Column ${columnName} already exists`);
        }
      } catch (err) {
        console.log(`⚠️ Error with column:`, err.message);
      }
    }

    // Update status column for existing records
    console.log('\n📝 Updating existing records...');
    const { error: updateError } = await supabase
      .from('scraping_sessions')
      .update({
        status: 'completed',
        failed_extractions: 0,
        stealth_level: 'basic',
        browser_library: 'playwright',
        session_type: 'standard'
      })
      .is('status', null);

    if (!updateError) {
      console.log('✅ Updated existing records');
    } else {
      console.log('⚠️ Update records:', updateError.message);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

runSimpleMigration();