export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllPosts } from '@/lib/notion/converter'
import ReadingHistoryClient from '@/components/library/ReadingHistoryClient'

export default async function ReadingHistoryPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  console.log('🔍 [ReadingHistory] Loading for user:', user.id)

  // Fetch ALL reading history (we'll sort on client side)
  const { data: historyItems, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', user.id)

  console.log('📊 [ReadingHistory] Database query:', {
    itemCount: historyItems?.length || 0,
    hasError: !!error,
    errorMessage: error?.message
  })

  if (error) {
    console.error('❌ [ReadingHistory] Failed to fetch:', error)
  }

  // Fetch all posts from Notion
  let posts: any[] = []
  try {
    posts = await getAllPosts(false) // metadata only
    console.log('✅ [ReadingHistory] Fetched', posts.length, 'posts from Notion')
  } catch (err) {
    console.error('❌ [ReadingHistory] Failed to fetch posts:', err)
  }

  // Create posts map (by slug)
  const postsMap = new Map(posts.map(p => [p.slug, p]))

  // Merge reading history with post data
  const items = (historyItems || []).map(item => {
    const post = postsMap.get(item.post_id)

    if (!post) {
      console.warn('⚠️ [ReadingHistory] Post not found for:', item.post_id)
    }

    return {
      ...item,
      post: post || null
    }
  })

  const matchedCount = items.filter(i => i.post).length
  console.log('✅ [ReadingHistory] Matched', matchedCount, '/', items.length, 'items')

  return <ReadingHistoryClient initialItems={items} />
}
