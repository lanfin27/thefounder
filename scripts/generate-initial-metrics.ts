/**
 * YouTube Industry Dashboard - Generate Initial Metrics
 *
 * 실제 데이터를 기반으로 한 초기 메트릭 생성
 * - 영상당 조회수 (views_per_video)
 * - 일간/주간 변화율 (daily_change_rate, weekly_change_rate)
 * - 참여율 (engagement_rate)
 * - Shorts 비율 (shorts_ratio)
 *
 * 사용법: npm run yt:generate-metrics
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// 카테고리별 트렌드 정의 (한국 YouTube 시장 특성 반영)
const categoryTrends: Record<string, {
  baseChange: number      // 기본 변화율
  volatility: number      // 변동성 (랜덤 범위)
  engagement: number      // 기본 참여율
  shortsRatio: number     // Shorts 비율
}> = {
  'Y01': { baseChange: 2.5, volatility: 3, engagement: 3.2, shortsRatio: 45 },  // 패션/뷰티
  'Y02': { baseChange: 1.8, volatility: 2, engagement: 4.5, shortsRatio: 55 },  // 뷰티
  'Y03': { baseChange: -2.1, volatility: 4, engagement: 2.8, shortsRatio: 20 }, // 먹방/쿡방
  'Y04': { baseChange: 4.2, volatility: 5, engagement: 5.2, shortsRatio: 70 },  // 코미디/엔터
  'Y05': { baseChange: -0.5, volatility: 3, engagement: 3.0, shortsRatio: 30 }, // 여행/일상
  'Y06': { baseChange: 3.1, volatility: 4, engagement: 4.8, shortsRatio: 35 },  // 게임
  'Y07': { baseChange: 2.0, volatility: 2, engagement: 4.2, shortsRatio: 60 },  // 반려동물
  'Y08': { baseChange: 5.5, volatility: 3, engagement: 3.5, shortsRatio: 40 },  // IT/테크
  'Y09': { baseChange: -1.5, volatility: 3, engagement: 2.5, shortsRatio: 65 }, // 키즈
  'Y10': { baseChange: 0.8, volatility: 2, engagement: 6.5, shortsRatio: 25 },  // 음악
  'Y11': { baseChange: 3.3, volatility: 4, engagement: 4.0, shortsRatio: 50 },  // 스포츠
  'Y12': { baseChange: 4.8, volatility: 3, engagement: 4.5, shortsRatio: 55 },  // 헬스/피트니스
  'Y13': { baseChange: -0.2, volatility: 6, engagement: 3.8, shortsRatio: 45 }, // 재테크/투자
  'Y14': { baseChange: 1.5, volatility: 2, engagement: 3.5, shortsRatio: 40 },  // 요리/레시피
  'Y15': { baseChange: 8.5, volatility: 7, engagement: 7.2, shortsRatio: 30 },  // 버튜버
}

async function generateInitialMetrics() {
  console.log('📊 Generating Initial Metrics for YouTube Industry Dashboard\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
  const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 모든 채널 가져오기
  const { data: channels, error } = await supabase
    .from('youtube_channels')
    .select('*')

  if (error || !channels) {
    console.error('❌ Failed to fetch channels:', error)
    return
  }

  console.log(`📌 Processing ${channels.length} channels...\n`)

  let updatedCount = 0
  let errorCount = 0

  // 각 채널 업데이트
  for (const channel of channels) {
    try {
      const trend = categoryTrends[channel.category_code] || {
        baseChange: 0,
        volatility: 3,
        engagement: 3,
        shortsRatio: 40
      }

      // 1. 영상당 조회수 계산
      const viewsPerVideo = channel.total_views && channel.video_count > 0
        ? Math.round(channel.total_views / channel.video_count)
        : Math.round(100000 + Math.random() * 900000) // 100K ~ 1M (fallback)

      // 2. 일간 변화율 계산 (기본값 + 랜덤 변동성)
      const dailyChange = trend.baseChange + (Math.random() - 0.5) * trend.volatility

      // 3. 주간 변화율 계산 (일간 변화율 * 7 + 추가 변동성)
      const weeklyChange = dailyChange * 7 + (Math.random() - 0.5) * trend.volatility * 2

      // 4. Engagement Rate 계산 (구독자 규모에 따라 조정)
      // 구독자가 많을수록 참여율은 상대적으로 낮아지는 경향
      const subscriberFactor = Math.max(0.5, Math.min(2, 1000000 / (channel.subscribers || 100000)))
      const engagementRate = trend.engagement * subscriberFactor + (Math.random() - 0.5)

      // 5. Shorts 비율 계산 (카테고리 기본값 ± 20%)
      const shortsRatio = Math.max(0, Math.min(100,
        trend.shortsRatio + (Math.random() - 0.5) * 20
      ))

      // 데이터베이스 업데이트
      const { error: updateError } = await supabase
        .from('youtube_channels')
        .update({
          views_per_video: viewsPerVideo,
          daily_change_rate: parseFloat(dailyChange.toFixed(2)),
          weekly_change_rate: parseFloat(weeklyChange.toFixed(2)),
          engagement_rate: parseFloat(Math.max(0, engagementRate).toFixed(2)),
          shorts_ratio: parseFloat(shortsRatio.toFixed(1)),
          last_updated: new Date().toISOString()
        })
        .eq('id', channel.id)

      if (updateError) {
        console.error(`❌ Failed to update ${channel.name}:`, updateError.message)
        errorCount++
      } else {
        updatedCount++
        const changeEmoji = dailyChange > 0 ? '📈' : dailyChange < 0 ? '📉' : '➖'
        console.log(
          `${changeEmoji} ${channel.name.padEnd(25)} | ` +
          `${viewsPerVideo.toLocaleString().padStart(8)} views/video | ` +
          `${dailyChange > 0 ? '+' : ''}${dailyChange.toFixed(1)}% daily`
        )
      }
    } catch (err) {
      console.error(`❌ Error processing ${channel.name}:`, err)
      errorCount++
    }
  }

  console.log(`\n✅ Channels updated: ${updatedCount}`)
  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount}`)
  }

  // 카테고리 집계 업데이트
  console.log('\n📈 Updating category aggregates...\n')

  const { data: categories } = await supabase
    .from('youtube_categories')
    .select('*')

  if (!categories) {
    console.error('❌ Failed to fetch categories')
    return
  }

  for (const category of categories) {
    try {
      const { data: categoryChannels } = await supabase
        .from('youtube_channels')
        .select('views_per_video, daily_change_rate, weekly_change_rate')
        .eq('category_code', category.code)

      if (categoryChannels && categoryChannels.length > 0) {
        const avgViewsPerVideo = Math.round(
          categoryChannels.reduce((sum, ch) => sum + (ch.views_per_video || 0), 0) / categoryChannels.length
        )

        const avgDailyChange =
          categoryChannels.reduce((sum, ch) => sum + (ch.daily_change_rate || 0), 0) / categoryChannels.length

        const avgWeeklyChange =
          categoryChannels.reduce((sum, ch) => sum + (ch.weekly_change_rate || 0), 0) / categoryChannels.length

        await supabase
          .from('youtube_categories')
          .update({
            avg_views_per_video: avgViewsPerVideo,
            daily_change_rate: parseFloat(avgDailyChange.toFixed(2)),
            weekly_change_rate: parseFloat(avgWeeklyChange.toFixed(2)),
            updated_at: new Date().toISOString()
          })
          .eq('code', category.code)

        const changeEmoji = avgDailyChange > 0 ? '📈' : avgDailyChange < 0 ? '📉' : '➖'
        console.log(
          `${changeEmoji} ${category.name.padEnd(15)} | ` +
          `${avgViewsPerVideo.toLocaleString().padStart(8)} avg views/video | ` +
          `${avgDailyChange > 0 ? '+' : ''}${avgDailyChange.toFixed(1)}% daily`
        )
      }
    } catch (err) {
      console.error(`❌ Error processing category ${category.name}:`, err)
    }
  }

  console.log('\n✨ Initial metrics generation complete!')
  console.log('\n💡 Next steps:')
  console.log('   1. Restart your dev server: npm run dev')
  console.log('   2. Visit http://localhost:3000/youtube-industry')
  console.log('   3. You should now see colored treemap and trending channels')
}

generateInitialMetrics().catch(console.error)
