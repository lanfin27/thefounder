// Simple in-memory cache for industry data and calculations
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class ValuationCache {
  private cache = new Map<string, CacheItem<any>>()
  
  // Cache keys
  static readonly KEYS = {
    INDUSTRIES: 'industries_list',
    INDUSTRY_DATA: (industry: string) => `industry_${industry}`,
    RECENT_LISTINGS: (industry: string) => `listings_${industry}`,
    USER_STATS: (userId: string) => `stats_${userId}`,
    TEMPLATES: 'templates_public'
  }

  set<T>(key: string, data: T, ttlMinutes = 60): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear all entries matching a pattern
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Get cache size
  size(): number {
    return this.cache.size
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const valuationCache = new ValuationCache()

// Cache wrapper for async functions
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes = 60
): Promise<T> {
  // Check cache first
  const cached = valuationCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const data = await fetcher()
  valuationCache.set(key, data, ttlMinutes)
  return data
}

// Debounce function for API calls
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

// Rate limiter for API calls
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  canMakeRequest(): boolean {
    const now = Date.now()
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }

  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    return Math.max(0, this.maxRequests - this.requests.length)
  }
}

export const apiRateLimiter = new RateLimiter(30, 60000) // 30 requests per minute