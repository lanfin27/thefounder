// Fast search API with caching and autocomplete
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

// Simple in-memory cache for search results
const searchCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // all, title, category, description
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'))

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          suggestions: [],
          total: 0
        }
      })
    }

    // Check cache
    const cacheKey = `${type}:${query}:${limit}`
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      })
    }

    // Build search query based on type
    let searchQuery = supabase
      .from('flippa_listings')
      .select('id, title, url, asking_price, monthly_revenue, category, description')

    switch (type) {
      case 'title':
        searchQuery = searchQuery.ilike('title', `%${query}%`)
        break
      case 'category':
        searchQuery = searchQuery.ilike('category', `%${query}%`)
        break
      case 'description':
        searchQuery = searchQuery.ilike('description', `%${query}%`)
        break
      default: // 'all'
        searchQuery = searchQuery.or(
          `title.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`
        )
    }

    searchQuery = searchQuery.limit(limit)

    const { data: results, error } = await searchQuery

    if (error) throw error

    // Get category suggestions for autocomplete
    const { data: categorySuggestions } = await supabase
      .from('flippa_listings')
      .select('category')
      .ilike('category', `%${query}%`)
      .not('category', 'is', null)
      .limit(5)

    const uniqueCategories = [...new Set(categorySuggestions?.map(c => c.category) || [])]

    // Format results
    const formattedResults = results?.map(item => ({
      id: item.id,
      title: item.title || 'Untitled',
      url: item.url,
      price: item.asking_price,
      revenue: item.monthly_revenue,
      category: item.category || 'Other',
      description: item.description ? item.description.substring(0, 150) + '...' : '',
      relevance: calculateRelevance(item, query)
    })) || []

    // Sort by relevance
    formattedResults.sort((a, b) => b.relevance - a.relevance)

    const responseData = {
      results: formattedResults,
      suggestions: uniqueCategories,
      total: formattedResults.length,
      query,
      type
    }

    // Cache the results
    searchCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })

    // Clean old cache entries
    if (searchCache.size > 100) {
      const entries = Array.from(searchCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, 50).forEach(([key]) => searchCache.delete(key))
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Search failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Calculate relevance score for search results
function calculateRelevance(item: any, query: string): number {
  let score = 0
  const lowerQuery = query.toLowerCase()
  
  // Title match (highest weight)
  if (item.title?.toLowerCase().includes(lowerQuery)) {
    score += 10
    if (item.title.toLowerCase().startsWith(lowerQuery)) {
      score += 5 // Bonus for prefix match
    }
  }
  
  // Category match
  if (item.category?.toLowerCase().includes(lowerQuery)) {
    score += 5
  }
  
  // Description match (lower weight)
  if (item.description?.toLowerCase().includes(lowerQuery)) {
    score += 2
  }
  
  // Value indicators
  if (item.asking_price > 0) score += 1
  if (item.monthly_revenue > 0) score += 1
  
  return score
}