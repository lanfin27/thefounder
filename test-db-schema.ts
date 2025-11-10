import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
  console.log('\n📊 Checking Database Schema\n')

  // Get a sample post to see the schema
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (posts && posts.length > 0) {
    console.log('✅ Available columns:')
    Object.keys(posts[0]).forEach((column) => {
      const value = posts[0][column as keyof typeof posts[0]]
      const type = typeof value
      const length = typeof value === 'string' ? value.length : 'N/A'
      console.log(`  - ${column} (${type}): ${length === 'N/A' ? type : `${length} chars`}`)
    })

    // Specifically check for content column
    if ('content' in posts[0]) {
      console.log('\n✅ Content column EXISTS')
      console.log(`   Current value: ${posts[0].content ? `${posts[0].content.substring(0, 100)}...` : 'null/empty'}`)
    } else {
      console.log('\n❌ Content column MISSING!')
      console.log('   Need to add content column to posts table')
    }
  } else {
    console.log('❌ No posts in database')
  }
}

checkSchema()
