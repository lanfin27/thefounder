// apply-unified-schema.js
// Apply the unified database schema to Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyUnifiedSchema() {
  console.log('🔧 Applying unified database schema...\n');

  try {
    // Read the unified schema
    const schemaPath = path.join(__dirname, '..', 'database-unified-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Schema loaded, executing...');

    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Skip empty statements
        if (!statement.trim()) continue;

        console.log(`⚙️ Executing: ${statement.substring(0, 50)}...`);
        
        // We can't execute DDL directly via Supabase client, so we'll log the SQL
        // This needs to be executed manually in Supabase SQL Editor
        console.log(`📋 SQL: ${statement}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error executing statement: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Schema preparation completed:`);
    console.log(`   - Statements prepared: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);

    console.log(`\n🔧 MANUAL STEP REQUIRED:`);
    console.log(`1. Go to Supabase Dashboard > SQL Editor`);
    console.log(`2. Copy and paste the contents of: database-unified-schema.sql`);
    console.log(`3. Execute the SQL`);
    console.log(`4. Come back and run: node scripts/test-unified-system.js`);

    // Test basic connection
    console.log(`\n🔌 Testing database connection...`);
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
    
    if (error) {
      console.error(`❌ Connection test failed: ${error.message}`);
    } else {
      console.log(`✅ Database connection successful`);
    }

  } catch (error) {
    console.error('❌ Schema application failed:', error);
  }
}

applyUnifiedSchema();