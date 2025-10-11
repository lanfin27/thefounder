// Client-side API functions for chart data
import { ChartApiResponse, IndustryChartData } from '@/types/charts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ChartDataOptions {
  days?: number
  industries?: string[]
  sortBy?: 'transactions' | 'change' | 'value'
  limit?: number
}

export async function fetchIndustryChartData(
  options: ChartDataOptions = {}
): Promise<ChartApiResponse> {
  const {
    days = 30,
    industries = [],
    sortBy = 'transactions',
    limit = 8
  } = options

  const params = new URLSearchParams({
    days: days.toString(),
    sortBy,
    limit: limit.toString()
  })

  if (industries.length > 0) {
    params.append('industries', industries.join(','))
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/public/industry-charts?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 5 minutes
        next: { revalidate: 300 }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch chart data:', error)
    // Return fallback data structure
    return {
      success: false,
      data: [],
      period: `${days}d`,
      totalIndustries: 0,
      lastUpdated: new Date().toISOString(),
      fallback: true
    }
  }
}

// Fetch specific industry chart data
export async function fetchIndustryDetail(
  industry: string,
  days: number = 30
): Promise<IndustryChartData | null> {
  try {
    const response = await fetchIndustryChartData({
      days,
      industries: [industry],
      limit: 1
    })

    if (response.success && response.data.length > 0) {
      return response.data[0]
    }

    return null
  } catch (error) {
    console.error(`Failed to fetch data for ${industry}:`, error)
    return null
  }
}

// WebSocket connection for real-time updates (optional)
export class ChartDataSubscriber {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private subscribers: Map<string, (data: IndustryChartData) => void> = new Map()

  connect(wsUrl: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('WebSocket connected for chart updates')
      // Subscribe to industries
      this.subscribers.forEach((_, industry) => {
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          industry
        }))
      })
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'update' && data.industry) {
          const callback = this.subscribers.get(data.industry)
          if (callback) {
            callback(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 5 seconds
      this.reconnectTimeout = setTimeout(() => {
        if (wsUrl) this.connect(wsUrl)
      }, 5000)
    }
  }

  subscribe(industry: string, callback: (data: IndustryChartData) => void) {
    this.subscribers.set(industry, callback)
    
    // If already connected, subscribe immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        industry
      }))
    }
  }

  unsubscribe(industry: string) {
    this.subscribers.delete(industry)
    
    // If connected, unsubscribe
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        industry
      }))
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.subscribers.clear()
  }
}

// Singleton instance for WebSocket
export const chartDataSubscriber = new ChartDataSubscriber()

// Calculate technical indicators
export function calculateMovingAverage(
  data: { value: number }[],
  period: number
): number[] {
  const result: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0) // Not enough data
    } else {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, point) => acc + point.value, 0)
      result.push(sum / period)
    }
  }
  
  return result
}

export function calculateVolatility(
  data: { value: number }[],
  period: number = 20
): number {
  if (data.length < period) return 0
  
  const recentData = data.slice(-period)
  const mean = recentData.reduce((sum, point) => sum + point.value, 0) / period
  const variance = recentData.reduce((sum, point) => 
    sum + Math.pow(point.value - mean, 2), 0
  ) / period
  
  return Math.sqrt(variance)
}