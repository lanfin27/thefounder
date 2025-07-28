import { createClient } from '@/lib/supabase/client'

interface TrackingEvent {
  postId: string
  userId?: string
  sessionId?: string
}

interface ReadingProgress {
  postId: string
  userId: string
  progress: number
  scrollDepth: number
  timeSpent: number
}

export class AnalyticsTracker {
  private supabase = createClient()
  private sessionId: string
  private startTime: number = 0
  private readingTimer: any = null

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  async trackPageView({ postId, userId }: TrackingEvent) {
    try {
      await this.supabase.from('post_views').insert({
        post_id: postId,
        user_id: userId,
        session_id: this.sessionId,
        referrer: document.referrer,
        user_agent: navigator.userAgent
      })
    } catch (error) {
      console.error('Failed to track page view:', error)
    }
  }

  startReadingTimer(postId: string, userId?: string) {
    this.startTime = Date.now()
    
    if (userId) {
      // Initialize or update reading history
      this.initializeReadingHistory(postId, userId)
    }

    // Start tracking scroll depth
    this.trackScrollDepth(postId, userId)
  }

  stopReadingTimer() {
    if (this.readingTimer) {
      clearInterval(this.readingTimer)
      this.readingTimer = null
    }
  }

  private async initializeReadingHistory(postId: string, userId: string) {
    try {
      await this.supabase.from('user_reading_history').upsert({
        user_id: userId,
        post_id: postId,
        started_at: new Date().toISOString(),
        last_read_at: new Date().toISOString(),
        progress: 0,
        total_reading_time: 0,
        completed: false
      }, {
        onConflict: 'user_id,post_id'
      })
    } catch (error) {
      console.error('Failed to initialize reading history:', error)
    }
  }

  private trackScrollDepth(postId: string, userId?: string) {
    let maxScrollDepth = 0
    let lastUpdateTime = Date.now()

    const updateProgress = async () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollDepth = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0

      maxScrollDepth = Math.max(maxScrollDepth, scrollDepth)

      const currentTime = Date.now()
      const timeSpent = Math.floor((currentTime - this.startTime) / 1000)

      if (userId && currentTime - lastUpdateTime > 5000) { // Update every 5 seconds
        lastUpdateTime = currentTime
        await this.updateReadingProgress({
          postId,
          userId,
          progress: maxScrollDepth,
          scrollDepth: maxScrollDepth,
          timeSpent
        })
      }
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    
    // Update progress periodically
    this.readingTimer = setInterval(() => updateProgress(), 10000) // Every 10 seconds

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.stopReadingTimer()
      window.removeEventListener('scroll', updateProgress)
      if (userId) {
        updateProgress() // Final update
      }
    })
  }

  private async updateReadingProgress({ postId, userId, progress, scrollDepth, timeSpent }: ReadingProgress) {
    try {
      const completed = progress > 90 // Consider completed if scrolled past 90%

      await this.supabase.from('user_reading_history').update({
        last_read_at: new Date().toISOString(),
        progress,
        total_reading_time: timeSpent,
        completed
      }).match({ user_id: userId, post_id: postId })

      // Update view duration if significant time spent
      if (timeSpent > 10) {
        await this.supabase.from('post_views').update({
          reading_duration: timeSpent,
          scroll_depth: scrollDepth
        }).match({ 
          post_id: postId, 
          session_id: this.sessionId 
        })
      }
    } catch (error) {
      console.error('Failed to update reading progress:', error)
    }
  }

  async trackEngagement(action: 'bookmark' | 'share' | 'like', postId: string, userId?: string) {
    // This can be extended to track various engagement metrics
    console.log(`Tracked ${action} for post ${postId}`)
  }
}

// Singleton instance
let analyticsInstance: AnalyticsTracker | null = null

export function getAnalytics(): AnalyticsTracker {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsTracker()
  }
  return analyticsInstance
}