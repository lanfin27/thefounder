'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SimpleSelect as Select } from '@/components/ui/Select'
import { Loader2, Search, Download, RefreshCw } from 'lucide-react'

interface DashboardProps {
  initialData?: any
}

export function DashboardClient({ initialData }: DashboardProps) {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [stats, setStats] = useState<any>(initialData?.stats || null)
  const [listings, setListings] = useState<any>(initialData?.listings || null)
  const [metrics, setMetrics] = useState<any>(initialData?.metrics || null)
  const [charts, setCharts] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, metricsRes, chartsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/metrics?type=overview'),
        fetch('/api/dashboard/charts?type=all')
      ])

      if (!statsRes.ok || !metricsRes.ok || !chartsRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [statsData, metricsData, chartsData] = await Promise.all([
        statsRes.json(),
        metricsRes.json(),
        chartsRes.json()
      ])

      setStats(statsData)
      setMetrics(metricsData)
      setCharts(chartsData)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      setError('Failed to load dashboard data. Please try refreshing.')
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  // Fetch listings with filters
  const fetchListings = useCallback(async () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '20',
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory !== 'all' && { category: selectedCategory }),
      ...(priceRange.min && { priceMin: priceRange.min }),
      ...(priceRange.max && { priceMax: priceRange.max })
    })

    try {
      const res = await fetch(`/api/dashboard/listings?${params}`)
      const data = await res.json()
      setListings(data)
    } catch (error) {
      console.error('Listings fetch error:', error)
    }
  }, [currentPage, searchQuery, selectedCategory, priceRange])

  // Initial load
  useEffect(() => {
    if (!initialData) {
      fetchDashboardData()
    }
  }, [fetchDashboardData, initialData])

  // Fetch listings when filters change
  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Export data
  const handleExport = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams({
      format,
      ...(selectedCategory !== 'all' && { category: selectedCategory }),
      ...(priceRange.min && { priceMin: priceRange.min }),
      ...(priceRange.max && { priceMax: priceRange.max })
    })

    window.open(`/api/dashboard/export?${params}`, '_blank')
  }

  if (initialLoading && !stats && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching 5,645+ listings from Supabase</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Flippa Listings Dashboard</h1>
          <p className="text-gray-600 mt-1">Analyzing {stats?.data?.overview?.totalListings?.toLocaleString() || '5,645+'} business listings</p>
        </div>
        <Button 
          onClick={() => {
            fetchDashboardData()
            fetchListings()
          }}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Listings</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.data?.overview?.totalListings?.toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              +{stats?.data?.recentActivity?.last24h || 0} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-3xl">
              ${(metrics?.data?.overview?.totalValue / 1000000)?.toFixed(1) || '0'}M
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Avg Multiple: {metrics?.data?.overview?.averageMultiple || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.data?.overview?.averageCompletionRate || 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Data Quality: {metrics?.data?.highlights?.dataQuality || 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.data?.overview?.categoriesCount || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Top: {stats?.data?.topCategories?.[0]?.category || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">All Categories</option>
              {listings?.data?.filters?.availableCategories?.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>

            <Input
              type="number"
              placeholder="Min Price"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="w-[120px]"
            />
            
            <Input
              type="number"
              placeholder="Max Price"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="w-[120px]"
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('json')}>
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Listings 
            {listings?.data?.stats && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Showing {listings.data.stats.showing} of {listings.data.stats.totalMatching})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Multiple</th>
                  <th className="text-right p-2">Age</th>
                  <th className="text-right p-2">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {listings?.data?.listings?.map((listing: any) => (
                  <tr key={listing.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <a 
                        href={listing.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {listing.title}
                      </a>
                    </td>
                    <td className="p-2">{listing.category}</td>
                    <td className="text-right p-2">
                      ${listing.asking_price?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="text-right p-2">
                      ${listing.monthly_revenue?.toLocaleString() || 'N/A'}/mo
                    </td>
                    <td className="text-right p-2">{listing.multiple || 'N/A'}</td>
                    <td className="text-right p-2">{listing.age_display}</td>
                    <td className="text-right p-2">
                      {listing.page_views_monthly?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {listings?.data?.pagination && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Page {listings.data.pagination.page} of {listings.data.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={!listings.data.pagination.hasPrev}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!listings.data.pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Completion Rates */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Field Completion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.data?.fieldCompletionRates && Object.entries(stats.data.fieldCompletionRates).map(([field, rate]: [string, any]) => (
                <div key={field}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{field}</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.data?.topCategories?.map((cat: any, index: number) => (
                <div key={cat.category} className="flex justify-between items-center">
                  <span className="text-sm">
                    {index + 1}. {cat.category}
                  </span>
                  <span className="text-sm font-medium">
                    {cat.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}