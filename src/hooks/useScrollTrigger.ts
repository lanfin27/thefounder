'use client'

import { useState, useEffect } from 'react'

export function useScrollTrigger(triggerPercentage: number = 0.33) {
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const clientHeight = window.innerHeight

      // Calculate how far the user has scrolled as a percentage
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight)

      if (scrollPercentage >= triggerPercentage && !triggered) {
        setTriggered(true)
      }
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [triggered, triggerPercentage])

  const reset = () => setTriggered(false)

  return { triggered, reset }
}