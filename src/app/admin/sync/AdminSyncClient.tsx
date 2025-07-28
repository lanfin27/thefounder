'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface AdminSyncClientProps {
  config: {
    notionDatabaseId: string
    hasNotionToken: boolean
    hasAdminToken: boolean
  }
}

export default function AdminSyncClient({ config }: AdminSyncClientProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
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

      setSyncResult(data)
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

      {/* Sync Results */}
      {syncResult && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Sync Results</h2>
          </div>
          <div className="p-6">
            <pre className="bg-gray-50 border border-gray-200 p-4 rounded-md overflow-auto text-sm font-mono">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}