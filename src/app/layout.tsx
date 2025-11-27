import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import { Sidebar, SidebarProvider } from '@/components/layout/Sidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { BookmarkProvider } from '@/contexts/BookmarkContext'
import { UserProvider } from '@/contexts/UserContext'
import { ToastProvider } from '@/components/ui/Toast'
import ClientLayout from '@/components/layout/ClientLayout'
import SmartScale from '@/components/utils/SmartScale'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'The Founder - 한국 1인 창업가를 위한 인사이트',
  description: '실제로 성공한 1인 창업가들의 이야기와 인사이트',
  openGraph: {
    title: 'The Founder',
    description: '실제로 성공한 1인 창업가들의 이야기와 인사이트',
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
        <SmartScale />
        <AuthProvider>
          <UserProvider>
            <ToastProvider>
              <ClientLayout>
                <SidebarProvider>
                  <BookmarkProvider>
                    {/* 🚨 Header를 완전히 독립적으로 (fixed로 화면 전체 폭) */}
                    {/* 🔥 z-[100]으로 Sidebar들 위에 표시 */}
                    <div className="fixed top-0 left-0 right-0 z-[100]">
                      <Header />
                    </div>

                    {/* 🚨 Header 높이만큼 padding-top */}
                    <div className="pt-16">
                      {/* Left Sidebar */}
                      <Sidebar />

                      {/* Right Sidebar */}
                      <RightSidebar />

                      {/* Main Content - Sidebar 여백만 적용 */}
                      <main className="lg:pl-64 xl:pr-80 2xl:pr-[368px] min-h-screen bg-white">
                        {children}
                      </main>
                    </div>
                  </BookmarkProvider>
                </SidebarProvider>
              </ClientLayout>
            </ToastProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  )
}