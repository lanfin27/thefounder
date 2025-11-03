import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import { Sidebar, SidebarProvider } from '@/components/layout/Sidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import ClientLayout from '@/components/layout/ClientLayout'

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
        <AuthProvider>
          <ToastProvider>
            <ClientLayout>
              <SidebarProvider>
                {/* Fixed Header */}
                <Header />

                {/* Overlay Sidebar */}
                <Sidebar />

                {/* Main Content - 전체 화면 스크롤 */}
                <main className="pt-14 min-h-screen bg-white">
                  {children}
                </main>
              </SidebarProvider>
            </ClientLayout>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}