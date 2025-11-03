import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import ClientLayout from '@/components/layout/ClientLayout'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'The Founder - 한국 1인 창업가를 위한 인사이트',
  description: '한국 1인 창업가들의 성장을 돕는 인사이트 콘텐츠 허브',
  openGraph: {
    title: 'The Founder',
    description: '한국 1인 창업가들의 성장을 돕는 인사이트 콘텐츠 허브',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://thefounder.co.kr',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <AuthProvider>
          <ToastProvider>
            <ClientLayout>
              <Header />

              {/* Medium 3단 레이아웃 */}
              <div className="flex min-h-screen max-w-[1336px] mx-auto">
                {/* 왼쪽 사이드바 - 네비게이션 */}
                <Sidebar />

                {/* 중앙 메인 콘텐츠 */}
                <main className="flex-1 max-w-[728px] mx-auto px-6">
                  {children}
                </main>

                {/* 오른쪽 사이드바 - 추천 */}
                <RightSidebar />
              </div>
            </ClientLayout>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}