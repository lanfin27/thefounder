/**
 * YouTube API Quota Check Endpoint
 *
 * POST /api/admin/youtube/quota-check
 *
 * Checks if sufficient API quota exists for bulk channel updates
 *
 * Body: { channelsCount: number }
 *
 * Returns: {
 *   canUpdate: boolean,
 *   maxChannels: number,
 *   remaining: number,
 *   usedToday: number,
 *   requiredUnits: number
 * }
 */

import { YouTubeAPIQuotaTracker } from '@/lib/youtube/api-quota-tracker';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[QuotaCheck API] === REQUEST START ===');

    const body = await request.json();
    const { channelsCount } = body;

    console.log('[QuotaCheck API] Request body:', { channelsCount });

    // Validate input
    if (!channelsCount || channelsCount < 1) {
      console.error('[QuotaCheck API] ❌ Invalid channelsCount:', channelsCount);
      return NextResponse.json(
        {
          error: 'Invalid channelsCount parameter',
          message: 'channelsCount must be a positive integer'
        },
        { status: 400 }
      );
    }

    console.log(`[QuotaCheck API] Checking quota for ${channelsCount} channels...`);

    // Check quota
    const result = await YouTubeAPIQuotaTracker.canUpdate(channelsCount);

    console.log(`[QuotaCheck API] ✅ Quota check result:`, result);
    console.log('[QuotaCheck API] === REQUEST END ===');

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('[QuotaCheck API] ❌ Error:', error);
    console.error('[QuotaCheck API] Error stack:', error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
