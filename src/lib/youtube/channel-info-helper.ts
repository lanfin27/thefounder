/**
 * YouTube Channel Info Helper
 * Fetches channel information from YouTube Data API
 */

import { google } from 'googleapis'
import { parseYouTubeUrl, toYouTubeApiParam } from '../youtube-url-parser'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

export interface YouTubeChannelInfo {
  channelId: string
  title: string
  customUrl?: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  thumbnailUrl: string
  description?: string
}

export async function getYouTubeChannelInfo(
  urlOrIdentifier: string
): Promise<YouTubeChannelInfo | null> {
  try {
    console.log('[ChannelInfoHelper] Fetching info for:', urlOrIdentifier)

    // Parse URL
    const parsed = parseYouTubeUrl(urlOrIdentifier)
    if (!parsed) {
      console.error('[ChannelInfoHelper] Invalid YouTube URL')
      return null
    }

    let channelId: string | null = null

    // If it's already a channel ID
    if (parsed.type === 'channel-id') {
      channelId = parsed.value
    } else {
      // Search for channel using handle or username
      const apiParam = toYouTubeApiParam(parsed)

      try {
        const searchResponse = await youtube.search.list({
          part: ['snippet'],
          q: parsed.value,
          type: ['channel'],
          maxResults: 1
        })

        channelId = searchResponse.data.items?.[0]?.snippet?.channelId || null
      } catch (searchError) {
        console.error('[ChannelInfoHelper] Search error:', searchError)
      }
    }

    if (!channelId) {
      console.error('[ChannelInfoHelper] Channel ID not found')
      return null
    }

    // Fetch channel details
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'brandingSettings'],
      id: [channelId]
    })

    const channel = response.data.items?.[0]
    if (!channel) {
      console.error('[ChannelInfoHelper] Channel not found')
      return null
    }

    const result: YouTubeChannelInfo = {
      channelId: channel.id!,
      title: channel.snippet?.title || '',
      customUrl: channel.snippet?.customUrl,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      thumbnailUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || '',
      description: channel.snippet?.description
    }

    console.log('[ChannelInfoHelper] ✅ Found:', result.title)

    return result

  } catch (error: any) {
    console.error('[ChannelInfoHelper] Error fetching channel info:', error.message)
    return null
  }
}
