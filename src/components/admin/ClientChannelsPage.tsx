'use client'

/**
 * Client Channels Page Component
 * 서버에서 받은 데이터를 ChannelManager에 전달하는 클라이언트 컴포넌트
 */

import { useEffect } from 'react'
import { ChannelManager } from './ChannelManager'

interface Category {
  code: string
  name: string
  icon?: string
  emoji?: string
  description?: string
}

interface Channel {
  id: string
  channel_id: string
  name?: string
  title?: string
  category_code: string
  subscriber_count?: number
  total_views?: number
  video_count?: number
  views_per_video?: number
  is_active?: boolean
  status?: string
  created_at?: string
  updated_at?: string
  [key: string]: any
}

interface ClientChannelsPageProps {
  initialChannels: Channel[]
  initialCategories: Category[]
  timestamp?: string
}

export function ClientChannelsPage({
  initialChannels,
  initialCategories,
  timestamp,
}: ClientChannelsPageProps) {
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[ClientChannelsPage] Component mounted')
    console.log(`[ClientChannelsPage] Timestamp: ${timestamp}`)
    console.log(`[ClientChannelsPage] Received Props:`)
    console.log(`  - initialChannels: ${initialChannels?.length || 0} channels`)
    console.log(`  - initialCategories: ${initialCategories?.length || 0} categories`)

    if (initialChannels && initialChannels.length > 0) {
      console.log(`[ClientChannelsPage] First channel:`, initialChannels[0])
      console.log(`[ClientChannelsPage] Channel fields:`, Object.keys(initialChannels[0]))
    } else {
      console.error('[ClientChannelsPage] ❌ NO CHANNELS RECEIVED!')
    }

    if (initialCategories && initialCategories.length > 0) {
      console.log(`[ClientChannelsPage] First category:`, initialCategories[0])
    } else {
      console.error('[ClientChannelsPage] ❌ NO CATEGORIES RECEIVED!')
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, [initialChannels, initialCategories, timestamp])

  // ✅ Transform DB data - Server에서 이미 정규화되어 오므로 그대로 전달
  const transformedChannels = initialChannels?.map(ch => ({
    id: ch.id || ch.channel_id,
    channel_id: ch.channel_id,
    name: ch.name || ch.title || '',
    title: ch.title || ch.name || '',
    category_code: ch.category_code,
    // ✅ CRITICAL: subscribers 필드 사용 (Server에서 이미 정규화됨)
    subscribers: ch.subscribers || ch.subscriber_count || 0,
    total_views: ch.total_views || ch.view_count || 0,
    video_count: ch.video_count || 0,
    views_per_video: ch.views_per_video || 0,
    is_active: ch.is_active,
    status: (ch.status as 'active' | 'inactive' | 'deleted' | 'error' | undefined) || 'active',
    updated_at: ch.updated_at || new Date().toISOString(),
    last_updated: ch.updated_at || ch.last_updated || new Date().toISOString(),
    description: ch.description,
    thumbnail_url: ch.thumbnail_url,
    error_message: ch.error_message,
    last_error_at: ch.last_error_at,
  })) || []

  return (
    <ChannelManager
      initialChannels={transformedChannels}
      initialCategories={initialCategories}
    />
  )
}
