import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/notion/converter'

export async function GET() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }
    
    console.log('Testing Notion sync...')
    
    // Fetch all posts from Notion
    const posts = await getAllPosts()
    
    // Map posts to simplified format for testing
    const simplifiedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      status: post.status,
      isPremium: post.isPremium,
      author: post.author,
      contentLength: post.content?.length || 0,
      hasContent: !!post.content && post.content.length > 0,
      readingTime: post.readingTime
    }))
    
    return NextResponse.json({
      success: true,
      totalPosts: posts.length,
      posts: simplifiedPosts,
      availableCategories: [...new Set(posts.map(p => p.category).filter(Boolean))],
      availableAuthors: [...new Set(posts.map(p => p.author).filter(Boolean))]
    })
  } catch (error) {
    console.error('Test sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to test sync', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}