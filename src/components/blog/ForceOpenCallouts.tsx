'use client'

import { useEffect } from 'react'

/**
 * Force open all Notion toggle callouts
 * Prevents callouts from being collapsed/hidden
 */
export default function ForceOpenCallouts() {
  useEffect(() => {
    // Function to force open all details elements
    const forceOpenDetails = () => {
      const detailsElements = document.querySelectorAll<HTMLDetailsElement>(
        'details.notion-callout, details.notion-toggle, details[class*="callout"]'
      )

      detailsElements.forEach((details) => {
        // 1. Force open attribute
        details.open = true

        // 2. Prevent closing on click
        const clickHandler = (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          details.open = true
        }
        details.addEventListener('click', clickHandler)

        // 3. Prevent toggle event
        const toggleHandler = (e: Event) => {
          e.preventDefault()
          details.open = true
        }
        details.addEventListener('toggle', toggleHandler)

        // 4. Force open summary clicks
        const summary = details.querySelector('summary')
        if (summary) {
          summary.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            details.open = true
          })
        }
      })

      console.log(`[ForceOpenCallouts] Forced ${detailsElements.length} callouts to open`)
    }

    // Initial force open
    forceOpenDetails()

    // Create MutationObserver to watch for dynamic changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Watch for open attribute changes
        if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
          const target = mutation.target as HTMLDetailsElement
          if (!target.open) {
            console.log('[ForceOpenCallouts] Detected closed callout, forcing open')
            target.open = true
          }
        }

        // Watch for new nodes added
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const newDetails = node.querySelectorAll<HTMLDetailsElement>(
                'details.notion-callout, details.notion-toggle, details[class*="callout"]'
              )
              if (newDetails.length > 0) {
                console.log(`[ForceOpenCallouts] Found ${newDetails.length} new callouts, forcing open`)
                forceOpenDetails()
              }
            }
          })
        }
      })
    })

    // Observe all details elements for attribute changes
    const detailsElements = document.querySelectorAll<HTMLDetailsElement>(
      'details.notion-callout, details.notion-toggle, details[class*="callout"]'
    )
    detailsElements.forEach((details) => {
      observer.observe(details, {
        attributes: true,
        attributeFilter: ['open']
      })
    })

    // Observe document body for new elements
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Force open every 100ms for first 2 seconds (catch late renders)
    const intervalId = setInterval(forceOpenDetails, 100)
    setTimeout(() => clearInterval(intervalId), 2000)

    // Cleanup
    return () => {
      observer.disconnect()
      clearInterval(intervalId)
    }
  }, [])

  return null
}
