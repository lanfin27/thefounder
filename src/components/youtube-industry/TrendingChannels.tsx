'use client'

/**
 * Trending Channels Component
 *
 * 급등/급락 채널 표시 (분리된 섹션)
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface TrendingChannelsProps {
  trending: {
    rising: any[]
    falling: any[]
  }
}

export default function TrendingChannels({ trending }: TrendingChannelsProps) {
  // 급등 채널 정렬 (일간 변화율 기준)
  const risingChannels = useMemo(() => {
    return trending.rising
      .filter(ch => ch.daily_change_rate !== null && ch.daily_change_rate !== undefined)
      .sort((a, b) => Math.abs(b.daily_change_rate || 0) - Math.abs(a.daily_change_rate || 0))
      .slice(0, 10)
  }, [trending.rising])

  // 급락 채널 정렬 (일간 변화율 기준)
  const fallingChannels = useMemo(() => {
    return trending.falling
      .filter(ch => ch.daily_change_rate !== null && ch.daily_change_rate !== undefined)
      .sort((a, b) => Math.abs(a.daily_change_rate || 0) - Math.abs(b.daily_change_rate || 0))
      .slice(0, 10)
  }, [trending.falling])

  const formatSubscribers = (subs: number) => {
    if (!subs) return '0'
    if (subs >= 1000000) return `${(subs / 1000000).toFixed(1)}M`
    if (subs >= 1000) return `${(subs / 1000).toFixed(0)}K`
    return subs.toString()
  }

  const formatViews = (views: number) => {
    if (!views) return '0'
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`
    return views.toString()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 급등 채널 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🚀</div>
            <div>
              <CardTitle className="text-lg">급등 채널</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                영상당 조회수 변화율 상위
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {risingChannels.length > 0 ? (
              risingChannels.map((channel, idx) => (
                <a
                  key={channel.channel_id || channel.id}
                  href={`https://youtube.com/channel/${channel.channel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer border border-transparent hover:border-green-200 dark:hover:border-green-800"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" title={channel.name}>
                        {channel.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSubscribers(channel.subscribers || 0)} 구독자
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-green-600 dark:text-green-400 font-bold text-sm">
                      {channel.daily_change_rate > 0 ? '+' : ''}
                      {(channel.daily_change_rate || 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatViews(channel.views_per_video || 0)}/영상
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                급등 채널 없음
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 급락 채널 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl">📉</div>
            <div>
              <CardTitle className="text-lg">급락 채널</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                영상당 조회수 변화율 하위
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fallingChannels.length > 0 ? (
              fallingChannels.map((channel, idx) => (
                <a
                  key={channel.channel_id || channel.id}
                  href={`https://youtube.com/channel/${channel.channel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-800"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" title={channel.name}>
                        {channel.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSubscribers(channel.subscribers || 0)} 구독자
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-red-600 dark:text-red-400 font-bold text-sm">
                      {(channel.daily_change_rate || 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatViews(channel.views_per_video || 0)}/영상
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                급락 채널 없음
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
