'use client'

import { useEffect } from 'react'

interface ChartAnalyticsProps {
  chartId?: string
  position?: number
  variant?: 'homepage' | 'dashboard' | 'detail'
}

export function useChartAnalytics() {
  const trackChartView = (props: ChartAnalyticsProps) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'chart_view', {
        chart_id: props.chartId,
        position: props.position,
        variant: props.variant,
        timestamp: new Date().toISOString()
      })
    }
  }

  const trackChartInteraction = (action: string, props: ChartAnalyticsProps & { value?: any }) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'chart_interaction', {
        action,
        chart_id: props.chartId,
        position: props.position,
        variant: props.variant,
        value: props.value,
        timestamp: new Date().toISOString()
      })
    }
  }

  const trackChartConversion = (action: 'signup' | 'calculate' | 'full_dashboard', source: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'chart_conversion', {
        action,
        source,
        timestamp: new Date().toISOString()
      })
    }
  }

  return {
    trackChartView,
    trackChartInteraction,
    trackChartConversion
  }
}

// Component to track chart visibility
export function ChartVisibilityTracker({ 
  chartId, 
  position, 
  variant = 'homepage' 
}: ChartAnalyticsProps) {
  const { trackChartView } = useChartAnalytics()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackChartView({ chartId, position, variant })
            observer.disconnect()
          }
        })
      },
      { threshold: 0.5 }
    )

    const element = document.getElementById(`chart-${chartId}`)
    if (element) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [chartId, position, variant])

  return null
}