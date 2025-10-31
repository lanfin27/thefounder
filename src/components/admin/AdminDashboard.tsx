'use client'

/**
 * Admin Dashboard Component
 * YouTube Industry Analytics Admin Dashboard
 *
 * Shows real-time YouTube API quota usage
 */

import { QuotaUsageWidget } from './QuotaUsageWidget'

export function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            YouTube Industry Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            실시간 API 사용량 및 시스템 모니터링
          </p>
        </div>

        {/* Quota Usage Widget */}
        <QuotaUsageWidget />

        {/* Additional widgets can be added here */}
      </div>
    </div>
  )
}
