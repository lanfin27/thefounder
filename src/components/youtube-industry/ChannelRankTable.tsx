'use client'

/**
 * Channel Rank Table Component
 *
 * 채널 순위 테이블 (정렬 기능 포함)
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Channel } from '@/types/youtube-industry'
import { formatNumber, formatChangeRate, formatViewsPerVideo } from '@/lib/youtube-industry/utils'

interface ChannelRankTableProps {
  channels: Channel[]
}

type SortField = 'viewsPerVideo' | 'subscribers' | 'dailyChangeRate' | 'weeklyChangeRate'

export default function ChannelRankTable({ channels }: ChannelRankTableProps) {
  const [sortBy, setSortBy] = useState<SortField>('viewsPerVideo')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const sortedChannels = [...channels].sort((a, b) => {
    let aVal: number
    let bVal: number

    switch (sortBy) {
      case 'viewsPerVideo':
        aVal = a.viewsPerVideo || 0
        bVal = b.viewsPerVideo || 0
        break
      case 'subscribers':
        aVal = a.subscribers || 0
        bVal = b.subscribers || 0
        break
      case 'dailyChangeRate':
        aVal = a.dailyChangeRate || 0
        bVal = b.dailyChangeRate || 0
        break
      case 'weeklyChangeRate':
        aVal = a.weeklyChangeRate || 0
        bVal = b.weeklyChangeRate || 0
        break
      default:
        return 0
    }

    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
  }).slice(0, 50)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null

    return sortOrder === 'desc' ? (
      <ChevronDown className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronUp className="w-4 h-4 inline-block ml-1" />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b border-gray-700">
            <th className="pb-3 text-gray-400 font-medium text-sm">순위</th>
            <th className="pb-3 text-gray-400 font-medium text-sm">채널명</th>
            <th
              className="pb-3 text-gray-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('subscribers')}
            >
              구독자 수
              <SortIcon field="subscribers" />
            </th>
            <th
              className="pb-3 text-gray-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('viewsPerVideo')}
            >
              영상당 조회수
              <SortIcon field="viewsPerVideo" />
            </th>
            <th
              className="pb-3 text-gray-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('dailyChangeRate')}
            >
              일간 변화율
              <SortIcon field="dailyChangeRate" />
            </th>
            <th
              className="pb-3 text-gray-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('weeklyChangeRate')}
            >
              주간 변화율
              <SortIcon field="weeklyChangeRate" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedChannels.map((channel, index) => (
            <tr
              key={channel.channelId}
              className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
            >
              <td className="py-4 text-gray-400 text-sm">{index + 1}</td>
              <td className="py-4">
                <div>
                  <p className="font-medium text-white text-sm">{channel.name}</p>
                  {channel.handle && (
                    <p className="text-xs text-gray-500 mt-0.5">{channel.handle}</p>
                  )}
                </div>
              </td>
              <td className="py-4 text-gray-300 text-sm">
                {formatNumber(channel.subscribers)}
              </td>
              <td className="py-4 font-semibold text-white text-sm">
                {formatViewsPerVideo(channel.viewsPerVideo)}
              </td>
              <td className="py-4">
                <span
                  className={`font-medium text-sm ${
                    (channel.dailyChangeRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {formatChangeRate(channel.dailyChangeRate)}
                </span>
              </td>
              <td className="py-4">
                <span
                  className={`font-medium text-sm ${
                    (channel.weeklyChangeRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {formatChangeRate(channel.weeklyChangeRate)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedChannels.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">데이터가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
