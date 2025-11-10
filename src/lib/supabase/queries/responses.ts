import { createClient } from '@/lib/supabase/client'
import type { UserResponse } from '@/types/library'

/**
 * User Responses (Comments) Query Functions
 */

export async function getUserResponses(): Promise<UserResponse[]> {
  console.log('🔍 [getUserResponses] Starting query...')

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.error('❌ [getUserResponses] Auth error:', authError)
    throw authError
  }

  if (!user) {
    console.error('❌ [getUserResponses] No authenticated user')
    throw new Error('Not authenticated')
  }

  console.log('✅ [getUserResponses] User authenticated:', user.id)

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      updated_at,
      post_id,
      parent_id
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ [getUserResponses] Supabase error:', error)
    console.error('   Error code:', error.code)
    console.error('   Error message:', error.message)
    console.error('   Error details:', error.details)
    console.error('   Error hint:', error.hint)
    throw error
  }

  console.log('✅ [getUserResponses] Success! Found', data?.length || 0, 'comments')

  // Count replies for each comment
  const commentsWithCounts = await Promise.all(
    (data || []).map(async (comment) => {
      // Get reply count
      const { count: repliesCount } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', comment.id)

      return {
        id: comment.id,
        user_id: user.id,
        post_id: comment.post_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        likes_count: 0, // TODO: Implement likes system
        replies_count: repliesCount || 0,
        post: undefined // Will be populated by fetching post data separately
      }
    })
  )

  return commentsWithCounts
}

export async function getResponsesByPost(postId: string): Promise<UserResponse[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      post_id
    `)
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching responses by post:', error)
    throw error
  }

  return (data || []).map(comment => ({
    id: comment.id,
    user_id: user.id,
    post_id: comment.post_id,
    content: comment.content,
    created_at: comment.created_at,
    likes_count: 0,
    replies_count: 0,
    post: undefined
  }))
}
