/**
 * Notion Source Service
 *
 * Handles CRUD operations for Notion database sources
 */

import { createClient } from '@/lib/supabase/server'
import type {
  NotionSource,
  CreateNotionSourceDto,
  UpdateNotionSourceDto,
  TestConnectionResult
} from '@/types/notionSource'
import { Client } from '@notionhq/client'

export class NotionSourceService {
  /**
   * Get all Notion sources
   */
  async getAll(): Promise<NotionSource[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notion_sources')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get a single Notion source by ID
   */
  async getById(id: string): Promise<NotionSource | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notion_sources')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all active Notion sources
   */
  async getActive(): Promise<NotionSource[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notion_sources')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Create a new Notion source
   */
  async create(dto: CreateNotionSourceDto): Promise<NotionSource> {
    const supabase = await createClient()

    // Validate unique name
    const { data: existing } = await supabase
      .from('notion_sources')
      .select('name')
      .eq('name', dto.name)
      .single()

    if (existing) {
      throw new Error(`Source with name "${dto.name}" already exists`)
    }

    const { data, error } = await supabase
      .from('notion_sources')
      .insert({
        name: dto.name,
        notion_token: dto.notion_token,
        notion_database_id: dto.notion_database_id,
        is_active: dto.is_active ?? true
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update an existing Notion source
   */
  async update(id: string, dto: UpdateNotionSourceDto): Promise<NotionSource> {
    const supabase = await createClient()

    // If name is being updated, check uniqueness
    if (dto.name) {
      const { data: existing } = await supabase
        .from('notion_sources')
        .select('name, id')
        .eq('name', dto.name)
        .single()

      if (existing && existing.id !== id) {
        throw new Error(`Source with name "${dto.name}" already exists`)
      }
    }

    const { data, error } = await supabase
      .from('notion_sources')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a Notion source
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notion_sources')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Test connection to a Notion database
   */
  async testConnection(token: string, databaseId: string): Promise<TestConnectionResult> {
    try {
      const notion = new Client({ auth: token })

      const database = await notion.databases.retrieve({
        database_id: databaseId
      })

      // Extract database title
      let databaseTitle = 'Untitled Database'
      if (database.title && database.title.length > 0) {
        databaseTitle = database.title[0]?.plain_text || 'Untitled Database'
      }

      return {
        success: true,
        message: 'Connection successful',
        databaseTitle
      }
    } catch (error: any) {
      let message = 'Connection failed'

      if (error.code === 'object_not_found') {
        message = 'Database not found. Check the Database ID.'
      } else if (error.code === 'unauthorized') {
        message = 'Invalid token. Check your Notion API token.'
      } else if (error.code === 'restricted_resource') {
        message = 'No access to this database. Check integration permissions.'
      } else {
        message = error.message || 'Unknown error occurred'
      }

      return {
        success: false,
        message,
        error: error.message
      }
    }
  }

  /**
   * Update sync time and increment sync count
   */
  async updateSyncTime(id: string): Promise<void> {
    const supabase = await createClient()

    const { data: source } = await supabase
      .from('notion_sources')
      .select('sync_count')
      .eq('id', id)
      .single()

    const newSyncCount = (source?.sync_count || 0) + 1

    await supabase
      .from('notion_sources')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_count: newSyncCount
      })
      .eq('id', id)
  }
}
