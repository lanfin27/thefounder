/**
 * Library Feature Types
 * Medium-style library with lists, reading history, and responses
 */

import type { BlogPost } from './index'

// =============================================
// LIST TYPES
// =============================================

export interface List {
  id: string
  user_id: string
  name: string
  description?: string
  cover_image?: string
  is_default: boolean
  created_at: string
  updated_at: string
  post_count?: number // Populated from join query
}

export interface CreateListInput {
  name: string
  description?: string
  cover_image?: string
}

export interface UpdateListInput {
  name?: string
  description?: string
  cover_image?: string
}

// =============================================
// LIST ITEM TYPES
// =============================================

export interface ListItem {
  id: string
  list_id: string
  post_id: string // Notion page ID
  added_at: string
  note?: string
  post?: Partial<BlogPost> // Populated when joined with post data
}

export interface AddToListInput {
  list_id: string
  post_id: string
  note?: string
}

// =============================================
// READING HISTORY TYPES
// =============================================

export interface ReadingHistory {
  id: string
  user_id: string
  post_id: string // Notion page ID
  first_read_at: string
  last_read_at: string
  read_count: number
  read_progress: number // Percentage (0-100)
  post?: Partial<BlogPost> // Populated when joined with post data
}

export interface TrackReadingInput {
  post_id: string
  progress?: number // 0-100
}

export interface ReadingHistoryWithPost extends ReadingHistory {
  post: BlogPost
}

// =============================================
// RESPONSE (COMMENT) TYPES
// =============================================

export interface UserResponse {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  updated_at?: string
  likes_count: number
  replies_count: number
  post?: {
    id: string
    title: string
    slug: string
  }
}

// =============================================
// UI STATE TYPES
// =============================================

export type LibraryTab = 'lists' | 'reading-history' | 'responses'

export interface LibraryTabConfig {
  id: LibraryTab
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ListWithItems extends List {
  items: ListItem[]
}

export interface LibraryStats {
  total_lists: number
  total_bookmarks: number
  total_read: number
  total_responses: number
}
