/**
 * Admin Layout (Server Component)
 * Base layout for admin pages
 */

import { AdminNavigation } from '@/components/admin/AdminNavigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md h-screen sticky top-0">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <AdminNavigation />
        </div>

        {/* Main content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}