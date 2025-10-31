/**
 * YouTube API Usage Endpoint
 *
 * GET /api/admin/youtube/usage
 *
 * Returns today's API usage statistics and weekly trend
 *
 * Returns: {
 *   date: string,
 *   totalUsed: number,
 *   remaining: number,
 *   quota: number,
 *   percentage: number,
 *   usage: Array<UsageRecord>,
 *   weeklyTrend: Array<WeeklyData>
 * }
 */

import { YouTubeAPIQuotaTracker } from '@/lib/youtube/api-quota-tracker';
import { ytSupabase } from '@/lib/youtube-supabase/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Usage API] === REQUEST START ===');

    const today = new Date().toISOString().split('T')[0];

    console.log(`[Usage API] Fetching usage data for ${today}...`);

    // Get today's detailed usage
    const { data: usageData, error: usageError } = await ytSupabase
      .from('youtube_api_usage')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (usageError) {
      console.error('[Usage API] ❌ Error fetching usage data:', usageError);
      throw usageError;
    }

    console.log(`[Usage API] ✅ Fetched ${usageData?.length || 0} usage records`);

    // Calculate totals
    const totalUsed = usageData?.reduce((sum, row) => sum + row.units_used, 0) || 0;
    const quota = 10000;
    const remaining = Math.max(0, quota - totalUsed);
    const percentage = (totalUsed / quota) * 100;

    console.log(`[Usage API] 📊 Today's summary:`, {
      totalUsed,
      remaining,
      percentage: `${percentage.toFixed(1)}%`
    });

    // Get weekly trend
    console.log('[Usage API] Fetching weekly trend...');
    const weeklyTrend = await YouTubeAPIQuotaTracker.getWeeklyUsage();
    console.log(`[Usage API] ✅ Fetched ${weeklyTrend.length} days of trend data`);

    // Get operation breakdown
    const operations = usageData?.reduce((acc: any, row) => {
      if (!acc[row.operation_type]) {
        acc[row.operation_type] = {
          count: 0,
          unitsUsed: 0,
          successCount: 0,
          failureCount: 0
        };
      }
      acc[row.operation_type].count++;
      acc[row.operation_type].unitsUsed += row.units_used;
      if (row.success) {
        acc[row.operation_type].successCount++;
      } else {
        acc[row.operation_type].failureCount++;
      }
      return acc;
    }, {});

    console.log('[Usage API] 📊 Operation breakdown:', operations);

    const response = {
      date: today,
      totalUsed,
      remaining,
      quota,
      percentage,
      usage: usageData || [],
      weeklyTrend,
      operations: operations || {},
      meta: {
        recordCount: usageData?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('[Usage API] ✅ Response prepared successfully');
    console.log('[Usage API] === REQUEST END ===');

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('[Usage API] ❌ Error:', error);
    console.error('[Usage API] Error stack:', error.stack);

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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
