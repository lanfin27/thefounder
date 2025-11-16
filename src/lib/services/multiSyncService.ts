/**
 * Multi-Sync Service
 *
 * Handles syncing content from multiple Notion database sources
 */

import type { NotionSource, SyncResult, BulkSyncResult } from '@/types/notionSource'
import { NotionSourceService } from './notionSourceService'
import { getPostsFromSource } from '@/lib/notion/converter'

export class MultiSyncService {
  private sourceService = new NotionSourceService()

  /**
   * Sync posts from a single Notion source
   */
  async syncSource(sourceId: string): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      console.log(`\n[MultiSync] 🎯 Starting sync for source: ${sourceId}`)

      const source = await this.sourceService.getById(sourceId)

      if (!source) {
        console.error(`[MultiSync] ❌ Source not found: ${sourceId}`)
        throw new Error('Source not found')
      }

      console.log(`[MultiSync] ✅ Found source: ${source.name}`)
      console.log(`[MultiSync] 📊 Source details:`, {
        id: source.id,
        name: source.name,
        database_id: source.notion_database_id,
        last_synced: source.last_synced_at
      })

      console.log(`\n[MultiSync] 🚀 Fetching posts from Notion...`)

      const { count, posts } = await this.syncWithCredentials(
        source.notion_token,
        source.notion_database_id
      )

      console.log(`[MultiSync] ✅ Fetched ${count} posts from Notion`)
      console.log(`[MultiSync] 📋 Post titles:`)
      posts.forEach((post, idx) => {
        console.log(`  ${idx + 1}. "${post.title}" (${post.slug})`)
      })

      // Save posts to Supabase
      console.log(`\n[MultiSync] 💾 Saving ${posts.length} posts to Supabase...`)

      const { savePostsToSupabase } = await import('@/lib/supabase/admin')
      const saveResult = await savePostsToSupabase(posts)

      if (!saveResult.success) {
        console.error(`[MultiSync] ⚠️  Save partially failed:`, {
          attempted: posts.length,
          saved: saveResult.count,
          error: saveResult.error
        })
      }

      console.log(`[MultiSync] ✅ Saved ${saveResult.count}/${posts.length} posts to database`)

      // Update sync time
      console.log(`[MultiSync] 🔄 Updating last sync time...`)
      await this.sourceService.updateSyncTime(sourceId)
      console.log(`[MultiSync] ✅ Updated sync time`)

      const duration = Date.now() - startTime
      console.log(`\n[MultiSync] 🎉 Sync complete for ${source.name}:`)
      console.log(`  - Posts fetched: ${count}`)
      console.log(`  - Posts saved: ${saveResult.count}`)
      console.log(`  - Duration: ${(duration / 1000).toFixed(2)}s`)

      return {
        sourceId: source.id,
        sourceName: source.name,
        success: saveResult.count > 0,
        postsCount: saveResult.count,
        duration
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`\n❌ [MultiSync] CRITICAL ERROR syncing source ${sourceId}:`, {
        error: error.message,
        code: error.code,
        stack: error.stack,
        duration: `${(duration / 1000).toFixed(2)}s`
      })

      return {
        sourceId,
        sourceName: 'Unknown',
        success: false,
        postsCount: 0,
        error: error.message,
        duration
      }
    }
  }

  /**
   * Sync multiple sources in parallel
   */
  async syncMultiple(sourceIds: string[]): Promise<BulkSyncResult> {
    console.log(`[MultiSync] 🔄 Syncing ${sourceIds.length} sources...`)

    const results = await Promise.allSettled(
      sourceIds.map(id => this.syncSource(id))
    )

    const syncResults: SyncResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          sourceId: sourceIds[index],
          sourceName: 'Unknown',
          success: false,
          postsCount: 0,
          error: result.reason?.message || 'Unknown error'
        }
      }
    })

    const totalPosts = syncResults.reduce((sum, r) => sum + r.postsCount, 0)
    const successCount = syncResults.filter(r => r.success).length
    const failureCount = syncResults.filter(r => !r.success).length

    console.log(`[MultiSync] 📊 Bulk sync complete: ${totalPosts} total posts, ${successCount} succeeded, ${failureCount} failed`)

    return {
      results: syncResults,
      totalPosts,
      successCount,
      failureCount
    }
  }

  /**
   * Sync all active sources
   */
  async syncAll(): Promise<BulkSyncResult> {
    console.log('[MultiSync] 🌐 Syncing ALL active sources...')

    const sources = await this.sourceService.getActive()
    const sourceIds = sources.map(s => s.id)

    console.log(`[MultiSync] Found ${sourceIds.length} active sources`)

    return this.syncMultiple(sourceIds)
  }

  /**
   * Private: Sync with specific Notion credentials
   */
  private async syncWithCredentials(
    token: string,
    databaseId: string
  ): Promise<{ count: number; posts: any[] }> {
    console.log(`\n========== SYNC WITH CREDENTIALS ==========`)
    console.log(`[MultiSync] 📡 Token (first 30 chars): ${token.substring(0, 30)}...`)
    console.log(`[MultiSync] 📡 Full Token Length: ${token.length}`)
    console.log(`[MultiSync] 📡 Database ID (FULL): ${databaseId}`)
    console.log(`[MultiSync] 📡 Database ID Length: ${databaseId.length}`)
    console.log(`===========================================\n`)

    try {
      // Use the existing working function from converter.ts
      // This function uses the same conversion logic as getAllPosts()
      const posts = await getPostsFromSource(token, databaseId, true) // ✅ Load content!

      console.log(`\n[MultiSync] ✅ Fetched ${posts.length} posts from Notion`)
      console.log(`[MultiSync] 📄 Post titles:`)
      posts.forEach((post, idx) => {
        console.log(`  ${idx + 1}. "${post.title}" (slug: ${post.slug})`)
      })
      console.log('')

      return {
        count: posts.length,
        posts
      }
    } catch (error: any) {
      console.error('[MultiSync] ❌ Sync failed:', error.message)
      console.error('[MultiSync] ❌ Error stack:', error.stack)
      throw error
    }
  }
}
