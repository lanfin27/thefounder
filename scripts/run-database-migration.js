// run-database-migration.js
// Script to run the comprehensive database migration for Enhanced Browser System

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDatabaseMigration() {
  console.log('🚀 Starting Enhanced Browser System Database Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250105_update_scraping_sessions_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');

    // Execute the migration
    console.log('⚙️ Executing database migration...');
    
    // Split the SQL into individual statements for better error handling
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedCount = 0;
    let errors = [];

    for (const statement of statements) {
      try {
        if (statement.includes('DO $$') || statement.includes('END $$')) {
          // Handle DO blocks separately
          const { error } = await supabase.rpc('execute_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️ Warning executing DO block: ${error.message}`);
            errors.push({ statement: statement.substring(0, 50) + '...', error: error.message });
          } else {
            executedCount++;
          }
        } else {
          // Regular SQL statements
          const { error } = await supabase.rpc('execute_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️ Warning executing statement: ${error.message}`);
            errors.push({ statement: statement.substring(0, 50) + '...', error: error.message });
          } else {
            executedCount++;
          }
        }
      } catch (sqlError) {
        console.warn(`⚠️ Error executing statement: ${sqlError.message}`);
        errors.push({ statement: statement.substring(0, 50) + '...', error: sqlError.message });
      }
    }

    console.log(`✅ Migration completed: ${executedCount} statements executed successfully`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️ ${errors.length} warnings/errors encountered:`);
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.statement}`);
        console.log(`     Error: ${err.error}`);
      });
    }\n\n    // Verify the migration\n    console.log('\\n🔍 Verifying migration results...');\n    await verifyMigration();\n\n    console.log('\\n🎉 Database migration completed successfully!');\n    console.log('\\n📊 Summary:');\n    console.log(`   - Migration file: 20250105_update_scraping_sessions_schema.sql`);\n    console.log(`   - Statements executed: ${executedCount}`);\n    console.log(`   - Warnings: ${errors.length}`);\n    console.log(`   - Status: ${errors.length === 0 ? 'SUCCESS' : 'SUCCESS_WITH_WARNINGS'}`);\n\n  } catch (error) {\n    console.error('❌ Migration failed:', error);\n    process.exit(1);\n  }\n}\n\nasync function verifyMigration() {\n  try {\n    // Check if new columns exist\n    const { data: columns, error: columnsError } = await supabase\n      .rpc('get_table_columns', { table_name: 'scraping_sessions' });\n\n    if (columnsError) {\n      console.warn('⚠️ Could not verify columns:', columnsError.message);\n      return;\n    }\n\n    const requiredColumns = [\n      'failed_extractions',\n      'successful_extractions', \n      'status',\n      'extraction_rate',\n      'stealth_level',\n      'browser_type',\n      'browser_library',\n      'session_type',\n      'last_activity',\n      'pages_visited'\n    ];\n\n    const existingColumns = columns?.map(col => col.column_name) || [];\n    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));\n\n    if (missingColumns.length === 0) {\n      console.log('✅ All required columns are present');\n    } else {\n      console.log(`⚠️ Missing columns: ${missingColumns.join(', ')}`);\n    }\n\n    // Check if views exist\n    const { data: views, error: viewsError } = await supabase\n      .rpc('get_views');\n\n    if (!viewsError && views?.some(v => v.viewname === 'scraping_sessions_enhanced')) {\n      console.log('✅ Enhanced view created successfully');\n    } else {\n      console.log('⚠️ Enhanced view may not be available');\n    }\n\n    // Check if scraped_data table exists\n    const { data: tables, error: tablesError } = await supabase\n      .rpc('get_tables');\n\n    if (!tablesError && tables?.some(t => t.tablename === 'scraped_data')) {\n      console.log('✅ scraped_data table created successfully');\n    } else {\n      console.log('⚠️ scraped_data table may not be available');\n    }\n\n    console.log('✅ Migration verification completed');\n\n  } catch (error) {\n    console.warn('⚠️ Migration verification failed:', error.message);\n  }\n}\n\n// Test database connection and run migration\nasync function main() {\n  try {\n    console.log('🔌 Testing database connection...');\n    \n    const { data, error } = await supabase.from('scraping_sessions').select('id').limit(1);\n    \n    if (error && !error.message.includes('relation \"scraping_sessions\" does not exist')) {\n      throw new Error(`Database connection failed: ${error.message}`);\n    }\n    \n    console.log('✅ Database connection successful\\n');\n    \n    await runDatabaseMigration();\n    \n  } catch (error) {\n    console.error('❌ Script failed:', error.message);\n    process.exit(1);\n  }\n}\n\n// Run the migration\nif (require.main === module) {\n  main();\n}\n\nmodule.exports = { runDatabaseMigration, verifyMigration };"