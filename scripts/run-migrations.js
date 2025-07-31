const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  console.log('🔄 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240801_industry_multiples_timeseries.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('📄 Migration file loaded successfully')
    
    // Since we can't execute raw SQL directly, we'll need to check if table exists
    console.log('🔍 Checking if table exists...')
    
    const { data: tableCheck, error: checkError } = await supabase
      .from('industry_multiples_timeseries')
      .select('count')
      .limit(1)
    
    if (checkError && checkError.code === '42P01') {
      console.error('❌ Table does not exist. Please run the migration SQL manually in Supabase dashboard:')
      console.error('   1. Go to your Supabase project dashboard')
      console.error('   2. Navigate to SQL Editor')
      console.error('   3. Copy and paste the migration file content')
      console.error('   4. Execute the SQL')
      console.error('')
      console.error('Migration file location:', migrationPath)
      process.exit(1)
    }
    
    if (!checkError) {
      console.log('✅ Table already exists!')
      
      // Check if table has data
      const { count, error: countError } = await supabase
        .from('industry_multiples_timeseries')
        .select('*', { count: 'exact', head: true })
      
      if (!countError) {
        console.log(`📊 Table contains ${count || 0} rows`)
        
        if (count === 0) {
          console.log('⚠️  Table is empty. Sample data may need to be inserted.')
          console.log('   Run the INSERT statements from the migration file to add sample data.')
        }
      }
    }
    
    console.log('✅ Migration check completed!')
    
  } catch (error) {
    console.error('❌ Script error:', error)
    process.exit(1)
  }
}

// Add to package.json scripts:
// "db:migrate": "node scripts/run-migrations.js"

runMigrations()