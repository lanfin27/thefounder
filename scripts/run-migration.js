// Script to run Supabase migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  console.log('🚀 Running Flippa database migration...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250102_flippa_listings.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🔧 Executing migration...\n');
    
    // Note: Supabase JS client doesn't support raw SQL execution
    // You'll need to run this through Supabase dashboard or CLI
    
    console.log('⚠️  IMPORTANT: Supabase JS client cannot execute raw SQL migrations.');
    console.log('\n📋 Please run the migration using one of these methods:\n');
    console.log('1. Supabase Dashboard:');
    console.log('   - Go to your Supabase project dashboard');
    console.log('   - Navigate to SQL Editor');
    console.log('   - Copy and paste the migration from:');
    console.log(`   ${migrationPath}`);
    console.log('   - Click "Run"\n');
    
    console.log('2. Supabase CLI:');
    console.log('   npx supabase db push\n');
    
    console.log('3. Direct SQL (if you have psql):');
    console.log('   psql -h <your-db-host> -U postgres -d postgres < supabase/migrations/20250102_flippa_listings.sql\n');
    
    console.log('📝 Migration SQL preview:');
    console.log('═══════════════════════════════════════════════════');
    console.log(migrationSQL.substring(0, 500) + '...\n');
    
    // Test connection
    const { data, error } = await supabase
      .from('flippa_listings')
      .select('count')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('❌ Tables do not exist yet. Please run the migration first.');
    } else if (error) {
      console.log('⚠️  Database connection test failed:', error.message);
    } else {
      console.log('✅ Database connection successful!');
      console.log('✅ Tables already exist - migration may have been run already.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Execute
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };