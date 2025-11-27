import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts, getPostsByCategory } from '@/lib/posts'
import { BlogPost } from '@/types'
import { CategorySlug } from '@/types/post'

export async function GET(request: NextRequest) {
  console.log('[API /posts] 🔍 Fetching posts from Supabase')

  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as CategorySlug | null
    const slugs = searchParams.get('slugs')?.split(',').filter(Boolean)

    let posts: BlogPost[]

    if (category) {
      console.log(`[API /posts] Category filter: ${category}`)
      posts = await getPostsByCategory(category)
    } else {
      posts = await getAllPosts()  // Load metadata only
    }

    if (slugs && slugs.length > 0) {
      console.log(`[API /posts] Filtering by slugs: ${slugs.length} slugs`)
      posts = posts.filter(post => slugs.includes(post.slug))
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