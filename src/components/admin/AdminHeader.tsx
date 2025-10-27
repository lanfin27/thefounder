'use client'

/**
 * Admin Header Component
 * 관리자 페이지 상단 헤더
 */

import { Bell, User, Settings } from 'lucide-react'
import Link from 'next/link'

export function AdminHeader() {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/youtube-industry" className="text-xl font-bold text-gray-900 dark:text-white">
            YouTube Industry Admin
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* 알림 */}
          <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* 설정 */}
          <Link
            href="/admin/youtube-industry/settings"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* 사용자 프로필 */}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
