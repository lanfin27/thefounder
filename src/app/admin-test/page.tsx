'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DASHBOARD_ROUTES } from '@/lib/constants'

export default function AdminTestPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    // Test utility functions
    const tests = {
      cn: cn('text-red-500', 'bg-blue-500', false && 'hidden'),
      formatCurrency: formatCurrency(123456),
      formatNumber: formatNumber(1234567),
      routes: DASHBOARD_ROUTES
    }

    setTestResults(tests)
    setStatus('success')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel Test</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Utility Functions Test</h2>
          
          {status === 'loading' && <p>Testing utilities...</p>}
          
          {status === 'success' && (
            <div className="space-y-2">
              <p>✅ cn() function: <code>{testResults.cn}</code></p>
              <p>✅ formatCurrency(): <code>{testResults.formatCurrency}</code></p>
              <p>✅ formatNumber(): <code>{testResults.formatNumber}</code></p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Routes</h2>
          <div className="space-y-2">
            {Object.entries(testResults.routes || {}).map(([key, route]) => (
              <p key={key}>
                {key}: <a href={route as string} className="text-blue-600 hover:underline">{route as string}</a>
              </p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Navigation Links</h2>
          <div className="space-y-2">
            <a href="/admin" className="block text-blue-600 hover:underline">
              Admin Home
            </a>
            <a href="/admin/flippa-listings" className="block text-blue-600 hover:underline">
              Flippa Listings Dashboard
            </a>
            <a href="/admin/scraping" className="block text-blue-600 hover:underline">
              Scraping Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}