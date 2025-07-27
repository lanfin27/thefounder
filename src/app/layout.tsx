import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Founder - 한국 스타트업 인사이트',
  description: '한국 스타트업 생태계의 깊이 있는 인사이트와 창업가들의 이야기',
  openGraph: {
    title: 'The Founder',
    description: '한국 스타트업 생태계의 깊이 있는 인사이트',
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
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}