import { NextRequest, NextResponse } from 'next/server'
import { getPostBySlug } from '@/lib/notion/converter'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const post = await getPostBySlug(params.slug)
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}