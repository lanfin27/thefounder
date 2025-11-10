import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('Checking posts table schema...\n')

  // Get one post to see all columns
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data) {
    console.log('Available columns:')
    console.log(JSON.stringify(Object.keys(data), null, 2))

    console.log('\nSample data (first row):')
    console.log(JSON.stringify(data, null, 2))
  }
}

checkSchema()
