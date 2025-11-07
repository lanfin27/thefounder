import { Metadata } from 'next'
import LibraryTabs from '@/components/library/LibraryTabs'

export const metadata: Metadata = {
  title: '내 보관함 | The Founder',
  description: '저장한 글과 읽은 기록을 관리하세요'
}

export default function LibraryLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">내 보관함</h1>
        <p className="text-gray-600 mt-2">
          저장한 글과 읽은 기록을 관리하세요
        </p>
      </header>

      {/* Navigation Tabs */}
      <LibraryTabs />

      {/* Page Content */}
      <div className="mt-8">
        {children}
      </div>
    </div>
  )
}
