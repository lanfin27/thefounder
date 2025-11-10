/**
 * Multi-Source Sync API
 * POST /api/admin/sync - Sync from one or multiple Notion sources
 *
 * Request body options:
 * - { sourceId: "uuid" } - Sync single source
 * - { sourceIds: ["uuid1", "uuid2"] } - Sync multiple sources
 * - { syncAll: true } - Sync all active sources
 */

import { NextRequest, NextResponse } from 'next/server'
import { MultiSyncService } from '@/lib/services/multiSyncService'

const syncService = new MultiSyncService()

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for long sync operations

// POST /api/admin/sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log(`\n[API] 📡 Received sync request:`, body)

    let result

    if (body.syncAll) {
      // Sync all active sources
      console.log(`\n🌐 [API] ═══════════ BULK SYNC MODE ═══════════`)
      console.log('[API] ✅ Mode: BULK (syncing ALL active sources)')
      console.log('[API] 🌐 Syncing ALL active sources...')
      console.log(`════════════════════════════════════════════════════\n`)
      result = await syncService.syncAll()
    } else if (body.sourceIds && Array.isArray(body.sourceIds)) {
      // Sync multiple selected sources
      console.log(`\n🔄 [API] ═══════════ MULTIPLE SYNC MODE ═══════════`)
      console.log(`[API] ✅ Mode: MULTIPLE (syncing ${body.sourceIds.length} sources)`)
      console.log(`[API] 📋 Source IDs:`, body.sourceIds)
      console.log(`════════════════════════════════════════════════════\n`)
      result = await syncService.syncMultiple(body.sourceIds)
    } else if (body.sourceId) {
      // Sync single source
      console.log(`\n🎯 [API] ═══════════ INDIVIDUAL SYNC MODE ═══════════`)
      console.log(`[API] ✅ Mode: INDIVIDUAL (syncing ONLY this source)`)
      console.log(`[API] 📡 Source ID: ${body.sourceId}`)
      console.log(`════════════════════════════════════════════════════\n`)
      const singleResult = await syncService.syncSource(body.sourceId)
      result = {
        results: [singleResult],
        totalPosts: singleResult.postsCount,
        successCount: singleResult.success ? 1 : 0,
        failureCount: singleResult.success ? 0 : 1
      }
    } else {
      console.log('[API] ❌ Invalid request body:', body)
      return NextResponse.json(
        { error: 'Invalid request body. Provide sourceId, sourceIds, or syncAll' },
        { status: 400 }
      )
    }

    console.log(`[API /admin/sync] ✅ Sync complete: ${result.totalPosts} total posts, ${result.successCount} succeeded, ${result.failureCount} failed`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API /admin/sync] ❌ POST Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
