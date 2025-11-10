/**
 * Multi-Notion Database Sync Types
 *
 * Type definitions for managing multiple Notion database sources
 */

export interface NotionSource {
  id: string
  name: string
  notion_token: string
  notion_database_id: string
  is_active: boolean
  last_synced_at: string | null
  sync_count: number
  created_at: string
  updated_at: string
}

export interface CreateNotionSourceDto {
  name: string
  notion_token: string
  notion_database_id: string
  is_active?: boolean
}

export interface UpdateNotionSourceDto {
  name?: string
  notion_token?: string
  notion_database_id?: string
  is_active?: boolean
}

export interface TestConnectionResult {
  success: boolean
  message: string
  databaseTitle?: string
  error?: string
}

export interface SyncResult {
  sourceId: string
  sourceName: string
  success: boolean
  postsCount: number
  error?: string
  duration?: number
}

export interface BulkSyncResult {
  results: SyncResult[]
  totalPosts: number
  successCount: number
  failureCount: number
}
