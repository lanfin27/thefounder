'use client'

import Link from 'next/link'
import { 
  Database, 
  Activity,
  BarChart3,
  FileText,
  ArrowRight
} from 'lucide-react'

export default function AdminPage() {
  const sections = [
    {
      title: 'Flippa Listings Dashboard',
      description: 'View and analyze 5,645+ Flippa business listings with advanced filtering, search, and export capabilities.',
      href: '/admin/flippa-listings',
      icon: Database,
      stats: '5,645+ records',
      color: 'bg-blue-500'
    },
    {
      title: 'Enhanced Scraping Dashboard',
      description: 'Advanced scraping tools with real-time monitoring, performance metrics, and Apify-level capabilities.',
      href: '/admin/scraping',
      icon: Activity,
      stats: 'Real-time monitoring',
      color: 'bg-green-500'
    },
    {
      title: 'Scraping Status',
      description: 'Monitor current scraping jobs, success rates, and system performance.',
      href: '/admin/scraping-status',
      icon: BarChart3,
      stats: 'Live status',
      color: 'bg-purple-500'
    },
    {
      title: 'Notion Sync',
      description: 'Synchronize blog posts from Notion database to the website.',
      href: '/admin/sync',
      icon: FileText,
      stats: 'Content sync',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your application data, scraping operations, and content synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6"
            >
              <div className="flex items-start space-x-4">
                <div className={`${section.color} rounded-lg p-3 text-white`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {section.description}
                  </p>
                  <div className="mt-3 flex items-center text-sm text-gray-500">
                    <span className="font-medium">{section.stats}</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">Admin Access Required</h3>
          <p className="mt-1 text-sm text-yellow-700">
            These sections require admin authentication. Make sure you have the correct admin token configured.
          </p>
        </div>
      </div>
    </div>
  )
}