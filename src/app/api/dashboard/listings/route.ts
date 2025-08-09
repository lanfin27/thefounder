// Enhanced listings API with search, filtering, and pagination
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

interface ListingsFilter {
  search?: string
  category?: string
  priceMin?: number
  priceMax?: number
  revenueMin?: number
  revenueMax?: number
  ageMin?: number
  ageMax?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: ListingsFilter = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      revenueMin: searchParams.get('revenueMin') ? Number(searchParams.get('revenueMin')) : undefined,
      revenueMax: searchParams.get('revenueMax') ? Number(searchParams.get('revenueMax')) : undefined,
      ageMin: searchParams.get('ageMin') ? Number(searchParams.get('ageMin')) : undefined,
      ageMax: searchParams.get('ageMax') ? Number(searchParams.get('ageMax')) : undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    }

    // Validate pagination
    filters.page = Math.max(1, filters.page)
    filters.limit = Math.min(100, Math.max(1, filters.limit))
    
    const offset = (filters.page - 1) * filters.limit

    // Build query
    let query = supabase
      .from('flippa_listings')
      .select('*', { count: 'exact' })

    // Apply search filter (full-text search on title and description)
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    // Apply price filters (asking_price)
    if (filters.priceMin !== undefined) {
      query = query.gte('asking_price', filters.priceMin)
    }
    if (filters.priceMax !== undefined) {
      query = query.lte('asking_price', filters.priceMax)
    }

    // Apply revenue filters (monthly_revenue)
    if (filters.revenueMin !== undefined) {
      query = query.gte('monthly_revenue', filters.revenueMin)
    }
    if (filters.revenueMax !== undefined) {
      query = query.lte('monthly_revenue', filters.revenueMax)
    }

    // Apply age filters (age_months)
    if (filters.ageMin !== undefined) {
      query = query.gte('age_months', filters.ageMin)
    }
    if (filters.ageMax !== undefined) {
      query = query.lte('age_months', filters.ageMax)
    }

    // Apply sorting
    const sortColumn = {
      'created_at': 'created_at',
      'price': 'asking_price',
      'revenue': 'monthly_revenue',
      'profit': 'monthly_profit',
      'age': 'age_months',
      'traffic': 'page_views_monthly',
      'title': 'title'
    }[filters.sortBy] || 'created_at'

    query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc', nullsFirst: false })

    // Apply pagination
    query = query.range(offset, offset + filters.limit - 1)

    // Execute query
    const { data: listings, error, count } = await query

    if (error) throw error

    // Transform listings for frontend
    const transformedListings = listings?.map(listing => ({
      id: listing.id,
      session_id: listing.session_id,
      title: listing.title || 'Untitled',
      url: listing.url,
      asking_price: listing.asking_price,
      monthly_revenue: listing.monthly_revenue,
      monthly_profit: listing.monthly_profit,
      profit_margin: listing.monthly_revenue > 0 
        ? Math.round((listing.monthly_profit / listing.monthly_revenue) * 100)
        : 0,
      age_months: listing.age_months,
      age_display: formatAge(listing.age_months),
      page_views_monthly: listing.page_views_monthly,
      category: listing.category || 'Other',
      description: listing.description,
      technologies: listing.technologies || [],
      scraped_at: listing.scraped_at,
      created_at: listing.created_at,
      // Calculate multiple if not present
      multiple: listing.asking_price && listing.monthly_revenue > 0
        ? (listing.asking_price / (listing.monthly_revenue * 12)).toFixed(2)
        : null,
      // Quality indicators
      data_completeness: calculateCompleteness(listing),
      is_premium: listing.asking_price > 100000,
      is_profitable: listing.monthly_profit > 0
    })) || []

    // Get available categories for filter dropdown
    const { data: categories } = await supabase
      .from('flippa_listings')
      .select('category')
      .not('category', 'is', null)
      .order('category')

    const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])]

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / filters.limit)

    return NextResponse.json({
      success: true,
      data: {
        listings: transformedListings,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: count || 0,
          totalPages,
          hasNext: filters.page < totalPages,
          hasPrev: filters.page > 1
        },
        filters: {
          availableCategories: uniqueCategories,
          appliedFilters: filters
        },
        stats: {
          showing: transformedListings.length,
          totalMatching: count || 0
        }
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Listings API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listings',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper functions
function formatAge(months: number | null): string {
  if (!months) return 'Unknown'
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`
  return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
}

function calculateCompleteness(listing: any): number {
  const fields = [
    'title',
    'url',
    'asking_price',
    'monthly_revenue',
    'monthly_profit',
    'age_months',
    'page_views_monthly',
    'category',
    'description'
  ]
  
  const filledFields = fields.filter(field => {
    const value = listing[field]
    return value !== null && value !== undefined && value !== '' && value !== 0
  }).length
  
  return Math.round((filledFields / fields.length) * 100)
}