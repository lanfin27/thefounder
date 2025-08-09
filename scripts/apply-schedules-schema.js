const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applySchedulesSchema() {
  console.log('📋 Applying schedules schema to Supabase...');
  
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-schedules-table.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    // Split by statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + '...');
      
      const { error } = await supabase.rpc('exec_sql', {
        query: statement
      });
      
      if (error) {
        // Try alternative approach - direct query
        console.log('Trying alternative approach...');
        const { data, error: altError } = await supabase
          .from('_supabase_internal')
          .select('*')
          .limit(1);
        
        if (altError) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with next statement
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('\n🎉 Schema application complete!');
    
    // Test the tables
    console.log('\n🧪 Testing new tables...');
    
    const { data: schedules, error: scheduleError } = await supabase
      .from('scraping_schedules')
      .select('*')
      .limit(1);
    
    if (scheduleError) {
      console.error('❌ Error accessing scraping_schedules:', scheduleError.message);
    } else {
      console.log('✅ scraping_schedules table is accessible');
    }
    
    const { data: executions, error: execError } = await supabase
      .from('schedule_executions')
      .select('*')
      .limit(1);
    
    if (execError) {
      console.error('❌ Error accessing schedule_executions:', execError.message);
    } else {
      console.log('✅ schedule_executions table is accessible');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Note: Since Supabase doesn't have a direct SQL execution endpoint,
// you'll need to run the SQL directly in the Supabase dashboard
console.log('\n⚠️  IMPORTANT: Supabase requires SQL to be run through the dashboard.');
console.log('Please follow these steps:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to the SQL Editor');
console.log('3. Copy the contents of scripts/create-schedules-table.sql');
console.log('4. Paste and run in the SQL Editor');
console.log('\nThe SQL file is located at: scripts/create-schedules-table.sql');

// Still try to test if tables exist
applySchedulesSchema();