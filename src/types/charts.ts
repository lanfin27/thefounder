// Chart-related type definitions
export interface ChartDataPoint {
  date: string
  value: number
  volume?: number
  high?: number
  low?: number
}

export interface IndustryChartData {
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

export interface ChartTimeRange {
  label: string
  value: number
  shortLabel: string
}

export const CHART_TIME_RANGES: ChartTimeRange[] = [
  { label: '1일', value: 1, shortLabel: '1D' },
  { label: '1주', value: 7, shortLabel: '1W' },
  { label: '1개월', value: 30, shortLabel: '1M' },
  { label: '3개월', value: 90, shortLabel: '3M' },
  { label: '6개월', value: 180, shortLabel: '6M' },
  { label: '1년', value: 365, shortLabel: '1Y' },
]

export interface ChartApiResponse {
  success: boolean
  data: IndustryChartData[]
  period: string
  totalIndustries: number
  lastUpdated: string
  fallback?: boolean
}

export interface TimeSeriesDataPoint {
  industry: string
  date: string
  avg_profit_multiple: number | null
  avg_revenue_multiple: number | null
  transaction_count: number
  total_volume: number
  volatility_index: number | null
  high_multiple: number | null
  low_multiple: number | null
}

// Chart formatting utilities
export const formatChartDate = (dateString: string, range: number): string => {
  const date = new Date(dateString)
  
  if (range <= 7) {
    // For weekly view, show day and month
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric'
    }).format(date)
  } else if (range <= 90) {
    // For monthly/quarterly view, show month and day
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric'
    }).format(date).replace(/\./g, '/')
  } else {
    // For longer views, show year and month
    return new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: 'short'
    }).format(date)
  }
}

export const formatChartValue = (value: number): string => {
  return value.toFixed(1) + 'x'
}

export const formatPercentChange = (change: number): string => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

export const getChangeColor = (change: number): string => {
  if (change > 0) return 'text-red-600' // Red for up (Korean market convention)
  if (change < 0) return 'text-blue-600' // Blue for down
  return 'text-gray-600'
}

export const getChartGradient = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return 'from-red-500/20 to-red-500/5' // Red gradient for upward
    case 'down':
      return 'from-blue-500/20 to-blue-500/5' // Blue gradient for downward
    default:
      return 'from-gray-500/20 to-gray-500/5' // Gray for stable
  }
}

// Mock data generator for testing
export const generateMockChartData = (
  industry: string,
  days: number,
  baseValue: number,
  volatility: number = 0.1
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Generate realistic price movement
    const randomWalk = (Math.random() - 0.5) * volatility
    const trendComponent = Math.sin(i * 0.1) * 0.05
    const value = baseValue * (1 + randomWalk + trendComponent)
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Number(value.toFixed(2)),
      volume: Math.floor(Math.random() * 100) + 10,
      high: Number((value * 1.02).toFixed(2)),
      low: Number((value * 0.98).toFixed(2))
    })
  }
  
  return data
}