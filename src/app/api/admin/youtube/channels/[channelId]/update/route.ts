/**
 * YouTube Admin Single Channel Update API
 * 개별 채널 업데이트
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeService } from '@/lib/youtube/youtube-service'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const channelId = params.channelId
    console.log('Updating single channel:', channelId)

    const service = new YouTubeService()
    const result = await service.updateChannelData(channelId)

    return NextResponse.json({
      success: true,
      channel: result.channel,
      message: '채널이 업데이트되었습니다'
    })
  } catch (error) {
    console.error('Channel update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
