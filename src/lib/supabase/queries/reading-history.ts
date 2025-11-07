import { createClient } from '@/lib/supabase/client'
import type { ReadingHistory, TrackReadingInput } from '@/types/library'
import { getAllPosts } from '@/lib/notion/converter'

/**
 * Reading History Query Functions
 */

export async function getReadingHistory(): Promise<ReadingHistory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', user.id)
    .order('last_read_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching reading history:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Fetch all posts from Notion
  try {
    const allPosts = await getAllPosts(false) // false = don't filter published

    // Create a map of post_id to post data for quick lookup
    const postsMap = new Map(
      allPosts.map(post => [post.id, post])
    )

    // Attach post data to each reading history item
    const historyWithPosts: ReadingHistory[] = data.map(item => ({
      ...item,
      post: postsMap.get(item.post_id) ? {
        id: postsMap.get(item.post_id)!.id,
        title: postsMap.get(item.post_id)!.title,
        slug: postsMap.get(item.post_id)!.slug,
        summary: postsMap.get(item.post_id)!.summary,
        cover: postsMap.get(item.post_id)!.cover,
        category: postsMap.get(item.post_id)!.category,
        publishedDate: postsMap.get(item.post_id)!.publishedDate
      } : undefined
    }))

    return historyWithPosts
  } catch (postError) {
    console.error('Error fetching posts for reading history:', postError)
    // Return history without post data if posts fetch fails
    return data
  }
}

export async function trackReading(input: TrackReadingInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { post_id, progress = 0 } = input

  // Check if record exists
  const { data: existing } = await supabase
    .from('reading_history')
    .select('id, read_count')
    .eq('user_id', user.id)
    .eq('post_id', post_id)
    .maybeSingle()

  if (existing) {
    // Update existing record
    // Only increment read_count if this is initial view (progress == 0)
    const updateData: any = {
      last_read_at: new Date().toISOString(),
      read_progress: Math.max(progress, 0)
    }

    // Only increment read_count on initial view, not every scroll
    if (progress === 0) {
      updateData.read_count = existing.read_count + 1
    }

    const { error } = await supabase
      .from('reading_history')
      .update(updateData)
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating reading history:', error)
    }
  } else {
    // Create new record (first time reading this post)
    const { error } = await supabase
      .from('reading_history')
      .insert({
        user_id: user.id,
        post_id,
        read_count: 1,
        read_progress: progress
      })

    if (error) {
      console.error('Error creating reading history:', error)
    }
  }
}

export async function clearReadingHistory(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('reading_history')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('Error clearing reading history:', error)
    throw error
  }
}

export async function deleteHistoryItem(postId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('reading_history')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId)

  if (error) {
    console.error('Error deleting history item:', error)
    throw error
  }
}

export async function getPostReadingStatus(postId: string): Promise<ReadingHistory | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching reading status:', error)
    return null
  }

  return data
}
