import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/notion/converter'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch all posts from Notion
    console.log('Fetching posts from Notion...')
    const posts = await getAllPosts()
    console.log(`Found ${posts.length} posts`)
    
    // Create admin client
    let supabase
    try {
      supabase = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json({ 
        error: 'Failed to create Supabase admin client',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Debug: Log the first post to check structure
    if (posts.length > 0) {
      console.log('First post structure:', {
        id: posts[0].id,
        title: posts[0].title,
        author: posts[0].author,
        authorType: typeof posts[0].author
      })
    }

    // Prepare posts data for upsert
    const postsData = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary || null,
      content: post.content || null,
      cover: post.cover || null,
      author: post.author || null,
      category: post.category || null,
      tags: post.tags || [],
      is_premium: post.isPremium || false,
      status: post.status || null,
      published_date: post.publishedDate || null,
      reading_time: post.readingTime || null,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
    }))

    console.log('Upserting posts to database...')
    
    // Upsert posts to database
    const { data, error } = await supabase
      .from('posts')
      .upsert(postsData, { onConflict: 'id' })
      .select()
    
    if (error) {
      console.error('Supabase error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to sync posts',
        details: error.message,
        hint: error.hint || 'Check if the posts table exists and has the correct schema'
      }, { status: 500 })
    }

    console.log('Successfully synced posts:', data?.length || 0)
    
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