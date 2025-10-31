/**
 * YouTube API Simulation Endpoint
 * Pre-calculate costs before executing batch updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { YouTubeAPIQuotaTracker } from '@/lib/youtube/api-quota-tracker'

export async function POST(request: NextRequest) {
  try {
    console.log('[Simulate API] === REQUEST START ===')

    const body = await request.json()
    const { channelIds, updateType = 'bulk_full' } = body

    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'channelIds must be a non-empty array'
        },
        { status: 400 }
      )
    }

    if (!['bulk_full', 'bulk_incremental'].includes(updateType)) {
      return NextResponse.json(
        {
          error: 'Invalid updateType',
          details: 'updateType must be either bulk_full or bulk_incremental'
        },
        { status: 400 }
      )
    }

    console.log('[Simulate API] Simulating update:', {
      channelCount: channelIds.length,
      updateType
    })

    // Run simulation
    const simulation = await YouTubeAPIQuotaTracker.simulateBatchUpdate(
      channelIds,
      updateType as 'bulk_full' | 'bulk_incremental'
    )

    // Get cost comparison
    const costComparison = YouTubeAPIQuotaTracker.getCostComparison()

    // Calculate estimated duration
    const estimatedDurationMs = channelIds.length * 2000 // Rough estimate: 2s per channel
    const estimatedDurationMinutes = Math.ceil(estimatedDurationMs / 60000)

    // Determine if operation is recommended
    const quotaUsagePercentage = (simulation.estimatedTotalCost / 10000) * 100
    const recommendIncremental = simulation.estimatedFullCost > simulation.remainingQuota

    const response = {
      simulation: {
        ...simulation,
        updateType,
        channelIds: channelIds.length,
        quotaUsagePercentage: quotaUsagePercentage.toFixed(1)
      },
      costComparison: {
        perChannel: costComparison,
        total: {
          fullCost: simulation.estimatedFullCost,
          incrementalCost: simulation.estimatedIncrementalCost,
          savings: simulation.potentialSavings,
          savingsPercentage: simulation.potentialSavingsPercentage
        }
      },
      estimatedDuration: {
        milliseconds: estimatedDurationMs,
        minutes: estimatedDurationMinutes,
        formatted: `~${estimatedDurationMinutes} minute${estimatedDurationMinutes > 1 ? 's' : ''}`
      },
      recommendation: {
        canExecute: simulation.canExecute,
        recommendIncremental,
        message: !simulation.canExecute
          ? `Insufficient quota. Need ${simulation.estimatedTotalCost} units but only ${simulation.remainingQuota} available.`
          : recommendIncremental
          ? `Recommended: Use incremental update to save ${simulation.potentialSavings} units (${simulation.potentialSavingsPercentage}% savings)`
          : 'Quota is sufficient for full update'
      },
      timestamp: new Date().toISOString()
    }

    console.log('[Simulate API] ✅ Simulation complete:', {
      canExecute: simulation.canExecute,
      estimatedCost: simulation.estimatedTotalCost,
      remainingQuota: simulation.remainingQuota
    })
    console.log('[Simulate API] === REQUEST END ===')

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error('[Simulate API] ❌ Error:', error)

    return NextResponse.json(
      {
        error: 'Simulation failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
