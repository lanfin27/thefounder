'use client'

import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  apiResponseTime: number
  interactionDelay: number
}

export function useChartPerformance() {
  const metricsRef = useRef<Partial<PerformanceMetrics>>({})
  const startTimeRef = useRef<number>(Date.now())

  const measureApiCall = async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    try {
      const result = await apiCall()
      const duration = performance.now() - start
      metricsRef.current.apiResponseTime = duration
      
      // Log slow API calls
      if (duration > 1000) {
        console.warn(`Slow API call detected: ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }

  const measureRender = (callback: () => void) => {
    const start = performance.now()
    callback()
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const duration = performance.now() - start
      metricsRef.current.renderTime = duration
      
      // Report to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'timing_complete', {
          name: 'chart_render',
          value: Math.round(duration),
          event_category: 'performance'
        })
      }
    })
  }

  const reportMetrics = () => {
    const loadTime = Date.now() - startTimeRef.current
    const metrics: PerformanceMetrics = {
      loadTime,
      renderTime: metricsRef.current.renderTime || 0,
      apiResponseTime: metricsRef.current.apiResponseTime || 0,
      interactionDelay: 0
    }

    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log('Chart Performance Metrics:', {
        loadTime: `${metrics.loadTime}ms`,
        renderTime: `${metrics.renderTime.toFixed(2)}ms`,
        apiResponseTime: `${metrics.apiResponseTime.toFixed(2)}ms`
      })
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metrics', {
        event_category: 'charts',
        load_time: metrics.loadTime,
        render_time: Math.round(metrics.renderTime),
        api_response_time: Math.round(metrics.apiResponseTime)
      })
    }

    return metrics
  }

  // Monitor Core Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Observe Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          
          if (typeof (window as any).gtag !== 'undefined') {
            (window as any).gtag('event', 'web_vitals', {
              metric_name: 'LCP',
              metric_value: lastEntry.startTime,
              metric_delta: lastEntry.startTime,
              event_category: 'Web Vitals'
            })
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // Observe First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (typeof (window as any).gtag !== 'undefined') {
              (window as any).gtag('event', 'web_vitals', {
                metric_name: 'FID',
                metric_value: entry.processingStart - entry.startTime,
                event_category: 'Web Vitals'
              })
            }
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        return () => {
          lcpObserver.disconnect()
          fidObserver.disconnect()
        }
      } catch (error) {
        console.error('Performance monitoring error:', error)
      }
    }
  }, [])

  return {
    measureApiCall,
    measureRender,
    reportMetrics
  }
}

// Lazy load heavy components
export function lazyLoadCharts() {
  if ('IntersectionObserver' in window) {
    const chartElements = document.querySelectorAll('[data-lazy-chart]')
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement
          element.classList.add('chart-loaded')
          observer.unobserve(element)
        }
      })
    }, {
      rootMargin: '50px'
    })

    chartElements.forEach(element => imageObserver.observe(element))
  }
}