import { createClient } from '@/lib/supabase/client'
import type { List, CreateListInput, UpdateListInput, ListItem, AddToListInput } from '@/types/library'

/**
 * List Management Query Functions
 */

// ===== LIST OPERATIONS =====

export async function getUserLists(): Promise<List[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('lists')
    .select(`
      *,
      items:list_items(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching lists:', error)
    throw error
  }

  // Format data to include post_count
  return (data || []).map(list => ({
    ...list,
    post_count: list.items?.[0]?.count || 0
  }))
}

export async function getListById(listId: string): Promise<List | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('lists')
    .select(`
      *,
      items:list_items(count)
    `)
    .eq('id', listId)
    .single()

  if (error) {
    console.error('Error fetching list:', error)
    return null
  }

  return {
    ...data,
    post_count: data.items?.[0]?.count || 0
  }
}

export async function createList(input: CreateListInput): Promise<List> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description || null,
      cover_image: input.cover_image || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating list:', error)
    throw error
  }

  return {
    ...data,
    post_count: 0
  }
}

export async function updateList(listId: string, input: UpdateListInput): Promise<List> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('lists')
    .update({
      name: input.name,
      description: input.description,
      cover_image: input.cover_image,
      updated_at: new Date().toISOString()
    })
    .eq('id', listId)
    .select()
    .single()

  if (error) {
    console.error('Error updating list:', error)
    throw error
  }

  return {
    ...data,
    post_count: 0 // Will be populated when needed
  }
}

export async function deleteList(listId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)

  if (error) {
    console.error('Error deleting list:', error)
    throw error
  }
}

// ===== LIST ITEMS OPERATIONS =====

export async function getListItems(
  listId: string,
  supabaseClient?: any
): Promise<ListItem[]> {
  const supabase = supabaseClient || createClient()

  console.log('🔍 [getListItems] Starting fetch for listId:', listId)
  console.log('🔍 [getListItems] Using authenticated client:', !!supabaseClient)

  // Fetch list items from database
  const { data: items, error: itemsError } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('added_at', { ascending: false })

  console.log('📊 [getListItems] Query completed:', {
    itemsCount: items?.length || 0,
    hasError: !!itemsError,
    errorMessage: itemsError?.message,
    errorDetails: itemsError?.details,
    errorHint: itemsError?.hint
  })

  if (itemsError) {
    console.error('❌ [getListItems] Database error:', itemsError)
    throw itemsError
  }

  if (!items || items.length === 0) {
    console.log('⚠️ [getListItems] No items found in database for listId:', listId)
    return []
  }

  console.log('✅ [getListItems] Fetched', items.length, 'list items from database')
  console.log('📝 [getListItems] Database post_ids:', items.map(item => item.post_id))

  // Fetch post data from Notion (server-side safe)
  let posts: any[] = []
  try {
    const { getAllPosts } = await import('@/lib/notion/converter')
    posts = await getAllPosts(false) // metadata only
    console.log('✅ [getListItems] Fetched', posts.length, 'posts from Notion')
    console.log('📝 [getListItems] Notion posts structure (first 3):',
      posts.slice(0, 3).map(p => ({
        id: p.id,
        slug: p.slug
      }))
    )
  } catch (error) {
    console.error('❌ [getListItems] Failed to fetch posts:', error)
    // Continue with empty posts array - will show as deleted
  }

  // Create a map for quick post lookup - use slug as key to match database post_id
  const postsMap = new Map(posts.map(p => [p.slug, p]))
  console.log('📝 [getListItems] Created postsMap with', postsMap.size, 'entries (keyed by slug)')
  console.log('📝 [getListItems] Sample slugs in map:', Array.from(postsMap.keys()).slice(0, 3))

  // Map items to include post data
  const result: ListItem[] = items.map(item => {
    const post = postsMap.get(item.post_id)

    if (!post) {
      console.warn('⚠️ [getListItems] Post not found for post_id:', item.post_id)
      console.warn('⚠️ [getListItems] Available slugs:', Array.from(postsMap.keys()).slice(0, 5))
    } else {
      console.log('✅ [getListItems] Matched post:', item.post_id, '→', post.title?.substring(0, 30))
    }

    return {
      id: item.id,
      list_id: item.list_id,
      post_id: item.post_id,
      added_at: item.added_at,
      note: item.note,
      post: post || null
    }
  })

  const matchedCount = result.filter(r => r.post !== null).length
  console.log('✅ [getListItems] Mapped', result.length, 'items,', matchedCount, 'matched with post data')

  return result
}

export async function addToList(input: AddToListInput): Promise<ListItem> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('list_items')
    .insert({
      list_id: input.list_id,
      post_id: input.post_id,
      note: input.note || null
    })
    .select()
    .single()

  if (error) {
    // Handle duplicate entry
    if (error.code === '23505') {
      throw new Error('이 글은 이미 리스트에 있습니다')
    }
    console.error('Error adding to list:', error)
    throw error
  }

  return data
}

export async function removeFromList(listId: string, postId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('post_id', postId)

  if (error) {
    console.error('Error removing from list:', error)
    throw error
  }
}

export async function getPostLists(postId: string): Promise<List[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('list_items')
    .select(`
      list_id,
      lists!inner(*)
    `)
    .eq('post_id', postId)

  if (error) {
    console.error('Error fetching post lists:', error)
    return []
  }

  return (data || []).map(item => item.lists).filter(Boolean) as List[]
}

export async function isPostInList(listId: string, postId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('list_items')
    .select('id')
    .eq('list_id', listId)
    .eq('post_id', postId)
    .maybeSingle()

  if (error) {
    console.error('Error checking post in list:', error)
    return false
  }

  return !!data
}
