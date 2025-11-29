/**
 * YouTube Channel Update API
 *
 * Updates a channel's channel_id in the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const youtube = google.youtube('v3')

export async function POST(request: NextRequest) {
  try {
    const { old_channel_id, new_channel_id } = await request.json()

    if (!old_channel_id || !new_channel_id) {
      return NextResponse.json(
        { error: 'old_channel_id and new_channel_id are required' },
        { status: 400 }
      )
    }

    // Validate new channel ID format
    if (!new_channel_id.startsWith('UC') || new_channel_id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid channel ID format. Must be UC + 24 characters' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
    const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    // Verify new channel ID exists on YouTube
    const apiKey = process.env.YOUTUBE_API_KEY

    if (apiKey) {
      try {
        const response = await youtube.channels.list({
          key: apiKey,
          part: ['snippet', 'statistics'],
          id: [new_channel_id]
        })

        if (!response.data.items || response.data.items.length === 0) {
          return NextResponse.json(
            { error: 'New channel ID not found on YouTube' },
            { status: 400 }
          )
        }

        // Get updated channel data
        const channel = response.data.items[0]
        const updatedName = channel.snippet?.title || ''
        const updatedSubscribers = parseInt(channel.statistics?.subscriberCount || '0')

        // Update in database
        const { error: updateError } = await supabase
          .from('youtube_channels')
          .update({
            channel_id: new_channel_id,
            name: updatedName,
            subscribers: updatedSubscribers,
            last_updated: new Date().toISOString()
          })
          .eq('channel_id', old_channel_id)

        if (updateError) {
          console.error('[Update Channel] Database error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update channel in database' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          channel_id: new_channel_id,
          name: updatedName,
          subscribers: updatedSubscribers
        })
      } catch (error: any) {
        console.error('[Update Channel] YouTube API error:', error.message)
        // Continue with update even if YouTube verification fails
      }
    }

    // Update without YouTube verification if API key not available
    const { error: updateError } = await supabase
      .from('youtube_channels')
      .update({
        channel_id: new_channel_id,
        last_updated: new Date().toISOString()
      })
      .eq('channel_id', old_channel_id)

    if (updateError) {
      console.error('[Update Channel] Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update channel in database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      channel_id: new_channel_id
    })
  } catch (error: any) {
    console.error('[Update Channel] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
