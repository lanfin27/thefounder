'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { id: 'lists', label: '내 리스트', href: '/library/lists' },
  { id: 'reading-history', label: '읽은 기록', href: '/library/reading-history' },
  { id: 'responses', label: '내 댓글', href: '/library/responses' }
]

export default function LibraryTabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-200">
      <div className="flex gap-8">
        {tabs.map(tab => {
          const isActive = pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
