import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Type definitions
interface ChartDataPoint {
  date: string
  value: number
  volume?: number
}

interface IndustryStats {
  high30d: number
  low30d: number
  avg30d: number
  totalTransactions: number
  avgPrice: number
}

interface IndustryChartData {
  industry: string
  current: number
  change24h: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  chartData: ChartDataPoint[]
  stats: IndustryStats
}

// Industry configuration
const INDUSTRIES = [
  'SaaS',
  'E-commerce',
  'Content Sites',
  'Mobile Apps',
  'Marketplace',
  'Newsletter',
  'EdTech',
  'Dropshipping',
  '핀테크',
  '헬스케어',
  '교육',
  '미디어/컨텐츠'
]

const BASE_MULTIPLES: Record<string, number> = {
  'SaaS': 4.2,
  'E-commerce': 2.8,
  'Content Sites': 3.1,
  'Mobile Apps': 5.5,
  'Marketplace': 3.8,
  'Newsletter': 2.5,
  'EdTech': 3.9,
  'Dropshipping': 2.2,
  '핀테크': 5.2,
  '헬스케어': 4.3,
  '교육': 2.6,
  '미디어/컨텐츠': 3.2
}

// Mock data generator with proper scope
function generateMockData(requestedDays: number = 30): IndustryChartData[] {
  return INDUSTRIES.map(industry => {
    const baseMultiple = BASE_MULTIPLES[industry] || 3.0
    const chartData: ChartDataPoint[] = []
    let currentValue = baseMultiple

    // Generate time series data
    for (let i = requestedDays - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Add realistic variation
      const dailyChange = (Math.random() - 0.5) * 0.1 // ±5% daily change
      currentValue *= (1 + dailyChange)
      currentValue = Math.max(1.0, Math.min(8.0, currentValue)) // Keep within bounds
      
      chartData.push({
        date: date.toISOString().split('T')[0],
        value: Number(currentValue.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000 + 100000)
      })
    }

    // Calculate statistics
    const values = chartData.map(d => d.value)
    const high30d = Math.max(...values)
    const low30d = Math.min(...values)
    const avg30d = values.reduce((a, b) => a + b, 0) / values.length
    
    const current = values[values.length - 1]
    const previous = values[values.length - 2] || current
    const change24h = current - previous
    const changePercent = previous !== 0 ? (change24h / previous) * 100 : 0
    
    const trend: 'up' | 'down' | 'stable' = 
      changePercent > 1 ? 'up' : 
      changePercent < -1 ? 'down' : 'stable'

    return {
      industry,
      current,
      change24h: Number(change24h.toFixed(2)),
      changePercent: Number(changePercent.toFixed(1)),
      trend,
      chartData,
      stats: {
        high30d: Number(high30d.toFixed(2)),
        low30d: Number(low30d.toFixed(2)),
        avg30d: Number(avg30d.toFixed(2)),
        totalTransactions: Math.floor(Math.random() * 100 + 20),
        avgPrice: Math.floor(Math.random() * 200000 + 50000)
      }
    }
  })
}

// Database data processor
async function processDbData(dbData: any[], days: number): Promise<IndustryChartData[]> {
  const industriesMap = new Map<string, any[]>()
  
  // Group by industry
  dbData.forEach(item => {
    if (!industriesMap.has(item.industry)) {
      industriesMap.set(item.industry, [])
    }
    industriesMap.get(item.industry)!.push(item)
  })
  
  const result: IndustryChartData[] = []
  
  for (const [industry, data] of industriesMap.entries()) {
    if (data.length < 2) continue
    
    // Sort by date
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Transform to chart data
    const chartData: ChartDataPoint[] = data.map(d => ({
      date: d.date,
      value: Number(d.avg_profit_multiple || 0),
      volume: d.transaction_count || 0
    }))
    
    const values = chartData.map(d => d.value).filter(v => v > 0)
    if (values.length === 0) continue
    
    const current = values[values.length - 1]
    const previous = values[values.length - 2] || current
    const change24h = current - previous
    const changePercent = previous !== 0 ? (change24h / previous) * 100 : 0
    
    // Calculate stats
    const high30d = Math.max(...values)
    const low30d = Math.min(...values)
    const avg30d = values.reduce((sum, val) => sum + val, 0) / values.length
    const totalTransactions = data.reduce((sum, d) => sum + (d.transaction_count || 0), 0)
    const totalVolume = data.reduce((sum, d) => sum + Number(d.total_volume || 0), 0)
    
    // Determine trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (secondAvg > firstAvg * 1.02) trend = 'up'
    else if (secondAvg < firstAvg * 0.98) trend = 'down'
    
    result.push({
      industry,
      current,
      change24h: Number(change24h.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      trend,
      chartData,
      stats: {
        high30d: Number(high30d.toFixed(2)),
        low30d: Number(low30d.toFixed(2)),
        avg30d: Number(avg30d.toFixed(2)),
        totalTransactions,
        avgPrice: totalTransactions > 0 ? Math.round(totalVolume / totalTransactions) : 0
      }
    })
  }
  
  return result
}

// Main API handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '8')
    const sortBy = searchParams.get('sortBy') || 'transactions'
    const industries = searchParams.get('industries')?.split(',').filter(Boolean)
    
    // Validate parameters
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365.' },
        { status: 400 }
      )
    }
    
    let data: IndustryChartData[] = []
    let usingMockData = false
    let dbError: string | null = null
    
    try {
      // Try to fetch from database
      const supabase = await createClient()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      let query = supabase
        .from('industry_multiples_timeseries')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('industry')
        .order('date', { ascending: true })
      
      if (industries && industries.length > 0) {
        query = query.in('industry', industries)
      }
      
      const { data: dbData, error } = await query
      
      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }
      
      if (!dbData || dbData.length === 0) {
        throw new Error('No data available in database')
      }
      
      // Process database data
      data = await processDbData(dbData, days)
      
      if (data.length === 0) {
        throw new Error('No valid data after processing')
      }
      
    } catch (error) {
      console.error('Database fetch failed:', error)
      dbError = error instanceof Error ? error.message : 'Unknown database error'
      
      // Use mock data as fallback
      data = generateMockData(days)
      usingMockData = true
      
      // Filter mock data by industries if specified
      if (industries && industries.length > 0) {
        data = data.filter(item => industries.includes(item.industry))
      }
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'change':
        data.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        break
      case 'value':
        data.sort((a, b) => b.current - a.current)
        break
      case 'transactions':
      default:
        data.sort((a, b) => b.stats.totalTransactions - a.stats.totalTransactions)
        break
    }
    
    // Apply limit
    if (limit > 0) {
      data = data.slice(0, limit)
    }
    
    // Response object
    const response = {
      success: true,
      data,
      lastUpdated: new Date().toISOString(),
      period: `${days}d`,
      totalIndustries: data.length,
      meta: {
        days,
        limit,
        sortBy,
        usingMockData,
        dbError
      }
    }
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': usingMockData 
          ? 'public, s-maxage=60, stale-while-revalidate=120' 
          : 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error('API error:', error)
    
    // Always return mock data on error
    const mockData = generateMockData(30)
    
    return NextResponse.json({
      success: true,
      data: mockData.slice(0, 8),
      lastUpdated: new Date().toISOString(),
      period: '30d',
      totalIndustries: 8,
      meta: {
        days: 30,
        limit: 8,
        sortBy: 'transactions',
        usingMockData: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }
}

// CORS preflight handler
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