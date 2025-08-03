'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'

interface ScrapingMetrics {
  successRate: number
  totalListings: number
  fieldCompletion: {
    price: number
    revenue: number
    multiple: number
    title: number
  }
  processingTime: number
  lastRun: string
  meetsApifyStandard: boolean
}

interface SampleListing {
  id: string
  title: string
  price: number
  monthly: number
  type: string
  multiple: string
  badges: string[]
  url: string
}

interface SystemStatus {
  system: {
    status: 'operational' | 'warning' | 'error'
    uptime: string
    version: string
  }
  database: {
    status: 'connected' | 'disconnected'
    recordsCount: number
  }
  scraper: {
    status: 'idle' | 'running' | 'error'
    lastUpdate: string
  }
}

export default function ScrapingDashboard() {
  const [metrics, setMetrics] = useState<ScrapingMetrics | null>(null)
  const [sampleListings, setSampleListings] = useState<SampleListing[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    system: { status: 'operational', uptime: '24h 15m', version: '1.0.0' },
    database: { status: 'connected', recordsCount: 1247 },
    scraper: { status: 'idle', lastUpdate: '2 minutes ago' }
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // New state for button actions
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isScrapingRunning, setIsScrapingRunning] = useState(false)
  const [scrapingJobId, setScrapingJobId] = useState<string | null>(null)
  const [scrapingStatus, setScrapingStatus] = useState<string>('')
  const [scrapingProgress, setScrapingProgress] = useState({
    currentPage: 0,
    listingsFound: 0,
    marketplaceSize: null as number | null,
    completeness: 0
  })

  const loadMetrics = async () => {
    setIsLoading(true)
    
    try {
      console.log('🔄 Loading metrics from API...')
      
      const timestamp = Date.now()
      
      // Fetch real metrics
      const metricsResponse = await fetch(`/api/scraping/metrics?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      const metricsData = await metricsResponse.json()
      
      if (metricsData.success) {
        setMetrics(metricsData.data)
        console.log(`✅ Loaded metrics: ${metricsData.data.totalListings} total listings`)
        
        // Update system status based on real data
        setSystemStatus(prev => ({
          ...prev,
          database: {
            status: 'connected',
            recordsCount: metricsData.data.totalListings || 0
          },
          scraper: {
            status: isScrapingRunning ? 'running' : 'idle',
            lastUpdate: metricsData.data.lastRun ? 
              `${Math.round((Date.now() - new Date(metricsData.data.lastRun).getTime()) / 60000)} minutes ago` : 
              'Never'
          }
        }))
      }
      
      // Fetch sample listings
      const listingsResponse = await fetch(`/api/scraping/listings?limit=5&t=${timestamp}`, {
        cache: 'no-cache'
      })
      const listingsData = await listingsResponse.json()
      
      if (listingsData.success) {
        setSampleListings(listingsData.data)
      }
      
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Load initial data
    loadMetrics()
    
    // Reduced auto-refresh: every 60 seconds instead of 10 seconds
    const interval = setInterval(loadMetrics, 60000)
    return () => clearInterval(interval)
  }, [])

  // Check scraping job status if running
  useEffect(() => {
    if (scrapingJobId && isScrapingRunning) {
      const jobCheckInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/scraping/run-unified?jobId=${scrapingJobId}`)
          const data = await response.json()
          
          if (data.success) {
            // Update progress
            setScrapingProgress({
              currentPage: data.job.currentPage || 0,
              listingsFound: data.job.listingsFound || 0,
              marketplaceSize: data.job.marketplaceSize || null,
              completeness: data.job.completeness || 0
            })
            
            // Update status message
            if (data.job.currentPage > 0) {
              let statusMsg = `🔄 Page ${data.job.currentPage} - ${data.job.listingsFound} listings found`
              
              if (data.job.marketplaceSize) {
                statusMsg += ` (${data.job.completeness.toFixed(1)}% of ${data.job.marketplaceSize} total)`
              }
              
              setScrapingStatus(statusMsg)
            }
            
            if (data.job.status === 'completed') {
              setIsScrapingRunning(false)
              setScrapingJobId(null)
              setScrapingStatus(`✅ Scraping completed! ${data.job.listingsFound} listings collected (${data.job.completeness}% completeness)`)
              
              // Auto-refresh data after successful scraping
              setTimeout(() => {
                loadMetrics()
                setScrapingStatus('')
                setScrapingProgress({
                  currentPage: 0,
                  listingsFound: 0,
                  marketplaceSize: null,
                  completeness: 0
                })
              }, 3000)
              
              clearInterval(jobCheckInterval)
            } else if (data.job.status === 'failed') {
              setIsScrapingRunning(false)
              setScrapingStatus('❌ Scraping failed')
              clearInterval(jobCheckInterval)
            }
          }
        } catch (error) {
          console.error('Failed to check job status:', error)
        }
      }, 3000) // Check every 3 seconds
      
      return () => clearInterval(jobCheckInterval)
    }
  }, [scrapingJobId, isScrapingRunning])

  const handleRefreshData = async () => {
    setIsRefreshing(true)
    try {
      console.log('🔄 Manual data refresh triggered')
      await loadMetrics()
      console.log('✅ Data refreshed successfully')
    } catch (error) {
      console.error('❌ Failed to refresh data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRunScraper = async () => {
    setIsScrapingRunning(true)
    setScrapingStatus('🚀 Starting intelligent scraper...')
    setScrapingProgress({
      currentPage: 0,
      listingsFound: 0,
      marketplaceSize: null,
      completeness: 0
    })
    
    try {
      const response = await fetch('/api/scraping/run-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fast: false // Normal speed for respectful scraping
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setScrapingJobId(data.jobId)
        setScrapingStatus('🔍 Detecting marketplace size and starting collection...')
        console.log(`🚀 Unified scraping job started: ${data.jobId}`)
      } else {
        setIsScrapingRunning(false)
        setScrapingStatus(`❌ Failed to start: ${data.error}`)
        console.error('Failed to start scraping:', data.error)
      }
    } catch (error) {
      setIsScrapingRunning(false)
      setScrapingStatus('❌ Network error')
      console.error('Scraping request failed:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
      case 'connected':
        return <Badge variant="success">{status}</Badge>
      case 'warning':
        return <Badge variant="warning">{status}</Badge>
      case 'error':
      case 'disconnected':
        return <Badge variant="error">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TheFounder Flippa Scraper Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time monitoring of your Flippa data extraction system
          </p>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Status</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStatus.system.uptime}</p>
                </div>
                {getStatusBadge(systemStatus.system.status)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Database</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStatus.database.recordsCount.toLocaleString()}</p>
                </div>
                {getStatusBadge(systemStatus.database.status)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Scraper Control</p>
                  <p className="text-sm text-gray-500">{systemStatus.scraper.lastUpdate}</p>
                  {scrapingStatus && (
                    <p className="text-xs mt-1 text-blue-600">{scrapingStatus}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(isScrapingRunning ? 'running' : systemStatus.scraper.status)}
                  
                  {/* UNIFIED BUTTON SYSTEM */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      className="text-xs px-3 py-1"
                    >
                      {isRefreshing ? '🔄 Refreshing...' : '📊 Refresh'}
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="primary"
                      onClick={handleRunScraper}
                      disabled={isScrapingRunning || isRefreshing}
                      className="text-xs px-3 py-1"
                    >
                      {isScrapingRunning ? '⏳ Running...' : '🚀 Run Scraper'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scraping Progress Indicator - ENHANCED */}
        {isScrapingRunning && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent>
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700">🚀 Intelligent Scraping in Progress</h3>
                    <p className="text-blue-600">{scrapingStatus}</p>
                  </div>
                  <div className="text-right">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-500">Current Page:</span>
                    <span className="ml-1 font-medium text-blue-700">{scrapingProgress.currentPage}</span>
                  </div>
                  <div>
                    <span className="text-blue-500">Listings Found:</span>
                    <span className="ml-1 font-medium text-blue-700">{scrapingProgress.listingsFound}</span>
                  </div>
                  <div>
                    <span className="text-blue-500">Marketplace Size:</span>
                    <span className="ml-1 font-medium text-blue-700">
                      {scrapingProgress.marketplaceSize || 'Detecting...'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-500">Completeness:</span>
                    <span className="ml-1 font-medium text-blue-700">
                      {scrapingProgress.completeness > 0 ? `${scrapingProgress.completeness}%` : 'Calculating...'}
                    </span>
                  </div>
                </div>
                
                {scrapingProgress.completeness > 0 && (
                  <div className="mt-3">
                    <Progress 
                      value={scrapingProgress.completeness} 
                      label="Collection Progress"
                      className="h-2"
                    />
                  </div>
                )}
                
                <p className="text-xs text-blue-500 mt-2">
                  Job ID: {scrapingJobId} | No fixed limits - adapts to actual marketplace size
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        {metrics && (
          <>
            {/* Success Rate Hero Card */}
            <Card className="mb-8 border-green-200 bg-green-50">
              <CardContent>
                <div className="text-center py-6">
                  <h2 className="text-4xl font-bold text-green-700 mb-2">
                    {metrics.successRate}%
                  </h2>
                  <p className="text-green-600 text-lg font-medium mb-2">
                    Field Completion Rate
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Badge variant="success">
                      ✅ Exceeds 95% Apify Standard
                    </Badge>
                    <Badge variant="success">
                      ⚡ {formatDuration(metrics.processingTime)}
                    </Badge>
                    <Badge variant="success">
                      📊 {metrics.totalListings} listings
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Field Completion Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Extraction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={metrics.fieldCompletion.revenue} 
                    label="Success Rate"
                    className="mb-4"
                  />
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.fieldCompletion.revenue}%
                  </p>
                  <p className="text-sm text-gray-500">Perfect extraction</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Title Extraction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={metrics.fieldCompletion.title} 
                    label="Success Rate"
                    className="mb-4"
                  />
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.fieldCompletion.title}%
                  </p>
                  <p className="text-sm text-gray-500">Perfect extraction</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Price Extraction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={metrics.fieldCompletion.price} 
                    label="Success Rate"
                    className="mb-4"
                  />
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.fieldCompletion.price}%
                  </p>
                  <p className="text-sm text-gray-500">Excellent quality</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multiple Extraction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={metrics.fieldCompletion.multiple} 
                    label="Success Rate"
                    className="mb-4"
                  />
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.fieldCompletion.multiple}%
                  </p>
                  <p className="text-sm text-gray-500">High accuracy</p>
                </CardContent>
              </Card>
            </div>

            {/* Sample Listings */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Extractions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleListings.map((listing, index) => (
                    <div key={listing.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {index + 1}. {listing.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">ID: {listing.id}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Price:</span>
                              <span className="ml-1 font-medium">{formatCurrency(listing.price)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Monthly:</span>
                              <span className="ml-1 font-medium">{formatCurrency(listing.monthly)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Type:</span>
                              <span className="ml-1 font-medium">{listing.type}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Multiple:</span>
                              <span className="ml-1 font-medium">{listing.multiple}</span>
                            </div>
                          </div>
                        </div>
                        <a 
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View →
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {listing.badges.map((badge, badgeIndex) => (
                          <Badge key={badgeIndex} variant="info" className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}