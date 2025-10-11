// Enhanced dashboard statistics API for migrated Supabase data
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'
    
    // Get total count with proper error handling
    const { count: totalCount, error: countError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError

    // Get category breakdown
    const { data: categoryData, error: categoryError } = await supabase
      .from('flippa_listings')
      .select('category')
      .not('category', 'is', null)

    if (categoryError) throw categoryError

    // Process category counts
    const categoryCounts = categoryData?.reduce((acc: Record<string, number>, item) => {
      const category = item.category || 'Other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {}) || {}

    // Get price distribution (asking_price)
    const { data: priceData, error: priceError } = await supabase
      .from('flippa_listings')
      .select('asking_price')
      .not('asking_price', 'is', null)
      .gt('asking_price', 0)

    if (priceError) throw priceError

    const prices = priceData?.map(p => p.asking_price) || []
    const priceDistribution = {
      under10k: prices.filter(p => p < 10000).length,
      '10k-50k': prices.filter(p => p >= 10000 && p < 50000).length,
      '50k-100k': prices.filter(p => p >= 50000 && p < 100000).length,
      '100k-500k': prices.filter(p => p >= 100000 && p < 500000).length,
      over500k: prices.filter(p => p >= 500000).length
    }

    // Get revenue analysis (monthly_revenue)
    const { data: revenueData, error: revenueError } = await supabase
      .from('flippa_listings')
      .select('monthly_revenue, monthly_profit')
      .not('monthly_revenue', 'is', null)
      .gt('monthly_revenue', 0)

    if (revenueError) throw revenueError

    const revenues = revenueData?.map(r => r.monthly_revenue) || []
    const profits = revenueData?.map(r => r.monthly_profit).filter(p => p > 0) || []
    
    const revenueStats = {
      totalListingsWithRevenue: revenues.length,
      averageRevenue: revenues.length > 0 ? Math.round(revenues.reduce((a, b) => a + b, 0) / revenues.length) : 0,
      medianRevenue: revenues.length > 0 ? revenues.sort((a, b) => a - b)[Math.floor(revenues.length / 2)] : 0,
      averageProfit: profits.length > 0 ? Math.round(profits.reduce((a, b) => a + b, 0) / profits.length) : 0,
      profitMargin: revenues.length > 0 && profits.length > 0 
        ? Math.round((profits.reduce((a, b) => a + b, 0) / revenues.reduce((a, b) => a + b, 0)) * 100)
        : 0
    }

    // Get age distribution (age_months)
    const { data: ageData, error: ageError } = await supabase
      .from('flippa_listings')
      .select('age_months')
      .not('age_months', 'is', null)
      .gt('age_months', 0)

    if (ageError) throw ageError

    const ages = ageData?.map(a => a.age_months) || []
    const ageDistribution = {
      under6months: ages.filter(a => a < 6).length,
      '6-12months': ages.filter(a => a >= 6 && a < 12).length,
      '1-2years': ages.filter(a => a >= 12 && a < 24).length,
      '2-5years': ages.filter(a => a >= 24 && a < 60).length,
      over5years: ages.filter(a => a >= 60).length
    }

    // Get traffic analysis (page_views_monthly)
    const { data: trafficData, error: trafficError } = await supabase
      .from('flippa_listings')
      .select('page_views_monthly')
      .not('page_views_monthly', 'is', null)
      .gt('page_views_monthly', 0)

    if (trafficError) throw trafficError

    const pageViews = trafficData?.map(t => t.page_views_monthly) || []
    const trafficStats = {
      totalListingsWithTraffic: pageViews.length,
      averagePageViews: pageViews.length > 0 ? Math.round(pageViews.reduce((a, b) => a + b, 0) / pageViews.length) : 0,
      trafficDistribution: {
        under1k: pageViews.filter(v => v < 1000).length,
        '1k-10k': pageViews.filter(v => v >= 1000 && v < 10000).length,
        '10k-100k': pageViews.filter(v => v >= 10000 && v < 100000).length,
        over100k: pageViews.filter(v => v >= 100000).length
      }
    }

    // Get recent activity
    const { data: recentListings, error: recentError } = await supabase
      .from('flippa_listings')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (recentError) throw recentError

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const recentActivity = {
      last24h: recentListings?.filter(l => new Date(l.created_at) > dayAgo).length || 0,
      last7d: recentListings?.filter(l => new Date(l.created_at) > weekAgo).length || 0,
      lastUpdate: recentListings?.[0]?.created_at || null
    }

    // Calculate field completion rates
    const { data: completionData, error: completionError } = await supabase
      .from('flippa_listings')
      .select('title, url, asking_price, monthly_revenue, category, description')
      .limit(1000) // Sample for performance

    if (completionError) throw completionError

    const fieldCompletion = {
      title: completionData?.filter(d => d.title && d.title.length > 0).length || 0,
      url: completionData?.filter(d => d.url && d.url.length > 0).length || 0,
      asking_price: completionData?.filter(d => d.asking_price && d.asking_price > 0).length || 0,
      monthly_revenue: completionData?.filter(d => d.monthly_revenue && d.monthly_revenue > 0).length || 0,
      category: completionData?.filter(d => d.category && d.category.length > 0).length || 0,
      description: completionData?.filter(d => d.description && d.description.length > 0).length || 0
    }

    const totalSample = completionData?.length || 1
    const completionRates = Object.entries(fieldCompletion).reduce((acc, [field, count]) => {
      acc[field] = Math.round((count / totalSample) * 100)
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalListings: totalCount || 0,
          categoriesCount: Object.keys(categoryCounts).length,
          averageCompletionRate: Math.round(
            Object.values(completionRates).reduce((a, b) => a + b, 0) / Object.keys(completionRates).length
          ),
          lastUpdate: recentActivity.lastUpdate
        },
        categoryBreakdown: categoryCounts,
        priceDistribution,
        revenueAnalysis: revenueStats,
        ageDistribution,
        trafficAnalysis: trafficStats,
        recentActivity,
        fieldCompletionRates: completionRates,
        topCategories: Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([category, count]) => ({ category, count }))
      },
      metadata: {
        timestamp: new Date().toISOString(),
        totalRecords: totalCount || 0,
        timeRange
      }
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard statistics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}