'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, RefreshCw, TrendingUp, FileText, Clock, BarChart3 } from 'lucide-react'

interface AdminSyncClientProps {
  config: {
    notionDatabaseId: string
    hasNotionToken: boolean
    hasAdminToken: boolean
  }
}

interface SyncHistory {
  timestamp: string
  total: number
  synced: number
  failed: number
  duration: number
}

export default function AdminSyncClient({ config }: AdminSyncClientProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  const handleSync = async () => {
    const startTime = Date.now()
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      // First check if we have the admin token in localStorage (from admin auth)
      const adminToken = localStorage.getItem('adminToken')

      // If not in localStorage, prompt for it
      if (!adminToken) {
        const inputToken = prompt('Enter admin token:')
        if (!inputToken) {
          throw new Error('Admin token required')
        }
        // Store for future use in this session
        localStorage.setItem('adminToken', inputToken)
      }

      const tokenToUse = adminToken || localStorage.getItem('adminToken')

      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // If unauthorized, clear the stored token
        if (response.status === 401) {
          localStorage.removeItem('adminToken')
        }
        throw new Error(data.error || 'Sync failed')
      }

      const duration = Date.now() - startTime
      setSyncResult(data)
      setLastSyncTime(new Date().toISOString())

      // Add to sync history
      const historyEntry: SyncHistory = {
        timestamp: new Date().toISOString(),
        total: data.total || 0,
        synced: data.synced || 0,
        failed: data.failed || 0,
        duration
      }
      setSyncHistory(prev => [historyEntry, ...prev].slice(0, 10)) // Keep last 10
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  const handleTestSync = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await fetch('/api/notion/test-sync')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Test sync failed')
      }

      setSyncResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Notion Sync Admin</h1>

      {/* Configuration Status */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configuration Status</h2>
          <p className="mt-1 text-sm text-gray-600">
            Environment variables and API keys status
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {config.notionDatabaseId !== 'Not configured' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <span className="text-gray-700">Notion Database ID: <span className="font-mono text-sm">{config.notionDatabaseId}</span></span>
            </div>
            <div className="flex items-center gap-2">
              {config.hasNotionToken ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <span className="text-gray-700">Notion Token: <span className="font-semibold">{config.hasNotionToken ? 'Configured' : 'Not configured'}</span></span>
            </div>
            <div className="flex items-center gap-2">
              {config.hasAdminToken ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <span className="text-gray-700">Admin Token: <span className="font-semibold">{config.hasAdminToken ? 'Configured' : 'Not configured'}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Sync Actions</h2>
          <p className="mt-1 text-sm text-gray-600">
            Sync posts from Notion to Supabase
          </p>
        </div>
        <div className="p-6">
          <div className="flex gap-4">
            <button 
              onClick={handleSync} 
              disabled={syncing || !config.hasNotionToken}
              className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Posts'
              )}
            </button>
            <button 
              onClick={handleTestSync} 
              disabled={syncing || !config.hasNotionToken}
              className="inline-flex items-center px-4 py-2 bg-white text-black font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Sync (Dev Only)'
              )}
            </button>
          </div>
          {!config.hasAdminToken && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Admin token is configured in environment variables. 
                When you click "Sync Posts", you'll be prompted to enter the admin token.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Dashboard */}
      {syncResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{syncResult.total || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Synced</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{syncResult.synced || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{syncResult.failed || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {syncResult.total > 0
                    ? `${Math.round((syncResult.synced / syncResult.total) * 100)}%`
                    : '0%'
                  }
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Sync Results Table */}
      {syncResult && syncResult.posts && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Synced Posts</h2>
            <p className="mt-1 text-sm text-gray-600">
              List of posts synchronized from Notion
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncResult.posts.map((post: any, index: number) => (
                  <tr key={post.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{post.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {post.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">{post.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {syncResult.failedPosts && syncResult.failedPosts.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-red-50">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Failed Posts:</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {syncResult.failedPosts.map((title: string, index: number) => (
                  <li key={index}>{title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Sync History
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Recent synchronization operations (last 10)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Synced
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncHistory.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {entry.synced}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                      {entry.failed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(entry.duration / 1000).toFixed(2)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              entry.total > 0 && (entry.synced / entry.total) === 1
                                ? 'bg-green-500'
                                : entry.synced > 0
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: entry.total > 0
                                ? `${(entry.synced / entry.total) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          {entry.total > 0
                            ? `${Math.round((entry.synced / entry.total) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}