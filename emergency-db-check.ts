import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDatabase() {
  console.log('\n🚨 EMERGENCY DATABASE CHECK\n')

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, cover, updated_at')
    .limit(3)

  if (error) {
    console.error('❌ Database error:', error)
    return
  }

  if (!posts || posts.length === 0) {
    console.error('❌ NO POSTS IN DATABASE!')
    return
  }

  posts.forEach((post, i) => {
    console.log(`\n--- Post ${i + 1}: ${post.title} ---`)
    console.log('Updated:', post.updated_at)
    console.log('Cover value:', post.cover ? `${post.cover.substring(0, 150)}...` : 'null/undefined')

    if (post.cover) {
      // Try to extract from proxied URL
      let urlToCheck = post.cover

      // If it's a proxied URL, extract the actual URL
      if (post.cover.startsWith('/api/image-proxy')) {
        const urlMatch = post.cover.match(/url=([^&]+)/)
        if (urlMatch) {
          urlToCheck = decodeURIComponent(urlMatch[1])
          console.log('Extracted URL:', urlToCheck.substring(0, 150))
        }
      }

      const match = urlToCheck.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
      if (match) {
        console.log('URL Timestamp:', match[1])

        const urlDate = new Date(
          `${match[1].substring(0,4)}-${match[1].substring(4,6)}-${match[1].substring(6,8)}T${match[1].substring(9,11)}:${match[1].substring(11,13)}:${match[1].substring(13,15)}Z`
        )
        const age = (Date.now() - urlDate.getTime()) / (1000 * 60 * 60)

        console.log(`Age: ${age.toFixed(1)} hours`)
        console.log(age > 1 ? '❌ EXPIRED' : '✅ Valid')
      } else {
        console.log('⚠️ No X-Amz-Date found in URL')
      }
    } else {
      console.log('⚠️ No cover image')
    }
  })
}

checkDatabase()
