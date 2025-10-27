/**
 * YouTube Industry Index Dashboard - Main Page
 *
 * 완전한 클라이언트 사이드 렌더링으로 Hydration Error 방지
 */

import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: '유튜브 산업지수 | The Founder',
  description: 'Y코드 산업별 유튜브 채널 트렌드와 영상당 조회수 분석 대시보드',
  openGraph: {
    title: '유튜브 산업지수',
    description: 'Y코드 산업별 유튜브 채널 트렌드와 영상당 조회수 분석 대시보드',
    type: 'website'
  }
}

// 🔥 SSR 완전 비활성화 - Hydration Error 방지
const YouTubeIndustryContent = dynamic(
  () => import('@/components/youtube-industry/YouTubeIndustryContent'),
  {
    ssr: false,
    loading: () => (
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
            <span className="text-sm font-medium">초기화 중...</span>
          </div>
        </main>
      </div>
    )
  }
)

export default function YouTubeIndustryPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  유튜브 산업지수
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Y코드 산업별 채널 트렌드 및 영상당 조회수 분석
                </p>
              </div>

              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                    <span className="text-gray-600 dark:text-gray-400">상승</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-red-600"></div>
                    <span className="text-gray-600 dark:text-gray-400">하락</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
                    <span className="text-gray-600 dark:text-gray-400">보합</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard - Client Side Only */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <YouTubeIndustryContent />
        </main>

        {/* Footer Info */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                데이터는 매일 업데이트되며, 영상당 조회수를 기준으로 산업 규모를 측정합니다.
              </p>
              <p className="mt-1">
                사각형 크기 = 평균 영상당 조회수 | 색상 = 일간 변화율
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
