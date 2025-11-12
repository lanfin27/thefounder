import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/search?q=검색어&category=카테고리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[Search API] 🔍 Search request')

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || 'all'

    console.log('[Search API] 📝 Query:', query)
    console.log('[Search API] 📂 Category:', category)

    if (!query || query.trim().length === 0) {
      console.log('[Search API] ⚠️ Empty query')
      return NextResponse.json({
        results: [],
        count: 0,
        message: 'Empty query'
      })
    }

    const supabase = await createClient()

    const searchTerm = query.trim().toLowerCase()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Fetch all posts
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 🔍 Fetching all posts...')

    let queryBuilder = supabase
      .from('posts')
      .select(`
        id,
        slug,
        title,
        content,
        category,
        thumbnail_url,
        created_at,
        claps_count,
        comments_count
      `)
      .eq('status', 'published')
      .is('deleted_at', null)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Apply category filter
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if (category !== 'all') {
      console.log('[Search API] 🏷️ Filtering by category:', category)
      queryBuilder = queryBuilder.eq('category', category)
    }

    const { data: posts, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      console.error('[Search API] ❌ Error:', error)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: JavaScript filter (title + content search)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 🔍 Searching in title and content...')

    const results = (posts || []).filter(post => {
      const titleMatch = post.title?.toLowerCase().includes(searchTerm)
      const contentMatch = post.content?.toLowerCase().includes(searchTerm)
      return titleMatch || contentMatch
    })

    console.log('[Search API] ✅ Results found:', results.length)
    console.log('[Search API] Method: javascript-filter')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Generate excerpt from content
    const resultsWithExcerpt = results.map(post => ({
      ...post,
      excerpt: post.content ? post.content.substring(0, 200) + '...' : '',
    }))

    return NextResponse.json({
      results: resultsWithExcerpt.slice(0, 50), // Max 50 results
      count: resultsWithExcerpt.length,
      method: 'javascript-filter',
    })

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('[Search API] ❌ Unexpected error:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}