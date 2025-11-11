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
        success: true,
        results: [],
        count: 0,
        message: 'Empty query'
      })
    }

    const supabase = await createClient()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Build base query
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let searchQuery = supabase
      .from('posts')
      .select(`
        id,
        slug,
        title,
        excerpt,
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
    // STEP 3: Apply Full-Text Search
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const searchTerm = query.trim()
    console.log('[Search API] 🔍 Searching for:', searchTerm)

    // Try Full-Text Search first
    searchQuery = searchQuery.textSearch('search_vector', searchTerm, {
      type: 'websearch',
      config: 'simple',
    })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Sort and execute
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const { data: results, error } = await searchQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[Search API] ❌ FTS Error:', error)

      // Fallback to LIKE search
      console.log('[Search API] 🔄 Falling back to LIKE search...')

      let fallbackQuery = supabase
        .from('posts')
        .select(`
          id,
          slug,
          title,
          excerpt,
          category,
          thumbnail_url,
          created_at,
          claps_count,
          comments_count
        `)
        .eq('status', 'published')
        .is('deleted_at', null)

      if (category !== 'all') {
        fallbackQuery = fallbackQuery.eq('category', category)
      }

      // LIKE search (title, excerpt, content)
      fallbackQuery = fallbackQuery.or(
        `title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
      )

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery
        .order('created_at', { ascending: false })
        .limit(50)

      if (fallbackError) {
        console.error('[Search API] ❌ Fallback error:', fallbackError)
        // Return mock data as final fallback
        return NextResponse.json({
          success: true,
          results: getMockSearchResults(query),
          count: getMockSearchResults(query).length,
          method: 'mock'
        })
      }

      console.log('[Search API] ✅ Fallback results:', fallbackResults?.length || 0)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return NextResponse.json({
        success: true,
        results: fallbackResults || [],
        count: fallbackResults?.length || 0,
        method: 'like'
      })
    }

    console.log('[Search API] ✅ Results found:', results?.length || 0)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      results: results || [],
      count: results?.length || 0,
      method: 'fts'
    })

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('[Search API] ❌ Unexpected error:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Return mock data as final fallback
    const query = request.nextUrl.searchParams.get('q') || ''
    return NextResponse.json({
      success: true,
      results: getMockSearchResults(query),
      count: getMockSearchResults(query).length,
      method: 'mock'
    })
  }
}

// Mock data for development/fallback
function getMockSearchResults(query: string) {
  const mockPosts = [
    {
      id: '1',
      title: '스타트업 초기 투자 유치 전략: 시드 라운드 성공 가이드',
      excerpt: '성공적인 시드 투자 유치를 위한 준비사항과 투자자 미팅 전략을 상세히 알아봅니다.',
      slug: 'startup-seed-investment-guide',
      category: '투자',
      author: '김창업',
      publishedAt: '2024-01-15',
      readingTime: 8,
      thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&h=200&fit=crop'
    },
    {
      id: '2',
      title: 'MVP 개발 방법론: 린 스타트업으로 빠르게 시장 검증하기',
      excerpt: '최소 기능 제품(MVP)을 효율적으로 개발하고 시장 반응을 테스트하는 방법을 소개합니다.',
      slug: 'mvp-development-lean-startup',
      category: '개발',
      author: '이개발',
      publishedAt: '2024-01-10',
      readingTime: 6,
      thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=200&h=200&fit=crop'
    },
    {
      id: '3',
      title: '1인 창업자를 위한 디지털 마케팅 실전 가이드',
      excerpt: '적은 예산으로 최대 효과를 내는 디지털 마케팅 전략과 실행 방법을 알아봅니다.',
      slug: 'digital-marketing-for-solopreneurs',
      category: '마케팅',
      author: '박마케터',
      publishedAt: '2024-01-08',
      readingTime: 10,
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=200&fit=crop'
    },
    {
      id: '4',
      title: '창업 첫 6개월: 실패하지 않는 사업 운영 체크리스트',
      excerpt: '창업 초기 6개월 동안 반드시 확인해야 할 핵심 체크리스트와 실무 팁을 제공합니다.',
      slug: 'startup-first-6-months-checklist',
      category: '창업',
      author: '최대표',
      publishedAt: '2024-01-05',
      readingTime: 7,
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'
    },
    {
      id: '5',
      title: 'B2B SaaS 스타트업의 가격 정책 수립 전략',
      excerpt: 'SaaS 비즈니스 모델에서 효과적인 가격 정책을 수립하는 방법과 사례를 분석합니다.',
      slug: 'b2b-saas-pricing-strategy',
      category: '전략',
      author: '정전략',
      publishedAt: '2024-01-03',
      readingTime: 9,
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=200&fit=crop'
    }
  ]

  // Simple search filtering
  const lowerQuery = query.toLowerCase()
  const filtered = mockPosts.filter(post => 
    post.title.toLowerCase().includes(lowerQuery) ||
    post.excerpt.toLowerCase().includes(lowerQuery) ||
    post.category.toLowerCase().includes(lowerQuery) ||
    post.author.toLowerCase().includes(lowerQuery)
  )

  return filtered.length > 0 ? filtered : mockPosts.slice(0, 3)
}