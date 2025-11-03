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
    <html lang="ko" className="h-full">
      <body className="font-sans h-full overflow-hidden">
        <AuthProvider>
          <ToastProvider>
            <ClientLayout>
              {/* Fixed Header */}
              <Header />

              {/* Main Container - 3 Column Layout */}
              <div className="flex h-[calc(100vh-56px)]">
                {/* Left Sidebar - Independent Scroll */}
                <Sidebar />

                {/* Main Content Area - Independent Scroll */}
                <main className="flex-1 overflow-y-auto bg-white">
                  <div className="max-w-[680px] mx-auto px-6 py-8">
                    {children}
                  </div>
                </main>

                {/* Right Sidebar - Independent Scroll */}
                <RightSidebar />
              </div>
            </ClientLayout>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}