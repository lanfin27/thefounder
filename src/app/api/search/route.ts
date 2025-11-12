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

    const searchTerm = query.trim()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Build base query
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let searchQuery = supabase
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
      searchQuery = searchQuery.eq('category', category)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Try Full-Text Search first
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 🔍 Trying Full-Text Search...')

    try {
      // Try FTS first
      const { data: ftsResults, error: ftsError } = await searchQuery
        .textSearch('search_vector', searchTerm, {
          type: 'websearch',
          config: 'simple',
        })
        .order('created_at', { ascending: false })
        .limit(50)

      if (!ftsError && ftsResults && ftsResults.length > 0) {
        console.log('[Search API] ✅ FTS Results:', ftsResults.length)
        console.log('[Search API] Method: fts')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // Generate excerpt from content (first 200 chars)
        const resultsWithExcerpt = ftsResults.map(post => ({
          ...post,
          excerpt: post.content ? post.content.substring(0, 200) + '...' : '',
        }))

        return NextResponse.json({
          results: resultsWithExcerpt,
          count: ftsResults.length,
          method: 'fts',
        })
      }

      console.log('[Search API] ⚠️ FTS failed or no results, trying LIKE...')
    } catch (ftsError) {
      console.log('[Search API] ⚠️ FTS error:', ftsError)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Fallback to LIKE search
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 🔄 Falling back to LIKE search...')

    let likeQuery = supabase
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

    if (category !== 'all') {
      likeQuery = likeQuery.eq('category', category)
    }

    // LIKE search: title or content contains search term
    likeQuery = likeQuery.or(
      `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
    )

    const { data: likeResults, error: likeError } = await likeQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (likeError) {
      console.error('[Search API] ❌ LIKE error:', likeError)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    console.log('[Search API] ✅ LIKE Results:', likeResults?.length || 0)
    console.log('[Search API] Method: like')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Generate excerpt from content
    const resultsWithExcerpt = (likeResults || []).map(post => ({
      ...post,
      excerpt: post.content ? post.content.substring(0, 200) + '...' : '',
    }))

    return NextResponse.json({
      results: resultsWithExcerpt,
      count: likeResults?.length || 0,
      method: 'like',
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