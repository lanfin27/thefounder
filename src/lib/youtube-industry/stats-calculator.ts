/**
 * YouTube Industry Stats Calculator
 *
 * 실시간으로 카테고리 통계를 계산하는 유틸리티
 */

import { ytSupabase } from '@/lib/youtube-supabase/client'

export interface CategoryStats {
  code: string
  name: string
  nameEn: string
  emoji: string
  icon: string
  totalChannels: number
  totalSubscribers: number
  totalViews: number
  totalVideos: number
  avgViewsPerVideo: number
  dailyChangeRate: number
  weeklyChangeRate: number
  monthlyChangeRate: number
  topChannels: any[]
}

/**
 * 특정 카테고리의 통계를 실시간으로 계산
 */
export async function calculateCategoryStats(
  categoryCode: string
): Promise<CategoryStats | null> {
  console.log(`📊 [Stats Calculator] Calculating stats for ${categoryCode}...`)

  try {
    // 1. 카테고리 정보 조회
    const { data: category, error: categoryError } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .eq('code', categoryCode)
      .single()

    if (categoryError || !category) {
      console.error(`❌ [Stats Calculator] Category ${categoryCode} not found:`, categoryError)
      return null
    }

    // 2. 해당 카테고리의 모든 채널 조회
    const { data: channels, error: channelsError } = await ytSupabase
      .from('youtube_channels')
      .select('*')
      .eq('category_code', categoryCode)

    if (channelsError) {
      console.error(`❌ [Stats Calculator] Error fetching channels for ${categoryCode}:`, channelsError)
      return null
    }

    if (!channels || channels.length === 0) {
      console.log(`⚠️ [Stats Calculator] No channels found for ${categoryCode}`)
      return {
        code: category.code,
        name: category.name,
        nameEn: category.name_en || '',
        emoji: category.emoji || category.icon || '📊',
        icon: category.icon || category.emoji || '📊',
        totalChannels: 0,
        totalSubscribers: 0,
        totalViews: 0,
        totalVideos: 0,
        avgViewsPerVideo: 0,
        dailyChangeRate: 0,
        weeklyChangeRate: 0,
        monthlyChangeRate: 0,
        topChannels: []
      }
    }

    // 3. 통계 계산
    const totalChannels = channels.length
    const totalSubscribers = channels.reduce(
      (sum, ch) => sum + (ch.subscribers || 0),
      0
    )
    const totalViews = channels.reduce(
      (sum, ch) => sum + (ch.total_views || 0),
      0
    )
    const totalVideos = channels.reduce(
      (sum, ch) => sum + (ch.video_count || 0),
      0
    )
    const avgViewsPerVideo = totalVideos > 0 ? totalViews / totalVideos : 0

    // 4. 변화율 계산 (채널별 변화율의 평균)
    const dailyChangeRate = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.daily_change_rate || 0), 0) / channels.length
      : 0
    const weeklyChangeRate = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.weekly_change_rate || 0), 0) / channels.length
      : 0
    const monthlyChangeRate = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.monthly_change_rate || 0), 0) / channels.length
      : 0

    // 5. 상위 채널 정렬 (구독자 수 기준)
    const topChannels = channels
      .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
      .slice(0, 10)

    const stats: CategoryStats = {
      code: category.code,
      name: category.name,
      nameEn: category.name_en || '',
      emoji: category.emoji || category.icon || '📊',
      icon: category.icon || category.emoji || '📊',
      totalChannels,
      totalSubscribers,
      totalViews,
      totalVideos,
      avgViewsPerVideo,
      dailyChangeRate,
      weeklyChangeRate,
      monthlyChangeRate,
      topChannels
    }

    console.log(`✅ [Stats Calculator] Stats for ${categoryCode}:`, {
      channels: totalChannels,
      subscribers: (totalSubscribers / 1000000).toFixed(2) + 'M',
      avgViews: (avgViewsPerVideo / 1000).toFixed(1) + 'K'
    })

    return stats
  } catch (error) {
    console.error(`❌ [Stats Calculator] Fatal error for ${categoryCode}:`, error)
    return null
  }
}

/**
 * 모든 카테고리의 통계를 계산
 */
export async function calculateAllCategoryStats(): Promise<CategoryStats[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 [Stats Calculator] Calculating all category stats...')
  console.log('🕐 Timestamp:', new Date().toISOString())

  try {
    // 1. 모든 카테고리 조회
    const { data: categories, error } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error || !categories) {
      console.error('❌ [Stats Calculator] Error fetching categories:', error)
      return []
    }

    console.log(`📋 [Stats Calculator] Found ${categories.length} categories`)

    // 2. 각 카테고리별 통계 계산 (병렬 처리)
    const statsPromises = categories.map(cat =>
      calculateCategoryStats(cat.code)
    )

    const stats = await Promise.all(statsPromises)
    const validStats = stats.filter(Boolean) as CategoryStats[]

    // 3. 전체 통계 요약
    const totalChannelsCount = validStats.reduce((sum, s) => sum + s.totalChannels, 0)
    const totalSubscribersCount = validStats.reduce((sum, s) => sum + s.totalSubscribers, 0)

    console.log('✅ [Stats Calculator] All stats calculated:', {
      categories: validStats.length,
      totalChannels: totalChannelsCount,
      totalSubscribers: (totalSubscribersCount / 1000000).toFixed(2) + 'M'
    })

    // 4. 각 카테고리별 로깅
    validStats.forEach(stat => {
      console.log(`  📊 ${stat.emoji} ${stat.name}: ${stat.totalChannels} channels, ${(stat.totalSubscribers / 1000000).toFixed(1)}M subscribers`)
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return validStats
  } catch (error) {
    console.error('❌ [Stats Calculator] Fatal error:', error)
    return []
  }
}

/**
 * Treemap 데이터 생성
 */
export async function generateTreemapData() {
  const stats = await calculateAllCategoryStats()

  return stats.map(stat => ({
    code: stat.code,
    name: stat.name,
    emoji: stat.emoji,
    value: stat.totalSubscribers,
    channels: stat.totalChannels,
    avgViewsPerVideo: stat.avgViewsPerVideo,
    dailyChange: stat.dailyChangeRate,
    weeklyChange: stat.weeklyChangeRate,
    topChannels: stat.topChannels.map(ch => ({
      name: ch.name || ch.title,
      subscribers: ch.subscribers,
      views_per_video: ch.views_per_video || (ch.total_views / (ch.video_count || 1))
    }))
  }))
}
