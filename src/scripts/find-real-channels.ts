/**
 * Find Real YouTube Channel IDs
 *
 * Searches YouTube API to find actual channel IDs for:
 * - 빠니보틀 (Pani Bottle)
 * - 웨펀
 * - 홍민영
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

async function findRealChannels() {
  console.log('🔍 Finding Real YouTube Channel IDs\n')

  const searchQueries = [
    {
      name: '빠니보틀 Pani Bottle',
      queries: ['빠니보틀', '빠니보틀 Pani Bottle', 'Pani Bottle']
    },
    {
      name: '웨펀',
      queries: ['웨펀', 'WeaponTV', 'Weapon']
    },
    {
      name: '홍민영',
      queries: ['홍민영', 'Hong Min Young']
    }
  ]

  const results = []

  for (const channelSpec of searchQueries) {
    console.log(`\n━━━ Searching: ${channelSpec.name} ━━━\n`)

    for (const query of channelSpec.queries) {
      console.log(`  🔎 Query: "${query}"`)

      try {
        const response = await youtube.search.list({
          part: ['snippet'],
          q: query,
          type: ['channel'],
          maxResults: 3
        })

        if (response.data.items && response.data.items.length > 0) {
          response.data.items.forEach((item, index) => {
            const channelId = item.snippet?.channelId
            const channelTitle = item.snippet?.title
            const description = item.snippet?.description?.substring(0, 100)

            console.log(`\n  ${index + 1}. ${channelTitle}`)
            console.log(`     ID: ${channelId}`)
            console.log(`     URL: https://youtube.com/channel/${channelId}`)
            console.log(`     설명: ${description}...`)

            results.push({
              searchName: channelSpec.name,
              query,
              channelId,
              channelTitle,
              description
            })
          })
        } else {
          console.log(`  ⚠️  No results found`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error: any) {
        console.error(`  ❌ Error searching "${query}":`, error.message)
      }
    }
  }

  // Now get detailed stats for top candidates
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Getting Detailed Channel Stats')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const uniqueChannelIds = Array.from(new Set(results.map(r => r.channelId)))

  for (const channelId of uniqueChannelIds) {
    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId!]
      })

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0]
        const stats = channel.statistics
        const snippet = channel.snippet

        console.log(`\n${snippet?.title}`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`Channel ID: ${channelId}`)
        console.log(`Subscribers: ${parseInt(stats?.subscriberCount || '0').toLocaleString()}`)
        console.log(`Total Views: ${parseInt(stats?.viewCount || '0').toLocaleString()}`)
        console.log(`Video Count: ${stats?.videoCount}`)
        console.log(`URL: https://youtube.com/channel/${channelId}`)
        console.log(`\n관련 검색어:`, results.filter(r => r.channelId === channelId).map(r => r.searchName))
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error: any) {
      console.error(`❌ Error getting stats for ${channelId}:`, error.message)
    }
  }

  console.log('\n\n✅ Search complete!')
  console.log('\n💡 다음 단계: 위 결과에서 올바른 채널 ID를 확인하고 데이터베이스를 업데이트하세요.')
}

findRealChannels().catch(console.error)
