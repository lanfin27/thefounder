import { Metadata } from 'next'
import Hero from '@/components/home/Hero'
import FeaturedPosts from '@/components/home/FeaturedPosts'
import CategorySection from '@/components/home/CategorySection'
import NewsletterSection from '@/components/home/NewsletterSection'

export const metadata: Metadata = {
  title: 'The Founder - 한국 스타트업 인사이트 플랫폼',
  description: '창업과 스타트업에 대한 깊이 있는 인사이트를 제공하는 콘텐츠 플랫폼',
  keywords: ['창업', '스타트업', '비즈니스', '인사이트', '뉴스레터'],
  openGraph: {
    title: 'The Founder - 스타트업 인사이트 플랫폼',
    description: '창업과 스타트업에 대한 깊이 있는 인사이트를 제공하는 콘텐츠 플랫폼',
    images: ['/og-image.jpg'],
  },
}

export default async function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'The Founder',
    'description': '창업과 스타트업에 대한 깊이 있는 인사이트를 제공하는 콘텐츠 플랫폼',
    'url': 'https://thefounder.co.kr',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-white">
        <Hero />
        <FeaturedPosts />
        <CategorySection />
        <NewsletterSection />
      </div>
    </>
  )
}