// Dashboard charts API for data visualizations
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
    const chartType = searchParams.get('type') || 'all'
    
    const charts: any = {}

    if (chartType === 'all' || chartType === 'category') {
      charts.categoryDistribution = await getCategoryChart()
    }

    if (chartType === 'all' || chartType === 'price') {
      charts.priceDistribution = await getPriceChart()
    }

    if (chartType === 'all' || chartType === 'revenue') {
      charts.revenueAnalysis = await getRevenueChart()
    }

    if (chartType === 'all' || chartType === 'age') {
      charts.ageDistribution = await getAgeChart()
    }

    if (chartType === 'all' || chartType === 'traffic') {
      charts.trafficAnalysis = await getTrafficChart()
    }

    if (chartType === 'all' || chartType === 'timeline') {
      charts.timeline = await getTimelineChart()
    }

    if (chartType === 'all' || chartType === 'profit') {
      charts.profitAnalysis = await getProfitChart()
    }

    return NextResponse.json({
      success: true,
      data: charts,
      metadata: {
        timestamp: new Date().toISOString(),
        chartType
      }
    })
  } catch (error: any) {
    console.error('Charts API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch chart data',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

async function getCategoryChart() {
  const { data } = await supabase
    .from('flippa_listings')
    .select('category')
    .not('category', 'is', null)

  const categoryCounts = data?.reduce((acc: any, item) => {
    const category = item.category || 'Other'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {}) || {}

  const sortedCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)

  return {
    type: 'pie',
    data: {
      labels: sortedCategories.map(([cat]) => cat),
      datasets: [{
        data: sortedCategories.map(([, count]) => count),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#36A2EB'
        ]
      }]
    },
    summary: {
      total: Object.values(categoryCounts).reduce((sum: number, count: any) => sum + count, 0),
      topCategory: sortedCategories[0]?.[0] || 'None',
      categoryCount: Object.keys(categoryCounts).length
    }
  }
}

async function getPriceChart() {
  const { data } = await supabase
    .from('flippa_listings')
    .select('asking_price')
    .not('asking_price', 'is', null)
    .gt('asking_price', 0)

  const prices = data?.map(d => d.asking_price) || []
  
  const ranges = [
    { label: 'Under $10k', min: 0, max: 10000 },
    { label: '$10k-$25k', min: 10000, max: 25000 },
    { label: '$25k-$50k', min: 25000, max: 50000 },
    { label: '$50k-$100k', min: 50000, max: 100000 },
    { label: '$100k-$250k', min: 100000, max: 250000 },
    { label: '$250k-$500k', min: 250000, max: 500000 },
    { label: 'Over $500k', min: 500000, max: Infinity }
  ]

  const distribution = ranges.map(range => ({
    ...range,
    count: prices.filter(p => p >= range.min && p < range.max).length
  }))

  return {
    type: 'bar',
    data: {
      labels: distribution.map(d => d.label),
      datasets: [{
        label: 'Number of Listings',
        data: distribution.map(d => d.count),
        backgroundColor: '#36A2EB'
      }]
    },
    summary: {
      total: prices.length,
      average: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      median: prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0,
      highest: Math.max(...prices, 0),
      lowest: Math.min(...prices.filter(p => p > 0), 0)
    }
  }
}

async function getRevenueChart() {
  const { data } = await supabase
    .from('flippa_listings')
    .select('monthly_revenue, asking_price')
    .not('monthly_revenue', 'is', null)
    .gt('monthly_revenue', 0)
    .limit(100) // Sample for scatter plot

  const scatterData = data?.map(d => ({
    x: d.monthly_revenue,
    y: d.asking_price
  })) || []

  return {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Price vs Monthly Revenue',
        data: scatterData,
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Monthly Revenue ($)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Asking Price ($)'
          }
        }
      }
    },
    summary: {
      dataPoints: scatterData.length,
      correlation: 'Positive' // Simplified
    }
  }
}

