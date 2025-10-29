/**
 * YouTube Industry Index Dashboard - Main Page (Server Component)
 * YouTubeIndustryContent로 데이터 전달
 */

import { Metadata } from 'next'
import { ytSupabase } from '@/lib/youtube-supabase/client'
import YouTubeIndustryContent from '@/components/youtube-industry/YouTubeIndustryContent'
import { generateFreshTreemapData, verifyTreemapDataForCategory } from '@/lib/youtube-industry/treemap-data-generator'

export const metadata: Metadata = {
  title: '유튜브 산업지수 | The Founder',
  description: 'Y코드 산업별 유튜브 채널 트렌드와 영상당 조회수 분석 대시보드',
  openGraph: {
    title: '유튜브 산업지수',
    description: 'Y코드 산업별 유튜브 채널 트렌드와 영상당 조회수 분석 대시보드',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: '유튜브 산업지수',
    description: 'Y코드 산업별 유튜브 채널 트렌드와 영상당 조회수 분석 대시보드'
  }
}

// ✅ CRITICAL: 캐싱 완전 비활성화
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function YouTubeIndustryPage() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 [YouTube Industry Page] Server-side data fetching')
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`)

  try {
    // ✅ 카테고리 데이터
    const { data: categories, error: categoriesError } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .order('code', { ascending: true })

    if (categoriesError) throw categoriesError

    console.log(`✅ Fetched ${categories?.length || 0} categories`)

    // ✅ 채널 데이터 (subscribers 사용!)
    const { data: channels, error: channelsError } = await ytSupabase
      .from('youtube_channels')
      .select('*')
      .order('subscribers', { ascending: false})  // ✅ subscribers!

    if (channelsError) throw channelsError

    console.log(`✅ Fetched ${channels?.length || 0} channels`)

    // ✅ 데이터 정규화
    const normalizedChannels = channels.map(ch => ({
      id: ch.id,
      channel_id: ch.channel_id,
      name: ch.name || ch.channel_title || ch.title || 'Unknown',
      channel_title: ch.channel_title || ch.name || ch.title || 'Unknown',
      // ✅ CRITICAL: subscribers 필드 사용!
      subscribers: ch.subscribers || 0,
      subscriber_count: ch.subscribers || 0,  // 호환성
      // ✅ total_views 필드 사용!
      total_views: ch.total_views || 0,
      view_count: ch.total_views || 0,  // 호환성
      video_count: ch.video_count || 0,
      views_per_video: ch.views_per_video || 0,
      category_code: ch.category_code || '',
      status: ch.status || 'active',
      is_active: ch.is_active,
      description: ch.description,
      thumbnail_url: ch.thumbnail_url,
      // Metrics
      daily_change_rate: ch.daily_change_rate || 0,
      weekly_change_rate: ch.weekly_change_rate || 0,
      monthly_change_rate: ch.monthly_change_rate || 0,
      engagement_rate: ch.engagement_rate || 0,
      shorts_ratio: ch.shorts_ratio || 0,
      // Timestamps
      created_at: ch.created_at?.toString(),
      updated_at: ch.updated_at?.toString(),
      last_updated: ch.last_updated?.toString() || ch.updated_at?.toString(),
    }))

    // 우낌표 채널 확인
    const wooxmall = normalizedChannels.find(
      ch => ch.name?.includes('우낌표')
    )
    if (wooxmall) {
      console.log(`🔍 우낌표 채널: ${wooxmall.name} = ${wooxmall.category_code}`)
    }

    // 카테고리별 채널 수 로깅
    console.log('📊 Category distribution:')
    categories.forEach(cat => {
      const catChannels = normalizedChannels.filter(ch => ch.category_code === cat.code)
      const totalSubs = catChannels.reduce((sum, ch) => sum + ch.subscribers, 0)
      console.log(`  ${cat.emoji || cat.icon} ${cat.name}: ${catChannels.length} channels, ${(totalSubs / 1000000).toFixed(1)}M subscribers`)
    })

    console.log('✅ Data normalized and ready')

    // ✅ 🔥 NEW: Treemap 데이터 완전 새로 생성
    console.log('\n🗺️  [Page] Generating fresh Treemap data...')
    const treemapData = await generateFreshTreemapData()
    console.log(`✅ [Page] Treemap data generated: ${treemapData.length} categories`)

    // ✅ 🔥 NEW: 여행 카테고리 검증 (디버깅)
    await verifyTreemapDataForCategory('Y05')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // ✅ Client Component로 전달 + timestamp 추가 + treemap 데이터 추가
    const timestamp = Date.now()
    return (
      <YouTubeIndustryContent
        initialCategories={categories}
        initialChannels={normalizedChannels}
        initialTreemapData={treemapData}
        timestamp={timestamp}
      />
    )
  } catch (error) {
    console.error('❌ Page error:', error)

    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="font-bold">데이터 로딩 실패</h2>
          <p>{error instanceof Error ? error.message : '알 수 없는 오류'}</p>
          <p className="text-sm mt-3">
            💡 Hint: <code>node scripts/check-db-schema.js</code>로 DB 스키마 확인
          </p>
        </div>
      </div>
    )
  }
}
