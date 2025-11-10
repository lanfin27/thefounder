import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts, getPostsByCategory } from '@/lib/posts'
import { BlogPost } from '@/types'

export async function GET(request: NextRequest) {
  console.log('[API /posts] 🔍 Fetching posts from Supabase')

  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as BlogPost['category'] | null

    let posts: BlogPost[]

    if (category) {
      console.log(`[API /posts] Category filter: ${category}`)
      posts = await getPostsByCategory(category)
    } else {
      posts = await getAllPosts(false)  // Load metadata only
    }

    console.log(`[API /posts] ✅ Returning ${posts.length} posts`)
    return NextResponse.json(posts)
  } catch (error) {
    console.error('[API /posts] ❌ Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}