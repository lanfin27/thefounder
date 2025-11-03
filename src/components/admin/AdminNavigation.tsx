'use client'

/**
 * Admin Navigation Component
 * Client Component for handling navigation with usePathname
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Database,
  Activity,
  FileText,
  BarChart3,
  Settings,
  Youtube
} from 'lucide-react'

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
  },
  {
    name: 'YouTube Industry Admin',
    href: '/admin/youtube-industry',
    icon: Youtube,
    description: '실시간 API 사용량 및 시스템 모니터링'
  }
]

export function AdminNavigation() {
  const pathname = usePathname()

  return (
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
  )
}
