import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseURLs() {
  console.log('\n🔍 === DATABASE URL DIAGNOSTIC ===\n')

  // 1. 모든 포스트의 URL 가져오기
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, cover, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error fetching posts:', error)
    return
  }

  if (!posts || posts.length === 0) {
    console.error('❌ No posts found in database!')
    return
  }

  console.log(`✅ Found ${posts.length} posts\n`)

  // 2. 각 URL의 타임스탬프 추출
  posts.forEach((post, index) => {
    console.log(`\n--- Post ${index + 1}: ${post.title} ---`)
    console.log(`ID: ${post.id}`)
    console.log(`Created: ${post.created_at}`)
    console.log(`Updated: ${post.updated_at}`)

    if (post.cover) {
      const url = post.cover
      console.log(`Cover Image URL (first 150 chars):`)
      console.log(url.substring(0, 150) + '...')

      // Check if URL is proxied
      if (url.startsWith('/api/image-proxy')) {
        console.log(`✅ URL is proxied`)

        // Extract actual Notion URL from proxy
        const urlMatch = url.match(/url=([^&]+)/)
        if (urlMatch) {
          const encodedUrl = urlMatch[1]
          const decodedUrl = decodeURIComponent(encodedUrl)

          // X-Amz-Date 추출
          const dateMatch = decodedUrl.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
          if (dateMatch) {
            const timestamp = dateMatch[1]
            const year = timestamp.substring(0, 4)
            const month = timestamp.substring(4, 6)
            const day = timestamp.substring(6, 8)
            const time = timestamp.substring(9, 15)

            console.log(`📅 URL Timestamp: ${year}-${month}-${day} ${time.substring(0,2)}:${time.substring(2,4)}:${time.substring(4,6)} UTC`)

            // 현재 시각과 비교
            const urlDate = new Date(`${year}-${month}-${day}T${time.substring(0,2)}:${time.substring(2,4)}:${time.substring(4,6)}Z`)
            const now = new Date()
            const hoursDiff = (now.getTime() - urlDate.getTime()) / (1000 * 60 * 60)

            console.log(`⏰ Current time: ${now.toISOString()}`)
            console.log(`⏱️  Age: ${hoursDiff.toFixed(2)} hours`)

            if (hoursDiff > 1) {
              console.log(`❌ EXPIRED! (> 1 hour old)`)
            } else {
              console.log(`✅ Valid (< 1 hour old)`)
            }
          } else {
            console.log(`⚠️  No timestamp found in proxied URL`)
          }
        }
      } else if (url.startsWith('https://')) {
        console.log(`⚠️  URL is NOT proxied (direct Notion URL)`)

        // X-Amz-Date 추출
        const dateMatch = url.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
        if (dateMatch) {
          const timestamp = dateMatch[1]
          const year = timestamp.substring(0, 4)
          const month = timestamp.substring(4, 6)
          const day = timestamp.substring(6, 8)
          const time = timestamp.substring(9, 15)

          console.log(`📅 URL Timestamp: ${year}-${month}-${day} ${time.substring(0,2)}:${time.substring(2,4)}:${time.substring(4,6)} UTC`)

          // 현재 시각과 비교
          const urlDate = new Date(`${year}-${month}-${day}T${time.substring(0,2)}:${time.substring(2,4)}:${time.substring(4,6)}Z`)
          const now = new Date()
          const hoursDiff = (now.getTime() - urlDate.getTime()) / (1000 * 60 * 60)

          console.log(`⏰ Current time: ${now.toISOString()}`)
          console.log(`⏱️  Age: ${hoursDiff.toFixed(2)} hours`)

          if (hoursDiff > 1) {
            console.log(`❌ EXPIRED! (> 1 hour old)`)
          } else {
            console.log(`✅ Valid (< 1 hour old)`)
          }
        } else {
          console.log(`⚠️  No timestamp found in URL`)
        }
      } else {
        console.log(`⚠️  Unknown URL format`)
      }
    } else {
      console.log(`❌ No cover image`)
    }
  })

  console.log('\n\n🔍 === DIAGNOSTIC COMPLETE ===\n')

  // Summary
  const expiredCount = posts.filter(post => {
    if (!post.cover) return false

    let urlToCheck = post.cover

    // Extract URL from proxy if needed
    if (urlToCheck.startsWith('/api/image-proxy')) {
      const urlMatch = urlToCheck.match(/url=([^&]+)/)
      if (urlMatch) {
        urlToCheck = decodeURIComponent(urlMatch[1])
      }
    }

    const dateMatch = urlToCheck.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
    if (!dateMatch) return false

    const timestamp = dateMatch[1]
    const year = timestamp.substring(0, 4)
    const month = timestamp.substring(4, 6)
    const day = timestamp.substring(6, 8)
    const time = timestamp.substring(9, 15)

    const urlDate = new Date(`${year}-${month}-${day}T${time.substring(0,2)}:${time.substring(2,4)}:${time.substring(4,6)}Z`)
    const now = new Date()
    const hoursDiff = (now.getTime() - urlDate.getTime()) / (1000 * 60 * 60)

    return hoursDiff > 1
  }).length

  console.log('\n📊 === SUMMARY ===')
  console.log(`Total posts: ${posts.length}`)
  console.log(`Expired URLs: ${expiredCount}`)
  console.log(`Valid URLs: ${posts.length - expiredCount}`)

  if (expiredCount === posts.length) {
    console.log('\n❌ ALL URLS EXPIRED - Sync is not updating database properly!')
    console.log('   → Check Scenario A (Database update failure)')
    console.log('   → Check Scenario B (URL conversion failure)')
  } else if (expiredCount > 0) {
    console.log('\n⚠️  SOME URLS EXPIRED - Partial sync failure')
  } else {
    console.log('\n✅ ALL URLS VALID - Problem may be browser cache')
    console.log('   → Check Scenario D (Browser cache)')
  }
}

diagnoseURLs().catch(console.error)
