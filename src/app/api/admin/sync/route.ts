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
import { revalidateAllPosts } from '@/lib/cache/revalidation'

const syncService = new MultiSyncService()

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for long sync operations

// POST /api/admin/sync
export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()

  try {
    console.log(`\n\n╔════════════════════════════════════════════════════════╗`)
    console.log(`║           NOTION SYNC API REQUEST RECEIVED            ║`)
    console.log(`╚════════════════════════════════════════════════════════╝\n`)

    const body = await request.json()
    console.log(`[API] 📡 Request body:`, JSON.stringify(body, null, 2))

    let result

    if (body.syncAll) {
      // Sync all active sources
      console.log(`\n🌐 [API] ═══════════ BULK SYNC MODE ═══════════`)
      console.log('[API] ✅ Mode: BULK (syncing ALL active sources)')
      console.log('[API] 🌐 Syncing ALL active sources...')
      console.log(`════════════════════════════════════════════════════\n`)

      result = await syncService.syncAll()

      console.log(`\n[API] 📊 BULK SYNC RESULTS:`)
      console.log(`  - Total sources: ${result.results?.length || 0}`)
      console.log(`  - Successful: ${result.successCount}`)
      console.log(`  - Failed: ${result.failureCount}`)
      console.log(`  - Total posts: ${result.totalPosts}`)

    } else if (body.sourceIds && Array.isArray(body.sourceIds)) {
      // Sync multiple selected sources
      console.log(`\n🔄 [API] ═══════════ MULTIPLE SYNC MODE ═══════════`)
      console.log(`[API] ✅ Mode: MULTIPLE (syncing ${body.sourceIds.length} sources)`)
      console.log(`[API] 📋 Source IDs:`, body.sourceIds)
      console.log(`════════════════════════════════════════════════════\n`)

      result = await syncService.syncMultiple(body.sourceIds)

      console.log(`\n[API] 📊 MULTIPLE SYNC RESULTS:`)
      console.log(`  - Sources synced: ${body.sourceIds.length}`)
      console.log(`  - Successful: ${result.successCount}`)
      console.log(`  - Failed: ${result.failureCount}`)
      console.log(`  - Total posts: ${result.totalPosts}`)

    } else if (body.sourceId) {
      // Sync single source
      console.log(`\n🎯 [API] ═══════════ INDIVIDUAL SYNC MODE ═══════════`)
      console.log(`[API] ✅ Mode: INDIVIDUAL (syncing ONLY this source)`)
      console.log(`[API] 📡 Source ID: ${body.sourceId}`)
      console.log(`════════════════════════════════════════════════════\n`)

      const singleResult = await syncService.syncSource(body.sourceId)

      console.log(`\n[API] 📊 SINGLE SYNC RESULT:`)
      console.log(`  - Source: ${singleResult.sourceName}`)
      console.log(`  - Success: ${singleResult.success ? 'YES ✅' : 'NO ❌'}`)
      console.log(`  - Posts: ${singleResult.postsCount}`)
      console.log(`  - Duration: ${((singleResult.duration ?? 0) / 1000).toFixed(2)}s`)
      if (singleResult.error) {
        console.log(`  - Error: ${singleResult.error}`)
      }

      result = {
        results: [singleResult],
        totalPosts: singleResult.postsCount,
        successCount: singleResult.success ? 1 : 0,
        failureCount: singleResult.success ? 0 : 1
      }
    } else {
      console.error('[API] ❌ Invalid request body:', body)
      console.error('[API] ❌ Missing required fields: sourceId, sourceIds, or syncAll')

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Provide sourceId, sourceIds, or syncAll'
        },
        { status: 400 }
      )
    }

    // ========================================
    // STEP: 캐시 무효화 (핵심!)
    // ========================================
    console.log('\n[API] 🔄 Starting cache revalidation...\n')

    let revalidationResult
    try {
      revalidationResult = await revalidateAllPosts()
      console.log('[API] ✅ Cache revalidation completed')
      console.log(`[API] 📊 Revalidated ${revalidationResult.revalidated.length} targets`)
    } catch (revalidationError) {
      console.error('[API] ⚠️  Cache revalidation failed (but sync was successful):', revalidationError)
      // 캐시 무효화 실패는 치명적이지 않으므로 계속 진행
      revalidationResult = {
        success: false,
        error: revalidationError instanceof Error ? revalidationError.message : 'Unknown error',
        revalidated: []
      }
    }

    const requestDuration = Date.now() - requestStartTime

    console.log(`\n╔════════════════════════════════════════════════════════╗`)
    console.log(`║             SYNC COMPLETED SUCCESSFULLY               ║`)
    console.log(`╚════════════════════════════════════════════════════════╝`)
    console.log(`[API] ✅ Total posts synced: ${result.totalPosts}`)
    console.log(`[API] ✅ Successful sources: ${result.successCount}`)
    console.log(`[API] ${result.failureCount > 0 ? '⚠️ ' : '✅'} Failed sources: ${result.failureCount}`)
    console.log(`[API] 🔄 Cache revalidation: ${revalidationResult.success ? 'SUCCESS ✅' : 'FAILED ⚠️'}`)
    console.log(`[API] ⏱️  Total duration: ${(requestDuration / 1000).toFixed(2)}s\n\n`)

    return NextResponse.json({
      success: result.successCount > 0,
      ...result,
      revalidation: revalidationResult
    })

  } catch (error: any) {
    const requestDuration = Date.now() - requestStartTime

    console.error(`\n╔════════════════════════════════════════════════════════╗`)
    console.error(`║              SYNC FAILED WITH ERROR                   ║`)
    console.error(`╚════════════════════════════════════════════════════════╝`)
    console.error('[API] ❌ Error type:', error.constructor.name)
    console.error('[API] ❌ Error message:', error.message)
    console.error('[API] ❌ Error code:', error.code)
    console.error('[API] ❌ Error details:', error.details)
    console.error('[API] ❌ Error stack:', error.stack)
    console.error(`[API] ⏱️  Duration before error: ${(requestDuration / 1000).toFixed(2)}s\n\n`)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error occurred',
        errorType: error.constructor.name,
        details: {
          code: error.code,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      },
      { status: 500 }
    )
  }
}
