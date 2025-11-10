'use client'

import Link from 'next/link'
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
            <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Code */}
          <h1 className="text-7xl font-bold text-gray-900 dark:text-white mb-2">
            403
          </h1>

          {/* Error Title */}
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Access Forbidden
          </h2>

          {/* Error Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            You don't have permission to access this page.
            <br />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Admin privileges are required.
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Help Box */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong className="font-semibold">Need admin access?</strong>
            <br />
            <span className="text-blue-700 dark:text-blue-300">
              Contact the administrator to request permissions.
            </span>
          </p>
        </div>

        {/* Additional Info */}
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  )
}
