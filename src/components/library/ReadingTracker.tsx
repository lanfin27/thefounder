'use client'

import { useEffect, useRef } from 'react'
import { trackReading } from '@/lib/supabase/queries/reading-history'

interface ReadingTrackerProps {
  postId: string
}

export default function ReadingTracker({ postId }: ReadingTrackerProps) {
  const hasTrackedView = useRef(false)
  const lastProgressUpdate = useRef(0)

  useEffect(() => {
    // Track initial view (read_count increment)
    if (!hasTrackedView.current) {
      hasTrackedView.current = true
      trackReading({ post_id: postId, progress: 0 }).catch(err => {
        console.error('Failed to track initial view:', err)
      })
    }

    // Track scroll progress
    function calculateProgress(): number {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY

      // Calculate how much of the page has been scrolled
      const scrollableHeight = documentHeight - windowHeight
      if (scrollableHeight <= 0) return 100

      const progress = Math.min(100, Math.round((scrollTop / scrollableHeight) * 100))
      return progress
    }

    function handleScroll() {
      const currentProgress = calculateProgress()

      // Only update if progress increased by at least 10% to reduce DB writes
      if (currentProgress >= lastProgressUpdate.current + 10) {
        lastProgressUpdate.current = currentProgress
        trackReading({ post_id: postId, progress: currentProgress }).catch(err => {
          console.error('Failed to track progress:', err)
        })
      }
    }

    // Throttle scroll events (max once per second)
    let throttleTimeout: NodeJS.Timeout | null = null
    function throttledHandleScroll() {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleScroll()
          throttleTimeout = null
        }, 1000)
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })

    // Track when user leaves the page
    function handleBeforeUnload() {
      const finalProgress = calculateProgress()
      // Track reading progress on page unload
      trackReading({ post_id: postId, progress: finalProgress }).catch(() => {
        // Silently fail on page unload
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    }
  }, [postId])

  // This component renders nothing
  return null
}
