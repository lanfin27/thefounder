import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testContentSaved() {
  console.log('\n📊 === VERIFYING CONTENT SAVED TO DATABASE ===\n')

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, content')
    .not('cover', 'is', null)
    .limit(3)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!posts || posts.length === 0) {
    console.error('❌ No posts found!')
    return
  }

  console.log(`✅ Found ${posts.length} posts\n`)

  posts.forEach((post, i) => {
    console.log(`--- Post ${i + 1}: ${post.title} ---`)

    if (post.content) {
      console.log(`✅ Content EXISTS!`)
      console.log(`   Length: ${post.content.length} characters`)
      console.log(`   Preview: ${post.content.substring(0, 150)}...`)
      console.log('')
    } else {
      console.log(`❌ Content is NULL/EMPTY!`)
      console.log('')
    }
  })

  // Overall summary
  const postsWithContent = posts.filter(p => p.content).length
  const postsWithoutContent = posts.filter(p => !p.content).length

  console.log(`\n📈 Summary:`)
  console.log(`   ✅ Posts with content: ${postsWithContent}`)
  console.log(`   ❌ Posts without content: ${postsWithoutContent}`)

  if (postsWithContent === posts.length) {
    console.log(`\n🎉 SUCCESS! All posts have content!\n`)
  } else {
    console.log(`\n⚠️  Some posts are still missing content. Re-run sync.\n`)
  }
}

testContentSaved()
