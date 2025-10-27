/**
 * Sample History Data Generator
 * 이 스크립트는 테스트용 히스토리 데이터를 생성합니다.
 *
 * 사용법:
 *   npx tsx scripts/generate-sample-history.ts
 *
 * 필요한 환경변수 (.env.local):
 *   NEXT_PUBLIC_YT_SUPABASE_URL
 *   YT_SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// 환경변수 로드
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_YT_SUPABASE_URL:', !!supabaseUrl)
  console.error('   YT_SUPABASE_SERVICE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateSampleHistory() {
  console.log('🚀 Starting sample history data generation...\n')

  try {
    // 1. 카테고리 조회
    const { data: categories, error: categoriesError } = await supabase
      .from('youtube_categories')
      .select('code')
      .limit(5)

    if (categoriesError || !categories || categories.length === 0) {
      console.error('❌ Failed to fetch categories:', categoriesError)
      return
    }

    console.log(`✅ Found ${categories.length} categories`)
    const categoryCodes = categories.map(c => c.code)

    // 2. 각 카테고리별 채널 조회 (상위 3개만)
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('channel_id, category_code, total_views, video_count, subscribers')
      .in('category_code', categoryCodes)
      .neq('status', 'deleted')
      .eq('is_active', true)
      .order('subscribers', { ascending: false })
      .limit(15)

    if (channelsError || !channels || channels.length === 0) {
      console.error('❌ Failed to fetch channels:', channelsError)
      return
    }

    console.log(`✅ Found ${channels.length} channels`)

    // 3. 히스토리 데이터 생성 (최근 60일)
    const historyData = []
    const days = 60

    for (const channel of channels) {
      if (!channel.video_count || channel.video_count === 0) {
        console.log(`⚠️  Skipping channel ${channel.channel_id}: no videos`)
        continue
      }

      const baseViewsPerVideo = channel.total_views / channel.video_count

      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        // 임의의 변동 추가 (±5%)
        const randomVariation = 0.95 + Math.random() * 0.1

        // 약간의 상승 추세 추가 (최근일수록 조금 더 높게)
        const trendFactor = 1 + (days - i) * 0.0005

        // 주기적인 패턴 추가 (주말 효과 등)
        const dayOfWeek = date.getDay()
        const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.05 : 1.0

        const viewsPerVideo = baseViewsPerVideo * randomVariation * trendFactor * weekendBoost
        const totalViews = viewsPerVideo * channel.video_count

        historyData.push({
          channel_id: channel.channel_id,
          category_code: channel.category_code,
          date: dateStr,
          total_views: Math.round(totalViews),
          video_count: channel.video_count,
          views_per_video: Math.round(viewsPerVideo),
          subscribers: channel.subscribers,
        })
      }
    }

    console.log(`\n📊 Generated ${historyData.length} history records`)
    console.log(`   ${channels.length} channels × ${days} days = ${channels.length * days} records\n`)

    // 4. 데이터 삽입 (배치 단위로)
    const batchSize = 100
    let insertedCount = 0

    for (let i = 0; i < historyData.length; i += batchSize) {
      const batch = historyData.slice(i, i + batchSize)

      const { error: insertError } = await supabase
        .from('youtube_channel_history')
        .upsert(batch, {
          onConflict: 'channel_id,date',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error(`❌ Batch insert error (${i}-${i + batchSize}):`, insertError)
      } else {
        insertedCount += batch.length
        process.stdout.write(`\r⏳ Inserting... ${insertedCount}/${historyData.length}`)
      }
    }

    console.log('\n\n✅ Sample history data generation completed!')
    console.log(`   Total records: ${insertedCount}`)
    console.log(`   Categories: ${categoryCodes.join(', ')}`)
    console.log(`   Channels: ${channels.length}`)
    console.log(`   Days: ${days}`)

    console.log('\n💡 Test the chart at:')
    console.log(`   http://localhost:3000/youtube-industry/${categoryCodes[0]}`)

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// 스크립트 실행
generateSampleHistory()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
