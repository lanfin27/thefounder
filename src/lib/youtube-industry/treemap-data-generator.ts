/**
 * Treemap Data Generator
 * 캐시 없이 매번 DB에서 실시간 조회하여 Treemap 데이터 생성
 */

import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

export interface TreemapCategoryData {
  name: string
  code: string
  icon: string
  value: number
  channels: number
  totalSubscribers: number
  totalViews: number
  dailyChangeRate: number
  weeklyChangeRate: number
  monthlyChangeRate: number
  topChannels: {
    channelId: string
    name: string
    subscribers: number
    thumbnail: string
  }[]
  generatedAt: string
}

/**
 * Treemap 데이터 완전 새로 생성 (캐시 없음)
 * 매 호출마다 DB에서 실시간 조회
 */
export async function generateFreshTreemapData(): Promise<TreemapCategoryData[]> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🗺️  [Treemap Generator] Starting FRESH data generation')
  console.log('⏰ [Treemap Generator] Timestamp:', new Date().toISOString())
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. ✅ 모든 카테고리 조회 (매번 새로 조회)
    const { data: categories, error: catError } = await ytSupabaseAdmin
      .from('youtube_categories')
      .select('*')
      .order('code', { ascending: true }) // ✅ FIXED: sort_order → code

    if (catError) {
      console.error('❌ [Treemap Generator] Category query error:', catError)
      throw catError
    }

    console.log(`✅ [Treemap Generator] Found ${categories?.length || 0} categories`)

    // 2. ✅ 각 카테고리별 활성 채널 조회 (매번 새로 조회)
    const treemapData = await Promise.all(
      (categories || []).map(async (category) => {
        console.log(`\n🔍 [Treemap] Processing category: ${category.code} ${category.name}`)

        // ✅ CRITICAL: 매번 새로운 쿼리, 캐시 없음
        const { data: channels, error: channelError } = await ytSupabaseAdmin
          .from('youtube_channels')
          .select('*')
          .eq('category_code', category.code)
          .eq('is_active', true) // ✅ 활성 채널만
          .neq('status', 'deleted') // ✅ 삭제된 채널 제외
          .order('subscribers', { ascending: false })

        if (channelError) {
          console.error(`❌ [Treemap] Channel query error for ${category.code}:`, channelError)
          return null
        }

        const channelCount = channels?.length || 0
        console.log(`📊 [Treemap] ${category.code}: ${channelCount} active channels`)

        if (channelCount === 0) {
          console.log(`⚠️  [Treemap] ${category.code}: No channels, skipping`)
          return null
        }

        // 3. 통계 계산
        const totalSubscribers = channels.reduce(
          (sum, ch) => sum + (ch.subscribers || 0),
          0
        )

        const totalViews = channels.reduce(
          (sum, ch) => sum + (ch.total_views || 0),
          0
        )

        // 4. ✅ 상위 채널 추출 (최신 데이터)
        const topChannels = channels
          .slice(0, 5)
          .map(ch => {
            const subM = (ch.subscribers / 1_000_000).toFixed(1)
            console.log(`   📌 Top: ${ch.name || ch.title} (${subM}M)`)
            return {
              channelId: ch.channel_id,
              name: ch.name || ch.title || 'Unknown',
              subscribers: ch.subscribers || 0,
              thumbnail: ch.thumbnail_url || '',
            }
          })

        // 5. 변화율 계산
        const dailyChangeRate = channelCount > 0
          ? channels.reduce((sum, ch) => sum + (ch.daily_change_rate || 0), 0) / channelCount
          : 0

        const weeklyChangeRate = channelCount > 0
          ? channels.reduce((sum, ch) => sum + (ch.weekly_change_rate || 0), 0) / channelCount
          : 0

        const monthlyChangeRate = channelCount > 0
          ? channels.reduce((sum, ch) => sum + (ch.monthly_change_rate || 0), 0) / channelCount
          : 0

        console.log(`✅ [Treemap] ${category.code} complete:`, {
          channels: channelCount,
          subscribers: `${(totalSubscribers / 1_000_000).toFixed(1)}M`,
          topChannel: topChannels[0]?.name,
        })

        return {
          name: category.name,
          code: category.code,
          icon: category.emoji || category.icon || '📊',
          value: totalSubscribers, // Treemap 크기
          channels: channelCount,
          totalSubscribers,
          totalViews,
          dailyChangeRate,
          weeklyChangeRate,
          monthlyChangeRate,
          topChannels,
          // ✅ 디버깅용 타임스탬프
          generatedAt: new Date().toISOString(),
        }
      })
    )

    // null 제거 (채널 없는 카테고리)
    const validData = treemapData.filter((item): item is TreemapCategoryData => item !== null)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [Treemap Generator] COMPLETE')
    console.log(`📊 [Treemap Generator] Generated ${validData.length} categories`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return validData

  } catch (error) {
    console.error('❌ [Treemap Generator] Fatal error:', error)
    throw error
  }
}

/**
 * 특정 카테고리의 Treemap 데이터 검증
 */
export async function verifyTreemapDataForCategory(categoryCode: string) {
  console.log(`\n🔍 [Treemap Verify] Checking ${categoryCode}...`)

  const { data: channels } = await ytSupabaseAdmin
    .from('youtube_channels')
    .select('name, title, subscribers, is_active, status')
    .eq('category_code', categoryCode)
    .eq('is_active', true)
    .neq('status', 'deleted')
    .order('subscribers', { ascending: false })

  const channelNames = channels?.map(ch => ch.name || ch.title) || []

  console.log(`✅ [Treemap Verify] ${categoryCode} has ${channelNames.length} active channels:`)
  channelNames.forEach((name, i) => {
    console.log(`   ${i + 1}. ${name}`)
  })

  return channels
}
