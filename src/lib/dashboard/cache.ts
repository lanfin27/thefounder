// Dashboard cache utilities for performance optimization
import { unstable_cache } from 'next/cache'

// Cache tags for invalidation
export const CACHE_TAGS = {
  stats: 'dashboard-stats',
  listings: 'dashboard-listings',
  metrics: 'dashboard-metrics',
  charts: 'dashboard-charts'
}

// Cache durations
export const CACHE_DURATIONS = {
  stats: 60 * 5, // 5 minutes
  listings: 60 * 2, // 2 minutes
  metrics: 60 * 5, // 5 minutes
  charts: 60 * 10 // 10 minutes
}

// Cached data fetchers
export const getCachedStats = unstable_cache(
  async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/stats`, {
      next: { revalidate: CACHE_DURATIONS.stats }
    })
    return res.json()
  },
  ['dashboard-stats'],
  {
    revalidate: CACHE_DURATIONS.stats,
    tags: [CACHE_TAGS.stats]
  }
)

export const getCachedMetrics = unstable_cache(
  async (type: string = 'overview') => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/metrics?type=${type}`, {
      next: { revalidate: CACHE_DURATIONS.metrics }
    })
    return res.json()
  },
  ['dashboard-metrics'],
  {
    revalidate: CACHE_DURATIONS.metrics,
    tags: [CACHE_TAGS.metrics]
  }
)

export const getCachedCharts = unstable_cache(
  async (type: string = 'all') => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/charts?type=${type}`, {
      next: { revalidate: CACHE_DURATIONS.charts }
    })
    return res.json()
  },
  ['dashboard-charts'],
  {
    revalidate: CACHE_DURATIONS.charts,
    tags: [CACHE_TAGS.charts]
  }
)

// Client-side cache for search results
class SearchCache {
  private cache: Map<string, { data: any; timestamp: number }>
  private maxSize: number
  private ttl: number

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(key: string, data: any): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

export const searchCache = new SearchCache()

// Debounce utility for search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}