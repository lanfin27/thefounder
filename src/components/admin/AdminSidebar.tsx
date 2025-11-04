'use client'

/**
 * Admin Sidebar Component
 * 관리자 페이지 사이드바 네비게이션
 */

import { LayoutDashboard, Database, Tags, Calendar, Settings, FileText, Activity, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: '대시보드',
    href: '/admin/youtube-industry',
    icon: LayoutDashboard
  },
  {
    title: '메인 페이지 관리',
    href: '/admin/homepage',
    icon: Home
  },
  {
    title: '채널 관리',
    href: '/admin/youtube-industry/channels',
    icon: Database
  },
  {
    title: '카테고리 관리',
    href: '/admin/youtube-industry/categories',
    icon: Tags
  },
  {
    title: '스케줄',
    href: '/admin/youtube-industry/schedules',
    icon: Calendar
  },
  {
    title: 'API 로그',
    href: '/admin/youtube-industry/logs',
    icon: FileText
  },
  {
    title: '모니터링',
    href: '/admin/youtube-industry/monitoring',
    icon: Activity
  },
  {
    title: '설정',
    href: '/admin/youtube-industry/settings',
    icon: Settings
  }
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
                          (item.href !== '/admin/youtube-industry' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* 시스템 상태 */}
      <div className="px-6 py-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          시스템 상태
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">서버</span>
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              정상
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">DB</span>
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              정상
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
