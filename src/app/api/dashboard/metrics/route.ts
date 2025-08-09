// Dashboard metrics API with real-time calculations
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
    const metricType = searchParams.get('type') || 'overview'
    
    switch (metricType) {
      case 'overview':
        return await getOverviewMetrics()
      case 'performance':
        return await getPerformanceMetrics()
      case 'quality':
        return await getQualityMetrics()
      case 'realtime':
        return await getRealtimeMetrics()
      default:
        return await getOverviewMetrics()
    }
  } catch (error: any) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch metrics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

async function getOverviewMetrics() {
  // Get total listings count
  const { count: totalListings } = await supabase
    .from('flippa_listings')
    .select('*', { count: 'exact', head: true })

  // Get listings with complete data
  const { data: completeListings } = await supabase
    .from('flippa_listings')
    .select('id')
    .not('title', 'is', null)
    .not('asking_price', 'is', null)
    .not('monthly_revenue', 'is', null)
    .not('category', 'is', null)

  const completionRate = totalListings > 0 
    ? Math.round((completeListings?.length || 0) / totalListings * 100)
    : 0

  // Get value metrics
  const { data: valueData } = await supabase
    .from('flippa_listings')
    .select('asking_price, monthly_revenue, monthly_profit')
    .gt('asking_price', 0)

  const totalValue = valueData?.reduce((sum, item) => sum + (item.asking_price || 0), 0) || 0
  const totalRevenue = valueData?.reduce((sum, item) => sum + (item.monthly_revenue || 0), 0) || 0
  const avgMultiple = totalRevenue > 0 ? (totalValue / (totalRevenue * 12)).toFixed(2) : 'N/A'

  // Get recent activity
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentListings } = await supabase
    .from('flippa_listings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', twentyFourHoursAgo)

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalListings: totalListings || 0,
        completionRate,
        totalValue: Math.round(totalValue),
        totalMonthlyRevenue: Math.round(totalRevenue),
        averageMultiple: avgMultiple,
        recentListings24h: recentListings || 0
      },
      highlights: {
        dataQuality: completionRate >= 90 ? 'Excellent' : completionRate >= 70 ? 'Good' : 'Fair',
        growthRate: recentListings > 0 ? '+' + recentListings : '0',
        topMetric: totalListings > 5000 ? 'Large Dataset' : 'Growing Dataset'
      }
    }
  })
}

async function getPerformanceMetrics() {
  // Get performance stats over time
  const { data: hourlyData } = await supabase
    .from('flippa_listings')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  // Group by hour
  const hourlyGroups = hourlyData?.reduce((acc: any, item) => {
    const hour = new Date(item.created_at).toISOString().slice(0, 13)
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {}) || {}

  // Calculate rates
  const hours = Object.keys(hourlyGroups).sort()
  const rates = hours.map(hour => ({
    hour,
    count: hourlyGroups[hour],
    rate: hourlyGroups[hour]
  }))

  // Get category performance
  const { data: categoryData } = await supabase
    .from('flippa_listings')
    .select('category')
    .not('category', 'is', null)

  const categoryPerformance = categoryData?.reduce((acc: any, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {}) || {}

  return NextResponse.json({
    success: true,
    data: {
      performance: {
        extractionRates: rates.slice(-24), // Last 24 hours
        peakHour: rates.reduce((max, r) => r.count > max.count ? r : max, rates[0])?.hour,
        averageRate: rates.length > 0 
          ? Math.round(rates.reduce((sum, r) => sum + r.count, 0) / rates.length)
          : 0
      },
      categoryPerformance: Object.entries(categoryPerformance)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }))
    }
  })
}

async function getQualityMetrics() {
  // Sample data for quality analysis
  const { data: sample } = await supabase
    .from('flippa_listings')
    .select('*')
    .limit(1000)

  if (!sample || sample.length === 0) {
    return NextResponse.json({
      success: true,
      data: { quality: { fields: {}, overall: 0 } }
    })
  }

  // Calculate field quality scores
  const fieldQuality = {
    title: sample.filter(s => s.title && s.title.length > 10).length / sample.length * 100,
    url: sample.filter(s => s.url && s.url.startsWith('http')).length / sample.length * 100,
    asking_price: sample.filter(s => s.asking_price && s.asking_price > 0).length / sample.length * 100,
    monthly_revenue: sample.filter(s => s.monthly_revenue && s.monthly_revenue > 0).length / sample.length * 100,
    monthly_profit: sample.filter(s => s.monthly_profit !== null).length / sample.length * 100,
    category: sample.filter(s => s.category && s.category !== 'Other').length / sample.length * 100,
    description: sample.filter(s => s.description && s.description.length > 50).length / sample.length * 100,
    age_months: sample.filter(s => s.age_months && s.age_months > 0).length / sample.length * 100,
    page_views: sample.filter(s => s.page_views_monthly && s.page_views_monthly > 0).length / sample.length * 100
  }

  const overallQuality = Object.values(fieldQuality).reduce((sum, score) => sum + score, 0) / Object.keys(fieldQuality).length

  // Find data issues
  const issues = []
  if (fieldQuality.title < 90) issues.push('Missing titles')
  if (fieldQuality.asking_price < 80) issues.push('Missing prices')
  if (fieldQuality.monthly_revenue < 70) issues.push('Missing revenue data')
  if (fieldQuality.description < 60) issues.push('Incomplete descriptions')

  return NextResponse.json({
    success: true,
    data: {
      quality: {
        fields: Object.entries(fieldQuality).reduce((acc, [field, score]) => {
          acc[field] = Math.round(score)
          return acc
        }, {} as any),
        overall: Math.round(overallQuality),
        grade: overallQuality >= 90 ? 'A' : overallQuality >= 80 ? 'B' : overallQuality >= 70 ? 'C' : 'D',
        issues,
        recommendations: issues.length > 0 
          ? ['Improve data extraction for ' + issues.join(', ')]
          : ['Data quality is excellent']
      }
    }
  })
}

async function getRealtimeMetrics() {
  // Get real-time statistics
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [hourCount, dayCount, totalCount] = await Promise.all([
    supabase.from('flippa_listings').select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo.toISOString()),
    supabase.from('flippa_listings').select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString()),
    supabase.from('flippa_listings').select('*', { count: 'exact', head: true })
  ])

  // Get latest listings
  const { data: latest } = await supabase
    .from('flippa_listings')
    .select('id, title, asking_price, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    success: true,
    data: {
      realtime: {
        lastHour: hourCount.count || 0,
        last24Hours: dayCount.count || 0,
        total: totalCount.count || 0,
        ratePerHour: Math.round((dayCount.count || 0) / 24),
        status: hourCount.count > 0 ? 'Active' : 'Idle',
        latestListings: latest?.map(l => ({
          id: l.id,
          title: l.title || 'Untitled',
          price: l.asking_price,
          time: new Date(l.created_at).toLocaleTimeString()
        })) || []
      }
    }
  })
}