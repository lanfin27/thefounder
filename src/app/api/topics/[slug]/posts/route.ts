import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Topic Posts API
 *
 * GET /api/topics/[slug]/posts - Get all posts for a specific topic
 *
 * Returns published posts that contain the specified topic in their tags array
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const topicName = decodeURIComponent(slug)
    const supabase = await createClient()

    console.log(`[Topic Posts API] 📂 Fetching posts for topic: "${topicName}"`)

    // Fetch posts that contain this topic in tags array
    // tags is TEXT[] array, so we use @> (contains) operator
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        slug,
        summary,
        cover,
        tags,
        published_date,
        reading_time,
        category,
        author,
        claps_count,
        comments_count
      `)
      .contains('tags', [topicName])  // Array contains operator
      .in('status', ['published', '발행'])
      .order('published_date', { ascending: false })

    if (error) {
      console.error('[Topic Posts API] ❌ Error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch posts',
          details: error.message
        },
        { status: 500 }
      )
    }

    if (!posts || posts.length === 0) {
      console.log(`[Topic Posts API] ℹ️  No posts found for topic: "${topicName}"`)
      return NextResponse.json({
        topic: topicName,
        posts: [],
        total: 0
      })
    }

    console.log(`[Topic Posts API] ✅ Found ${posts.length} posts for "${topicName}"`)

    // Transform to consistent format
    const transformedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary || '',
      cover: post.cover || undefined,
      tags: post.tags || [],
      publishedDate: post.published_date,
      readingTime: post.reading_time || 5,
      category: post.category,
      author: post.author || 'Anonymous',
      clapsCount: post.claps_count || 0,
      commentsCount: post.comments_count || 0
    }))

    return NextResponse.json({
      topic: topicName,
      posts: transformedPosts,
      total: transformedPosts.length
    })

  } catch (error) {
    console.error('[Topic Posts API] ❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
