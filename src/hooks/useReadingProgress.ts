'use client'

import { useEffect, useRef } from 'react'
import { getAnalytics } from '@/lib/analytics/tracking'
import { usePathname } from 'next/navigation'

interface UseReadingProgressProps {
  postId: string
  userId?: string
  enabled?: boolean
}

export function useReadingProgress({ postId, userId, enabled = true }: UseReadingProgressProps) {
  const analytics = useRef(getAnalytics())
  const pathname = usePathname()
  const hasTrackedView = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const tracker = analytics.current

    // Track page view once
    if (!hasTrackedView.current) {
      tracker.trackPageView({ postId, userId })
      hasTrackedView.current = true
    }

    // Start reading timer
    tracker.startReadingTimer(postId, userId)

    // Cleanup
    return () => {
      tracker.stopReadingTimer()
    }
  }, [postId, userId, enabled])

  // Reset tracking when pathname changes
  useEffect(() => {
    hasTrackedView.current = false
  }, [pathname])

  const trackEngagement = (action: 'bookmark' | 'share' | 'like') => {
    analytics.current.trackEngagement(action, postId, userId)
  }

  return {
    trackEngagement
  }
}