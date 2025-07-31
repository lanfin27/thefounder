import { Suspense } from 'react'
import { Metadata } from 'next'
import Hero from '@/components/home/Hero'
import FeaturedPosts from '@/components/home/FeaturedPosts'
import CategorySection from '@/components/home/CategorySection'
import HomepageChartPreview from '@/components/public/HomepageChartPreview'
import CompactChartSkeleton from '@/components/public/CompactChartSkeleton'
import NewsletterSection from '@/components/home/NewsletterSection'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'The Founder - 한국 스타트업 인사이트 플랫폼',
  description: '실시간 업종별 기업가치 배수와 창업 인사이트를 한곳에서. 내 비즈니스의 정확한 가치를 3분만에 확인하세요.',
  keywords: ['창업', '기업가치', '배수', '밸류에이션', '스타트업', 'M&A', '기업분석'],
  openGraph: {
    title: 'The Founder - 실시간 업종별 기업가치 차트',
    description: '실제 거래 데이터 기반 업종별 배수를 실시간 차트로 확인하고, 내 비즈니스 가치를 무료로 계산해보세요.',
    images: ['/og-chart-dashboard.jpg'],
  },
}

export default async function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'The Founder - 업종별 기업가치 배수 대시보드',
    'description': '실시간 업종별 기업가치 배수 차트와 밸류에이션 도구',
    'url': 'https://thefounder.co.kr',
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'KRW'
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-white">
        <Hero />
        
        {/* NEW: Industry Charts Preview Section */}
        <section className="py-16 bg-white" id="industry-charts">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<CompactChartSkeleton />}>
              <HomepageChartPreview />
            </Suspense>
          </div>
        </section>
        
        <FeaturedPosts />
        <CategorySection />
        
        {/* Full Dashboard Link Section */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              더 자세한 업종별 분석이 필요하신가요?
            </h3>
            <p className="text-gray-600 mb-6">
              전체 업종 차트와 상세 분석, 과거 데이터까지 모두 확인하세요
            </p>
            <Link 
              href="/charts"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-green-600 bg-white border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              전체 차트 대시보드 보기
            </Link>
          </div>
        </section>
        
        <NewsletterSection />
      </div>
    </>
  )
}