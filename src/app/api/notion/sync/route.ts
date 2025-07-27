import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/notion/converter'
import { createClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch all posts from Notion
    const posts = await getAllPosts()
    
    // Store in Supabase for caching
    const supabase = createClient()
    
    // Upsert posts to database
    const { error } = await supabase
      .from('posts')
      .upsert(
        posts.map(post => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          summary: post.summary,
          content: post.content,
          cover: post.cover,
          author: post.author,
          category: post.category,
          tags: post.tags,
          is_premium: post.isPremium,
          status: post.status,
          published_date: post.publishedDate,
          reading_time: post.readingTime,
          created_at: post.createdAt,
          updated_at: post.updatedAt,
        })),
        { onConflict: 'id' }
      )
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to sync posts' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      count: posts.length,
      posts: posts.map(p => ({ id: p.id, title: p.title, slug: p.slug }))
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method to sync posts' },
    { status: 405 }
  )
}