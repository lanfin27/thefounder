'use client'

/**
 * YouTube Industry Content - Client Component
 *
 * Props를 통해 서버에서 페칭한 데이터를 받거나, 없으면 클라이언트에서 페칭
 */

import { useState, useEffect } from 'react'
import YouTubeIndustryDashboard from './YouTubeIndustryDashboard'

interface YouTubeIndustryContentProps {
  initialCategories?: any[]
  initialChannels?: any[]
}

export default function YouTubeIndustryContent({
  initialCategories,
  initialChannels,
}: YouTubeIndustryContentProps = {}) {
  const [categories, setCategories] = useState<any[]>(initialCategories || [])
  const [channels, setChannels] = useState<any[]>(initialChannels || [])
  const [isLoading, setIsLoading] = useState(!initialCategories || !initialChannels)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[YouTubeIndustryContent Client] Component mounted')
    console.log(`[YouTubeIndustryContent] Received Props:`)
    console.log(`  - initialCategories: ${initialCategories?.length || 0} items`)
    console.log(`  - initialChannels: ${initialChannels?.length || 0} items`)

    // Only fetch if data wasn't provided via props
    if (initialCategories && initialChannels) {
      console.log('[YouTubeIndustryContent] ✅ Using server-fetched data (Props)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return
    }

    console.log('[YouTubeIndustryContent] ⚠️ Props missing - falling back to client fetch')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    async function fetchData() {
      const startTime = Date.now()

      try {
        setIsLoading(true)
        console.log('[YouTubeIndustryContent] 🚀 Starting data load...')

        // 🔥 Step 1: 카테고리 데이터 페칭
        console.log('[YouTubeIndustryContent] 📂 Fetching categories from API...')
        const categoriesRes = await fetch('/api/youtube-industry/categories')
        console.log('[YouTubeIndustryContent] 📂 Categories response status:', categoriesRes.status, categoriesRes.statusText)

        if (!categoriesRes.ok) {
          const errorText = await categoriesRes.text()
          console.error('[YouTubeIndustryContent] ❌ Categories API failed:', errorText)
          throw new Error(`카테고리 API 실패: ${categoriesRes.status} ${errorText}`)
        }

        const categoriesResponse = await categoriesRes.json()
        console.log('[YouTubeIndustryContent] 📂 Categories raw response:', {
          type: typeof categoriesResponse,
          keys: Object.keys(categoriesResponse || {}),
          hasData: 'data' in (categoriesResponse || {}),
          success: categoriesResponse?.success
        })

        // API 응답 형식 처리: { success, data } 또는 직접 배열
        const categoriesData = categoriesResponse?.data || categoriesResponse
        console.log('[YouTubeIndustryContent] 📂 Categories data extracted:', {
          type: typeof categoriesData,
          isArray: Array.isArray(categoriesData),
          length: Array.isArray(categoriesData) ? categoriesData.length : 'N/A',
          sample: categoriesData[0]
        })

        // 🔥 Step 2: 채널 데이터 페칭
        console.log('[YouTubeIndustryContent] 📺 Fetching channels from API...')
        const channelsRes = await fetch('/api/admin/youtube/channels')
        console.log('[YouTubeIndustryContent] 📺 Channels response status:', channelsRes.status, channelsRes.statusText)

        if (!channelsRes.ok) {
          const errorText = await channelsRes.text()
          console.error('[YouTubeIndustryContent] ❌ Channels API failed:', errorText)
          throw new Error(`채널 API 실패: ${channelsRes.status} ${errorText}`)
        }

        const channelsResponse = await channelsRes.json()
        console.log('[YouTubeIndustryContent] 📺 Channels raw response:', {
          type: typeof channelsResponse,
          keys: Object.keys(channelsResponse || {}),
          isArray: Array.isArray(channelsResponse),
          hasData: 'data' in (channelsResponse || {})
        })

        // API 응답 형식 처리: { success, data } 또는 직접 배열
        const channelsData = channelsResponse?.data || channelsResponse
        console.log('[YouTubeIndustryContent] 📺 Channels data extracted:', {
          type: typeof channelsData,
          isArray: Array.isArray(channelsData),
          length: Array.isArray(channelsData) ? channelsData.length : 'N/A',
          sample: channelsData[0]
        })

        // 🔥 Step 3: 데이터 타입 검증
        if (!Array.isArray(categoriesData)) {
          console.error('[YouTubeIndustryContent] ❌ Categories is not an array:', categoriesData)
          throw new Error('카테고리 데이터가 배열이 아닙니다')
        }

        if (!Array.isArray(channelsData)) {
          console.error('[YouTubeIndustryContent] ❌ Channels is not an array:', channelsData)
          throw new Error('채널 데이터가 배열이 아닙니다')
        }

        // 🔥 Step 4: 빈 데이터 체크
        if (categoriesData.length === 0) {
          console.error('[YouTubeIndustryContent] ❌ Categories array is empty')
          throw new Error('카테고리 데이터가 비었습니다. 데이터베이스를 확인해주세요.')
        }

        if (channelsData.length === 0) {
          console.error('[YouTubeIndustryContent] ❌ Channels array is empty')
          throw new Error('채널 데이터가 비었습니다. 필터 조건을 확인해주세요.')
        }

        const loadTime = Date.now() - startTime
        console.log(`[YouTubeIndustryContent] ✅ Success! Load time: ${loadTime}ms`)
        console.log(`[YouTubeIndustryContent] 📊 Final data: ${categoriesData.length} categories, ${channelsData.length} channels`)

        setCategories(categoriesData)
        setChannels(channelsData)
        setError(null)
      } catch (err) {
        const loadTime = Date.now() - startTime
        console.error(`[YouTubeIndustryContent] ❌ Fatal error after ${loadTime}ms:`, err)
        console.error('[YouTubeIndustryContent] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown',
          type: err instanceof Error ? err.constructor.name : typeof err,
          stack: err instanceof Error ? err.stack : undefined
        })
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Loading Skeleton */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            {/* Market Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>

            {/* Market Map Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-96 bg-gray-100 dark:bg-gray-900 rounded-lg"></div>
            </div>

            {/* Trending Channels Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading Message */}
          <div className="fixed bottom-8 right-8 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm font-medium">데이터 로딩 중...</span>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                데이터를 불러올 수 없습니다
              </h2>
              <p className="text-yellow-800 dark:text-yellow-200 mb-4 break-words">
                {error}
              </p>
            </div>

            <div className="flex gap-3 justify-center mb-6">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
              >
                새로고침
              </button>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-yellow-300 dark:border-yellow-700">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                💡 문제 해결 방법:
              </p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2 list-disc list-inside">
                <li><strong>브라우저 콘솔 확인:</strong> F12 키를 눌러 Console 탭에서 상세 로그 확인</li>
                <li><strong>데이터베이스 확인:</strong> Supabase에 youtube_categories와 youtube_channels 테이블에 데이터가 있는지 확인</li>
                <li><strong>채널 추가:</strong> /admin/youtube-channels 페이지에서 채널을 추가하세요</li>
                <li><strong>필터 조건:</strong> status='deleted'나 is_active=false인 채널이 너무 많지 않은지 확인</li>
                <li><strong>환경변수:</strong> .env.local 파일에 NEXT_PUBLIC_YT_SUPABASE_URL과 키가 설정되어 있는지 확인</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (categories.length === 0 && channels.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
          ⚠️ 데이터가 없습니다
        </h2>
        <p className="text-yellow-800 dark:text-yellow-200 mb-4">
          YouTube Industry Index 데이터를 불러올 수 없습니다.
        </p>
        <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
          <p>다음 단계를 확인하세요:</p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>.env.local 파일의 환경변수 확인</li>
            <li>npm run yt:update-real-channels 실행</li>
            <li>npm run yt:smart-update 실행</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <YouTubeIndustryDashboard
      initialCategories={categories}
      initialChannels={channels}
    />
  )
}
