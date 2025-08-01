'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'

interface SystemStatus {
  system: {
    health: {
      status: string
      queueActive: boolean
      databaseConnected: boolean
      lastActivity: string | null
      errorRate: number
    }
    uptime: number
    timestamp: string
  }
  queue: {
    stats: {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
      paused: number
      total: number
    }
    recentJobs: any[]
  }
  database: {
    connected: boolean
    listings: {
      total: number
      active: number
      recent: any[]
    }
    jobs: {
      total: number
      pending: number
      running: number
      completed: number
      failed: number
    }
  }
  scraping: {
    active: boolean
    jobsInProgress: number
    jobsWaiting: number
    lastRun: string | null
    successRate: number
  }
}

interface ListingsData {
  listings: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  categories: { name: string; count: number }[]
  summary: {
    totalListings: number
    averagePrice: number
    lastUpdated: string | null
  }
}

export default function ScrapingDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [listings, setListings] = useState<ListingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken') || 'thefounder_admin_2025_secure'
      
      // Fetch status
      const statusRes = await fetch('/api/scraping/status', {
        headers: { 'x-admin-token': adminToken }
      })
      
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.success) {
          setStatus(statusData.data)
        }
      }

      // Fetch listings
      const listingsRes = await fetch('/api/listings?limit=10', {
        headers: { 'x-admin-token': adminToken }
      })
      
      if (listingsRes.ok) {
        const listingsData = await listingsRes.json()
        if (listingsData.success) {
          setListings(listingsData.data)
        }
      }

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading scraping dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Flippa Scraping Dashboard</h1>

      {/* System Status */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">System Health</h3>
            <div className={`text-2xl font-bold ${
              status.system.health.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {status.system.health.status.toUpperCase()}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Error Rate: {status.system.health.errorRate}%
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Queue Status</h3>
            <div className="space-y-1">
              <div>Active: {status.queue.stats.active}</div>
              <div>Waiting: {status.queue.stats.waiting}</div>
              <div>Completed: {status.queue.stats.completed}</div>
              <div>Failed: {status.queue.stats.failed}</div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Database</h3>
            <div className="space-y-1">
              <div>Total Listings: {status.database.listings.total}</div>
              <div>Active: {status.database.listings.active}</div>
              <div>Jobs: {status.database.jobs.total}</div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Scraping</h3>
            <div className="space-y-1">
              <div>Status: {status.scraping.active ? 'Active' : 'Idle'}</div>
              <div>In Progress: {status.scraping.jobsInProgress}</div>
              <div>Success Rate: {status.scraping.successRate}%</div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Listings */}
      {listings && listings.listings.length > 0 && (
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Recent Listings</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scraped
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listings.listings.map((listing) => (
                  <tr key={listing.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {listing.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${listing.asking_price?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {listing.primary_category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${listing.monthly_revenue?.toLocaleString()}/mo
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(listing.scraped_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Total: {listings.pagination.total} listings | 
            Average Price: ${listings.summary.averagePrice?.toLocaleString()}
          </div>
        </Card>
      )}

      {/* Categories */}
      {listings && listings.categories.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.categories.slice(0, 8).map((category) => (
              <div key={category.name} className="bg-gray-50 p-3 rounded">
                <div className="font-medium">{category.name}</div>
                <div className="text-sm text-gray-600">{category.count} listings</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}