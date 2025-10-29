/**
 * YouTube Industry Channels Management Page (Server Component)
 * 채널 관리 페이지 - ClientChannelsPage로 데이터 전달
 */

import { ytSupabase } from '@/lib/youtube-supabase/client'
import { ClientChannelsPage } from '@/components/admin/ClientChannelsPage'

// ✅ CRITICAL: 캐싱 완전 비활성화
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function AdminChannelsPage() {
  const timestamp = new Date().toISOString()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔄 [Admin Channels Page] Server rendering at: ${timestamp}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // ✅ CRITICAL: subscribers 사용 (수정된 컬럼명!)
    const { data: channels, error: channelsError } = await ytSupabase
      .from('youtube_channels')
      .select('*')
      .order('subscribers', { ascending: false })  // ✅ subscribers!

    console.log(`📦 Fetched channels:`, {
      count: channels?.length || 0,
      error: channelsError ? 'YES' : 'NO',
      errorMessage: channelsError?.message || 'none',
      sample: channels?.[0] ? {
        id: channels[0].channel_id,
        name: channels[0].name,
        subscribers: channels[0].subscribers,  // ✅ subscribers
        category: channels[0].category_code
      } : 'no data'
    })

    const { data: categories, error: categoriesError } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .order('code', { ascending: true })

    console.log(`📦 Fetched categories:`, {
      count: categories?.length || 0,
      error: categoriesError ? 'YES' : 'NO',
    })

    // 에러 처리
    if (channelsError || categoriesError) {
      console.error('❌ Database error:', {
        channelsError,
        categoriesError
      })

      return (
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="font-bold text-xl mb-2">데이터베이스 오류</h2>
            <p className="mb-2">채널 데이터를 불러올 수 없습니다.</p>
            {channelsError && (
              <div className="bg-red-50 p-3 rounded mt-2">
                <p className="font-mono text-sm">{channelsError.message}</p>
              </div>
            )}
            {categoriesError && (
              <div className="bg-red-50 p-3 rounded mt-2">
                <p className="font-mono text-sm">{categoriesError.message}</p>
              </div>
            )}
            <p className="text-sm mt-3">
              💡 Hint: DB 스키마를 확인하세요. <code>node scripts/check-db-schema.js</code>
            </p>
          </div>
        </div>
      )
    }

    // 데이터 없음 처리
    if (!channels || channels.length === 0) {
      console.warn('⚠️ No channels found in database!')

      return (
        <div className="container mx-auto p-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <h2 className="font-bold text-xl mb-2">데이터 없음</h2>
            <p>데이터베이스에 채널이 없습니다.</p>
            <p className="text-sm mt-2">먼저 채널을 추가해주세요.</p>
          </div>
        </div>
      )
    }

    // ✅ 데이터 정규화 (subscribers 필드 유지!)
    const normalizedChannels = channels.map(ch => ({
      id: ch.id,
      channel_id: ch.channel_id,
      name: ch.name || ch.channel_title || ch.title || 'Unknown',
      title: ch.title || ch.name || ch.channel_title || 'Unknown',
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
      created_at: ch.created_at?.toString(),
      updated_at: ch.updated_at?.toString(),
      last_updated: ch.updated_at?.toString(),
      error_message: ch.error_message,
      last_error_at: ch.last_error_at?.toString(),
    }))

    // 우낌표 채널 확인
    const wooxmall = normalizedChannels.find(
      ch => ch.name?.includes('우낌표')
    )

    if (wooxmall) {
      console.log('🔍 우낌표 채널 상태:', {
        id: wooxmall.channel_id,
        name: wooxmall.name,
        category: wooxmall.category_code,
        subscribers: wooxmall.subscribers
      })
    }

    console.log('✅ Data normalized and ready for Client Component')
    console.log(`✅ Passing ${normalizedChannels.length} channels to ClientChannelsPage`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // ✅ Client Component로 전달 (기존 구조 복원!)
    return (
      <ClientChannelsPage
        initialChannels={normalizedChannels}
        initialCategories={categories}
        timestamp={timestamp}
      />
    )
  } catch (error) {
    console.error('❌ Fatal Error:', error)

    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="font-bold text-xl mb-2">심각한 오류</h2>
          <p>{error instanceof Error ? error.message : '알 수 없는 오류'}</p>
        </div>
      </div>
    )
  }
}