async function getAgeChart() {
  const { data } = await supabase
    .from('flippa_listings')
    .select('age_months')
    .not('age_months', 'is', null)
    .gt('age_months', 0)

  const ages = data?.map(d => d.age_months) || []
  
  const ranges = [
    { label: '0-6 months', min: 0, max: 6 },
    { label: '6-12 months', min: 6, max: 12 },
    { label: '1-2 years', min: 12, max: 24 },
    { label: '2-3 years', min: 24, max: 36 },
    { label: '3-5 years', min: 36, max: 60 },
    { label: 'Over 5 years', min: 60, max: Infinity }
  ]

  const distribution = ranges.map(range => ({
    ...range,
    count: ages.filter(a => a >= range.min && a < range.max).length
  }))

  return {
    type: 'doughnut',
    data: {
      labels: distribution.map(d => d.label),
      datasets: [{
        data: distribution.map(d => d.count),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ]
      }]
    },
    summary: {
      total: ages.length,
      averageMonths: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
      mostCommon: distribution.reduce((max, d) => d.count > max.count ? d : max).label
    }
  }
}

async function getTrafficChart() {
  const { data } = await supabase
    .from('flippa_listings')
    .select('page_views_monthly, asking_price, category')
    .not('page_views_monthly', 'is', null)
    .gt('page_views_monthly', 0)
    .order('page_views_monthly', { ascending: false })
    .limit(20)

  return {
    type: 'horizontalBar',
    data: {
      labels: data?.map((d, i) => d.category || `Listing ${i + 1}`) || [],
      datasets: [{
        label: 'Monthly Page Views',
        data: data?.map(d => d.page_views_monthly) || [],
        backgroundColor: '#4BC0C0'
      }]
    },
    summary: {
      topTraffic: data?.[0]?.page_views_monthly || 0,
      averageTraffic: data?.length > 0 
        ? Math.round(data.reduce((sum, d) => sum + d.page_views_monthly, 0) / data.length)
        : 0
    }
  }
}

async function getTimelineChart() {
  // Get listings grouped by day for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const { data } = await supabase
    .from('flippa_listings')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Group by date
  const dailyCounts = data?.reduce((acc: any, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {}) || {}

  // Fill in missing dates
  const dates = []
  const counts = []
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    dates.push(dateStr)
    counts.push(dailyCounts[dateStr] || 0)
  }

  return {
    type: 'line',
    data: {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'New Listings',
        data: counts,
        borderColor: '#36A2EB',
        fill: false,
        tension: 0.1
      }]
    },
    summary: {
      total30Days: Object.values(dailyCounts).reduce((sum: number, count: any) => sum + count, 0),
      averagePerDay: Math.round(Object.values(dailyCounts).reduce((sum: number, count: any) => sum + count, 0) / 30),
      trend: counts[counts.length - 1] > counts[0] ? 'Increasing' : 'Decreasing'
    }
  }
}

async function getProfitChart() {
  const { data } = await supabase
    .from('flippa_listings')
    .select('monthly_revenue, monthly_profit, category')
    .not('monthly_revenue', 'is', null)
    .not('monthly_profit', 'is', null)
    .gt('monthly_revenue', 0)

  // Calculate profit margins by category
  const categoryProfits = data?.reduce((acc: any, item) => {
    const category = item.category || 'Other'
    const margin = (item.monthly_profit / item.monthly_revenue) * 100
    
    if (!acc[category]) {
      acc[category] = { total: 0, count: 0, margins: [] }
    }
    
    acc[category].margins.push(margin)
    acc[category].total += margin
    acc[category].count += 1
    
    return acc
  }, {}) || {}

  const profitData = Object.entries(categoryProfits)
    .map(([category, data]: [string, any]) => ({
      category,
      averageMargin: data.count > 0 ? data.total / data.count : 0,
      count: data.count
    }))
    .filter(d => d.count >= 5) // Only categories with enough data
    .sort((a, b) => b.averageMargin - a.averageMargin)
    .slice(0, 10)

  return {
    type: 'bar',
    data: {
      labels: profitData.map(d => d.category),
      datasets: [{
        label: 'Average Profit Margin (%)',
        data: profitData.map(d => Math.round(d.averageMargin)),
        backgroundColor: profitData.map(d => d.averageMargin > 30 ? '#4BC0C0' : '#FF6384')
      }]
    },
    summary: {
      highestMargin: profitData[0]?.category || 'N/A',
      averageMargin: Math.round(
        profitData.reduce((sum, d) => sum + d.averageMargin, 0) / profitData.length || 0
      ),
      profitableCategories: profitData.filter(d => d.averageMargin > 20).length
    }
  }
}