/**
 * YouTube Industry Admin Layout
 * 관리자 페이지 레이아웃
 */

import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export const metadata = {
  title: 'YouTube Industry Admin | The Founder',
  description: 'YouTube Industry 관리자 대시보드'
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: 실제 인증 시스템 구현
  // 현재는 개발 환경에서만 접근 가능하도록 설정
  const isAdmin = process.env.NODE_ENV === 'development' || process.env.ADMIN_ENABLED === 'true'

  if (!isAdmin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
