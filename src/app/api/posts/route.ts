import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts, getPostsByCategory } from '@/lib/notion/converter'
import { BlogPost } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as BlogPost['category'] | null
    
    let posts: BlogPost[]

    if (category) {
      posts = await getPostsByCategory(category, false)  // 🔥 Load metadata only
    } else {
      posts = await getAllPosts(false)  // 🔥 Load metadata only
    }

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}