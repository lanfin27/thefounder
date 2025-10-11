'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Database, 
  Activity,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Monitoring Dashboard',
      href: '/admin/scraping-status',
      icon: BarChart3,
      description: 'Incremental monitoring (5,642 listings)'
    },
    {
      name: 'Sync Posts',
      href: '/admin/sync',
      icon: FileText,
      description: 'Notion sync'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md h-screen sticky top-0">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <nav className="px-4 pb-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-colors',
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}