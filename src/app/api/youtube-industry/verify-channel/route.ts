/**
 * YouTube Channel Verification API
 *
 * Verifies a single channel ID using YouTube Data API
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const youtube = google.youtube('v3')

export async function POST(request: NextRequest) {
  try {
    const { channel_id } = await request.json()

    if (!channel_id) {
      return NextResponse.json(
        { error: 'channel_id is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.YOUTUBE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      )
    }

    // Verify channel exists via YouTube API
    const response = await youtube.channels.list({
      key: apiKey,
      part: ['snippet', 'statistics'],
      id: [channel_id]
    })

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0]

      return NextResponse.json({
        valid: true,
        channel_id: channel.id,
        name: channel.snippet?.title || '',
        custom_url: channel.snippet?.customUrl,
        subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
        thumbnail: channel.snippet?.thumbnails?.default?.url
      })
    } else {
      return NextResponse.json({
        valid: false,
        error: 'Channel not found on YouTube'
      })
    }
  } catch (error: any) {
    console.error('[Verify Channel] Error:', error.message)
    return NextResponse.json(
      { valid: false, error: error.message },
      { status: 500 }
    )
  }
}
