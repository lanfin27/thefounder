import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testFreshSync() {
  console.log('\n🔄 === TESTING FRESH SYNC ===\n')

  const apiUrl = 'http://localhost:3002/api/admin/sync'

  console.log(`📡 Calling sync API: ${apiUrl}`)
  console.log(`📋 Request body: { syncAll: true }`)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        syncAll: true  // Sync all active sources
      })
    })

    console.log(`\n📊 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Sync failed:')
      console.error(errorText)
      return
    }

    const result = await response.json()
    console.log('\n✅ Sync completed successfully!')
    console.log('📊 Result:', JSON.stringify(result, null, 2))

    console.log(`\n📈 Summary:`)
    console.log(`   Total posts: ${result.totalPosts}`)
    console.log(`   Successful sources: ${result.successCount}`)
    console.log(`   Failed sources: ${result.failureCount}`)

    if (result.results && result.results.length > 0) {
      console.log(`\n📋 Individual results:`)
      result.results.forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.sourceName}: ${r.success ? '✅' : '❌'} (${r.postsCount} posts)`)
        if (r.error) {
          console.log(`      Error: ${r.error}`)
        }
      })
    }

    console.log('\n🎉 Sync test complete!')

  } catch (error) {
    console.error('\n❌ Sync test failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  }
}

testFreshSync()
