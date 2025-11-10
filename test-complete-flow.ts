import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testCompleteFlow() {
  console.log('\n🧪 === COMPLETE FLOW TEST ===\n')

  // Step 1: Get a fresh post from database
  console.log('📊 Step 1: Fetching fresh post from database...')
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, cover')
    .not('cover', 'is', null)
    .limit(1)

  if (error || !posts || posts.length === 0) {
    console.error('❌ Failed to get posts:', error)
    return
  }

  const post = posts[0]
  console.log(`✅ Got post: "${post.title}"`)
  console.log(`📋 Cover URL: ${post.cover?.substring(0, 150)}...`)

  // Step 2: Extract the actual S3 URL from the proxied URL
  if (post.cover?.startsWith('/api/image-proxy')) {
    console.log('\n📊 Step 2: Extracting AWS S3 URL from proxy...')
    const urlMatch = post.cover.match(/url=([^&]+)/)
    if (!urlMatch) {
      console.error('❌ Failed to extract URL from proxy')
      return
    }

    // Do NOT decode - searchParams.get() will decode it
    const encodedUrl = urlMatch[1]
    console.log('✅ Extracted encoded URL (first 150 chars):', encodedUrl.substring(0, 150))

    // Step 3: Now test through the proxy
    console.log('\n📊 Step 3: Testing through image proxy...')
    const proxyUrl = `http://localhost:3002${post.cover}`
    console.log('🔗 Proxy URL:', proxyUrl.substring(0, 120) + '...')

    try {
      const response = await fetch(proxyUrl)
      console.log('\n📥 Response:')
      console.log('  Status:', response.status, response.statusText)
      console.log('  Content-Type:', response.headers.get('content-type'))

      if (response.ok) {
        const buffer = await response.arrayBuffer()
        console.log('\n✅ SUCCESS! Image loaded correctly!')
        console.log('  Bytes received:', buffer.byteLength)
        console.log('\n🎉 The complete flow works!\n')
      } else {
        console.log('\n❌ FAILED!')
        const text = await response.text()
        console.log('Response:', text)

        // Step 4: Debug - test the raw S3 URL directly
        console.log('\n📊 Step 4: Testing raw S3 URL directly...')
        const decodedUrl = decodeURIComponent(encodedUrl)
        console.log('🔗 Direct URL (first 150 chars):', decodedUrl.substring(0, 150))

        const directResponse = await fetch(decodedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        })

        console.log('\n📥 Direct Response:')
        console.log('  Status:', directResponse.status, directResponse.statusText)

        if (!directResponse.ok) {
          const errorText = await directResponse.text()
          console.log('  Error:', errorText.substring(0, 500))
        }
      }
    } catch (error) {
      console.error('\n❌ Error:', error)
    }
  }
}

testCompleteFlow()
