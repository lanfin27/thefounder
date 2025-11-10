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
      const source = await this.sourceService.getById(sourceId)

      if (!source) {
        throw new Error('Source not found')
      }

      console.log(`[MultiSync] 🚀 Syncing source: ${source.name}`)

      const { count, posts } = await this.syncWithCredentials(
        source.notion_token,
        source.notion_database_id
      )

      // Save posts to Supabase
      console.log(`[MultiSync] 💾 Saving ${posts.length} posts to Supabase...`)
      const { savePostsToSupabase } = await import('@/lib/supabase/admin')
      const saveResult = await savePostsToSupabase(posts)
      console.log(`[MultiSync] ✅ Saved ${saveResult.count} posts to database`)

      await this.sourceService.updateSyncTime(sourceId)

      console.log(`[MultiSync] ✅ Synced ${count} posts from ${source.name}`)

      return {
        sourceId: source.id,
        sourceName: source.name,
        success: true,
        postsCount: count,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      console.error(`[MultiSync] ❌ Error syncing source ${sourceId}:`, error.message)

      return {
        sourceId,
        sourceName: 'Unknown',
        success: false,
        postsCount: 0,
        error: error.message,
        duration: Date.now() - startTime
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
