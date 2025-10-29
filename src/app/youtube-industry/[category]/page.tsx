'use client'

/**
 * YouTube Industry Category Detail Page
 * All logic integrated in single file to avoid UTF-8 encoding issues
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CategoryChart from '@/components/youtube-industry/CategoryChart'
import ChannelComparisonChart from '@/components/youtube-industry/ChannelComparisonChart'
import { getIndustryIcon, getIndustryName } from '@/lib/industry-icons'

interface Category {
  code: string
  name: string
  icon?: string
  description?: string
  avg_views_per_video?: number
}

interface Channel {
  id: string
  channel_id: string
  name: string
  handle?: string
  subscribers: number
  total_views: number
  video_count?: number
  views_per_video?: number
  thumbnail_url?: string
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const categoryCode = (params.category as string).toUpperCase()

  const [mounted, setMounted] = useState(false)
  const [category, setCategory] = useState<Category | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    loadData()
  }, [mounted, categoryCode])

  const loadData = async () => {
    const startTime = Date.now()
    console.log('[Category Page] 🚀 Loading data for:', categoryCode)

    try {
      // 🔥 Create browser client (uses YouTube Industry Supabase)
      const supabase = createClient()
      console.log('[Category Page] ✅ Supabase client created')

      // Load category info
      const { data: categoryData, error: categoryError } = await supabase
        .from('youtube_categories')
        .select('*')
        .eq('code', categoryCode)
        .single()

      console.log('[Category Page] 📂 Category result:', {
        error: categoryError,
        hasData: !!categoryData,
      })

      if (categoryError) {
        throw new Error('Category not found: ' + categoryError.message)
      }

      // Load channels
      const { data: channelsData, error: channelsError } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('category_code', categoryCode)
        .neq('status', 'deleted')
        .eq('is_active', true)
        .order('subscribers', { ascending: false })

      console.log('[Category Page] 📺 Channels result:', {
        error: channelsError,
        count: channelsData?.length || 0,
      })

      if (channelsError) {
        throw new Error('Failed to load channels: ' + channelsError.message)
      }

      const totalTime = Date.now() - startTime
      console.log(`[Category Page] ✅ Success in ${totalTime}ms:`, {
        category: categoryData.name,
        channels: channelsData?.length || 0,
      })

      setCategory(categoryData)
      setChannels(Array.isArray(channelsData) ? channelsData : [])
      setError(null)

    } catch (err) {
      console.error('[Category Page] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading category data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Failed to load data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Category not found'}
          </p>

          <div className="space-y-3">
            <button
              onClick={loadData}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              Retry
            </button>

            <button
              onClick={() => router.push('/youtube-industry')}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/youtube-industry')}
            className="mb-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
          >
            <span className="mr-2">←</span>
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-4xl">{category.icon || getIndustryIcon(categoryCode)}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {category.name || getIndustryName(categoryCode)}
              </h1>
              {category.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Channels</div>
            <div className="text-3xl font-bold text-blue-600">{channels.length}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Subscribers</div>
            <div className="text-3xl font-bold text-purple-600">
              {formatNumber(channels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Views</div>
            <div className="text-3xl font-bold text-green-600">
              {formatNumber(channels.reduce((sum, ch) => sum + (ch.total_views || 0), 0))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Views/Video</div>
            <div className="text-3xl font-bold text-orange-600">
              {formatNumber(category.avg_views_per_video || 0)}
            </div>
          </div>
        </div>

        {/* Market Volatility Chart */}
        <div className="mb-8">
          <CategoryChart
            categoryCode={categoryCode}
            onPeriodChange={setPeriod}
          />
        </div>

        {/* Channel Comparison Chart */}
        <div className="mb-8">
          <ChannelComparisonChart
            categoryCode={categoryCode}
            channels={channels}
            period={period}
          />
        </div>

        {/* Channel List */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Channel List ({channels.length})
        </h2>

        {channels.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No channels in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <a
                key={channel.id}
                href={`https://www.youtube.com/channel/${channel.channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${channel.name} on YouTube`}
                title={`${channel.name} YouTube 채널로 이동`}
                className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {channel.thumbnail_url ? (
                    <img
                      src={channel.thumbnail_url}
                      alt={channel.name}
                      className="w-16 h-16 rounded-full flex-shrink-0 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0">
                      📺
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 truncate text-gray-900 dark:text-white">
                      {channel.name}
                    </h3>
                    {channel.handle && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        @{channel.handle}
                      </p>
                    )}

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Subscribers</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(channel.subscribers)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Views</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(channel.total_views)}
                        </span>
                      </div>
                      {channel.video_count && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Videos</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(channel.video_count)}
                          </span>
                        </div>
                      )}
                      {channel.views_per_video && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Per Video</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(channel.views_per_video)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* External link indicator */}
                <div className="mt-3 flex items-center justify-end text-blue-600 dark:text-blue-400 text-xs font-medium">
                  <span>YouTube에서 보기</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
