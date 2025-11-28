import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import { Sidebar, SidebarProvider } from '@/components/layout/Sidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { UserProvider } from '@/contexts/UserContext'
import { BookmarkProvider } from '@/contexts/BookmarkContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { SmartScale } from '@/components/utils/SmartScale'
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'

// Viewport 설정
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ]
}

// 기본 메타데이터
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'The Founder - 한국 1인 창업가를 위한 인사이트 플랫폼',
    template: '%s | The Founder'
  },
  description: '성공한 창업가들의 인사이트와 창업 노하우를 만나보세요. 스타트업 성공 사례, 경영 전략, 투자 유치 팁부터 1인 창업, 소자본 창업까지 창업자에게 필요한 모든 정보를 제공합니다.',
  keywords: [
    '창업', '스타트업', '창업자', '1인 창업', '소자본 창업',
    '창업 아이디어', '사업 아이템', '창업 성공 사례',
    '스타트업 인사이트', '경영 전략', '투자 유치',
    'The Founder', '더파운더', '창업 플랫폼', '창업 콘텐츠',
    '창업 뉴스', '스타트업 뉴스', '창업 정보', '사업 정보'
  ],
  authors: [{ name: 'The Founder', url: 'https://thefounder.co.kr' }],
  creator: 'The Founder',
  publisher: 'The Founder',

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://thefounder.co.kr',
    siteName: 'The Founder',
    title: 'The Founder - 한국 1인 창업가를 위한 인사이트 플랫폼',
    description: '성공한 창업가들의 인사이트와 창업 노하우를 만나보세요. 스타트업 성공 사례, 경영 전략, 투자 유치 팁까지.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The Founder - 한국 창업자를 위한 플랫폼',
        type: 'image/png'
      }
    ]
  },

  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: 'The Founder - 한국 1인 창업가를 위한 인사이트 플랫폼',
    description: '성공한 창업가들의 인사이트와 창업 노하우를 만나보세요.',
    images: ['/og-image.png'],
    creator: '@thefounder_kr'
  },

  // 로봇 설정
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },

  // 아이콘
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#000000' }
    ]
  },

  // 매니페스트
  manifest: '/manifest.json',

  // 검증 코드 (실제 코드로 교체 필요)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || '',
    }
  },

  // 대체 언어 (필요시)
  alternates: {
    canonical: 'https://thefounder.co.kr',
    languages: {
      'ko-KR': 'https://thefounder.co.kr'
    }
  },

  // 기타
  category: 'business',
  classification: 'Business, Entrepreneurship, Startup',
}

import localFont from 'next/font/local'

const pretendard = localFont({
  src: [
    { path: '../../font/Pretendard-Thin.ttf', weight: '100', style: 'normal' },
    { path: '../../font/Pretendard-ExtraLight.ttf', weight: '200', style: 'normal' },
    { path: '../../font/Pretendard-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../font/Pretendard-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../font/Pretendard-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../font/Pretendard-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../font/Pretendard-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../font/Pretendard-ExtraBold.ttf', weight: '800', style: 'normal' },
    { path: '../../font/Pretendard-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className={`${pretendard.variable} font-sans`}>
        <SmartScale />
        <AuthProvider>
          <UserProvider>
            <ToastProvider>
              <ClientLayout>
                <SidebarProvider>
                  <BookmarkProvider>
                    {/* Header - fixed to screen top */}
                    <div className="fixed top-0 left-0 right-0 z-[100]">
                      <Header />
                    </div>

                    {/* Content with header spacing */}
                    <div className="pt-16">
                      {/* Left Sidebar */}
                      <Sidebar />

                      {/* Right Sidebar */}
                      <RightSidebar />

                      {/* Main Content */}
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
