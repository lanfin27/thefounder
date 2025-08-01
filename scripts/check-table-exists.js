// Check if scraping_jobs table exists
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkTable() {
  console.log('🔍 Checking if scraping_jobs table exists');
  console.log('=' .repeat(50));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple query
    console.log('\n1️⃣ Testing table access...');
    const { data, error, count } = await supabase
      .from('scraping_jobs')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ Table access failed:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
      
      if (error.code === '42P01') {
        console.log('\n⚠️  Table does not exist!');
        console.log('Run: npm run db:migrate');
      }
    } else {
      console.log('   ✅ Table exists!');
      console.log(`   Row count: ${count}`);
    }
    
    // Check table structure
    console.log('\n2️⃣ Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'scraping_jobs' })
      .select('*');
    
    if (!columnsError && columns) {
      console.log('   Columns:', columns.map(c => c.column_name).join(', '));
    }
    
  } catch (error) {
    console.log('\n💥 Error:', error.message);
  }
  
  console.log('\n' + '=' .repeat(50));
}

// Helper RPC function to check columns
const checkColumnsRPC = `
-- Run this in Supabase SQL editor if needed:
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (column_name text, data_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = $1
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;
`;

console.log('\nIf the table doesn\'t exist, run:');
console.log('npm run db:migrate\n');

checkTable().catch(console.error);