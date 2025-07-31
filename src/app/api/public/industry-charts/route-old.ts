import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ChartDataPoint {
  date: string
  value: number
  volume?: number
}

interface IndustryChartData {
  industry: string
  current: number
  change24h: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  chartData: ChartDataPoint[]
  stats: {
    high30d: number
    low30d: number
    avg30d: number
    totalTransactions: number
    avgPrice: number
  }
}

// This is a public endpoint - no authentication required
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const industries = searchParams.get('industries')?.split(',').filter(Boolean)
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365.' },
        { status: 400 }
      )
    }
    
    // Get time series data for charts
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    let query = supabase
      .from('industry_multiples_timeseries')
      .select(`
        industry,
        date,
        avg_profit_multiple,
        transaction_count,
        total_volume,
        high_multiple,
        low_multiple,
        volatility_index
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('industry')
      .order('date', { ascending: true })
    
    // Filter by specific industries if provided
    if (industries && industries.length > 0) {
      query = query.in('industry', industries)
    }
    
    const { data: timeSeriesData, error } = await query
    
    if (error) throw error
    
    // Group by industry and create chart data
    const industriesMap = new Map<string, any[]>()
    
    timeSeriesData?.forEach(item => {
      if (!industriesMap.has(item.industry)) {
        industriesMap.set(item.industry, [])
      }
      industriesMap.get(item.industry)!.push({
        date: item.date,
        value: Number(item.avg_profit_multiple?.toFixed(2)) || 0,
        volume: item.transaction_count || 0,
        totalVolume: Number(item.total_volume) || 0,
        high: Number(item.high_multiple) || 0,
        low: Number(item.low_multiple) || 0,
        volatility: Number(item.volatility_index) || 0
      })
    })
    
    // Process each industry
    const chartData: IndustryChartData[] = []
    
    for (const [industry, data] of industriesMap.entries()) {
      if (data.length < 2) continue // Need at least 2 points for trend
      
      // Sort by date (should already be sorted, but ensure)
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      const current = data[data.length - 1]?.value || 0
      const previous = data[data.length - 2]?.value || current
      const change24h = current - previous
      const changePercent = previous > 0 ? (change24h / previous) * 100 : 0
      
      // Calculate stats for the period
      const values = data.map(d => d.value).filter(v => v > 0)
      const high30d = Math.max(...values)
      const low30d = Math.min(...values)
      const avg30d = values.reduce((sum, val) => sum + val, 0) / values.length
      const totalTransactions = data.reduce((sum, d) => sum + (d.volume || 0), 0)
      const totalVolume = data.reduce((sum, d) => sum + (d.totalVolume || 0), 0)
      const avgPrice = totalTransactions > 0 ? totalVolume / totalTransactions : 0
      
      // Determine trend based on linear regression or simple comparison
      const firstHalfAvg = values.slice(0, Math.floor(values.length / 2))
        .reduce((sum, val) => sum + val, 0) / Math.floor(values.length / 2)
      const secondHalfAvg = values.slice(Math.floor(values.length / 2))
        .reduce((sum, val) => sum + val, 0) / (values.length - Math.floor(values.length / 2))
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (secondHalfAvg > firstHalfAvg * 1.02) trend = 'up'
      else if (secondHalfAvg < firstHalfAvg * 0.98) trend = 'down'
      
      chartData.push({
        industry,
        current,
        change24h: Number(change24h.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        trend,
        chartData: data.map(d => ({
          date: d.date,
          value: d.value,
          volume: d.volume
        })),
        stats: {
          high30d: Number(high30d.toFixed(2)),
          low30d: Number(low30d.toFixed(2)),
          avg30d: Number(avg30d.toFixed(2)),
          totalTransactions,
          avgPrice: Math.round(avgPrice)
        }
      })
    }
    
    // Sort by total transactions (popularity) or by request
    const sortBy = searchParams.get('sortBy') || 'transactions'
    if (sortBy === 'change') {
      chartData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    } else if (sortBy === 'value') {
      chartData.sort((a, b) => b.current - a.current)
    } else {
      chartData.sort((a, b) => b.stats.totalTransactions - a.stats.totalTransactions)
    }
    
    // Limit results if requested
    const limit = parseInt(searchParams.get('limit') || '8')
    const limitedData = limit > 0 ? chartData.slice(0, limit) : chartData
    
    return NextResponse.json({
      success: true,
      data: limitedData,
      period: `${days}d`,
      totalIndustries: chartData.length,
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error('Chart data fetch error:', error)
    
    // Fallback with mock time series data
    const generateMockTimeSeries = (industry: string, current: number, trendDirection: number = 0, daysCount: number = 30) => {
      const data: ChartDataPoint[] = []
      const baseValue = current * 0.9
      
      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dayProgress = (daysCount - i) / daysCount
        const trendEffect = baseValue * trendDirection * dayProgress * 0.1
        const randomVariation = (Math.random() - 0.5) * 0.2 * baseValue
        const seasonalEffect = Math.sin(i * 0.2) * 0.05 * baseValue
        
        const value = baseValue + trendEffect + randomVariation + seasonalEffect
        
        data.push({
          date: date.toISOString().split('T')[0],
          value: Math.max(0.5, Number(value.toFixed(2))),
          volume: Math.floor(Math.random() * 20) + 5
        })
      }
      return data
    }
    
    const fallbackData: IndustryChartData[] = [
      {
        industry: 'SaaS',
        current: 4.2,
        change24h: 0.3,
        changePercent: 7.7,
        trend: 'up',
        chartData: generateMockTimeSeries('SaaS', 4.2, 1, days),
        stats: { 
          high30d: 4.8, 
          low30d: 3.6, 
          avg30d: 4.1, 
          totalTransactions: 156, 
          avgPrice: 234000 
        }
      },
      {
        industry: 'E-commerce',
        current: 2.8,
        change24h: -0.1,
        changePercent: -3.4,
        trend: 'down',
        chartData: generateMockTimeSeries('E-commerce', 2.8, -0.5, days),
        stats: { 
          high30d: 3.2, 
          low30d: 2.5, 
          avg30d: 2.9, 
          totalTransactions: 89, 
          avgPrice: 156000 
        }
      },
      {
        industry: 'Content Sites',
        current: 3.1,
        change24h: 0.2,
        changePercent: 6.9,
        trend: 'up',
        chartData: generateMockTimeSeries('Content Sites', 3.1, 0.8, days),
        stats: { 
          high30d: 3.4, 
          low30d: 2.8, 
          avg30d: 3.0, 
          totalTransactions: 234, 
          avgPrice: 89000 
        }
      },
      {
        industry: 'Mobile Apps',
        current: 5.5,
        change24h: 0.7,
        changePercent: 14.6,
        trend: 'up',
        chartData: generateMockTimeSeries('Mobile Apps', 5.5, 1.5, days),
        stats: { 
          high30d: 6.2, 
          low30d: 4.8, 
          avg30d: 5.3, 
          totalTransactions: 45, 
          avgPrice: 67000 
        }
      },
      {
        industry: '핀테크',
        current: 5.2,
        change24h: 0.1,
        changePercent: 2.0,
        trend: 'stable',
        chartData: generateMockTimeSeries('핀테크', 5.2, 0.3, days),
        stats: { 
          high30d: 5.5, 
          low30d: 4.8, 
          avg30d: 5.1, 
          totalTransactions: 78, 
          avgPrice: 312000 
        }
      },
      {
        industry: '헬스케어',
        current: 4.3,
        change24h: 0.4,
        changePercent: 10.3,
        trend: 'up',
        chartData: generateMockTimeSeries('헬스케어', 4.3, 1.2, days),
        stats: { 
          high30d: 4.5, 
          low30d: 3.8, 
          avg30d: 4.1, 
          totalTransactions: 34, 
          avgPrice: 198000 
        }
      },
      {
        industry: '교육',
        current: 2.6,
        change24h: 0.0,
        changePercent: 0.0,
        trend: 'stable',
        chartData: generateMockTimeSeries('교육', 2.6, 0.1, days),
        stats: { 
          high30d: 2.8, 
          low30d: 2.4, 
          avg30d: 2.6, 
          totalTransactions: 23, 
          avgPrice: 78000 
        }
      },
      {
        industry: '미디어/컨텐츠',
        current: 3.2,
        change24h: 0.3,
        changePercent: 10.3,
        trend: 'up',
        chartData: generateMockTimeSeries('미디어/컨텐츠', 3.2, 0.7, days),
        stats: { 
          high30d: 3.4, 
          low30d: 2.9, 
          avg30d: 3.1, 
          totalTransactions: 123, 
          avgPrice: 145000 
        }
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      fallback: true,
      period: `${days}d`,
      totalIndustries: fallbackData.length,
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}