// 메모리 캐시 (간단한 구현)
class NotionCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private TTL = 10 * 60 * 1000 // 🔥 10분 (5분 → 10분으로 증가)

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    console.log(`✅ [Cache] Cached: ${key}`)
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) {
      console.log(`❌ [Cache] Miss: ${key}`)
      return null
    }

    const age = Date.now() - cached.timestamp
    if (age > this.TTL) {
      console.log(`⏰ [Cache] Expired: ${key}`)
      this.cache.delete(key)
      return null
    }

    console.log(`✅ [Cache] Hit: ${key} (age: ${Math.round(age / 1000)}s)`)
    return cached.data
  }

  clear() {
    this.cache.clear()
    console.log('🗑️  [Cache] Cleared all cache')
  }

  // 특정 키 패턴 삭제
  clearPattern(pattern: string) {
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
    console.log(`🗑️  [Cache] Cleared cache for pattern: ${pattern}`)
  }

  // 캐시 통계 조회
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Math.round((now - value.timestamp) / 1000), // seconds
      size: JSON.stringify(value.data).length,
      expired: now - value.timestamp > this.TTL
    }))

    return {
      totalEntries: this.cache.size,
      ttl: this.TTL / 1000, // seconds
      entries: entries.sort((a, b) => b.age - a.age)
    }
  }
}

export const notionCache = new NotionCache()

// 캐시 키 생성 헬퍼
export function getCacheKey(type: string, ...params: (string | number | boolean)[]): string {
  // 🔥 빈 문자열, null, undefined 필터링
  const filteredParams = params
    .filter(param => param !== '' && param !== null && param !== undefined)
    .map(param => String(param))

  return filteredParams.length > 0
    ? `notion:${type}:${filteredParams.join(':')}`
    : `notion:${type}`
}
