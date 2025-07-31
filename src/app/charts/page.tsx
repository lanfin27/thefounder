import { Metadata } from 'next'
import ChartsPageClient from './ChartsPageClient'

// SEO 메타데이터 - Server Component에서 export
export const metadata: Metadata = {
  title: '산업별 기업가치 배수 차트 - The Founder',
  description: '한국 스타트업 산업별 M&A 거래 기반 실시간 기업가치 배수 트렌드를 확인하세요. SaaS, 이커머스, 핀테크 등 다양한 산업군의 밸류에이션 동향을 한눈에.',
  keywords: ['기업가치 배수', '산업별 배수', 'M&A 트렌드', '밸류에이션', '스타트업 가치평가', 'Exit 배수'],
  openGraph: {
    title: '실시간 산업별 기업가치 배수 차트',
    description: '실제 M&A 거래 데이터 기반 한국 스타트업 산업별 배수 트렌드',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://thefounder.co.kr/charts',
    images: [
      {
        url: '/og-charts.jpg',
        width: 1200,
        height: 630,
        alt: '산업별 기업가치 배수 차트'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '실시간 산업별 기업가치 배수 차트 - The Founder',
    description: '한국 스타트업 산업별 M&A 배수 트렌드를 실시간으로 확인하세요',
    images: ['/og-charts.jpg']
  }
}

// 구조화된 데이터 (Schema.org)
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FinancialService',
  'name': '산업별 기업가치 배수 차트',
  'description': '실시간 M&A 거래 데이터 기반 산업별 기업가치 배수 트렌드 분석',
  'provider': {
    '@type': 'Organization',
    'name': 'The Founder',
    'url': 'https://thefounder.co.kr'
  },
  'areaServed': {
    '@type': 'Country',
    'name': '대한민국'
  },
  'hasOfferCatalog': {
    '@type': 'OfferCatalog',
    'name': '산업별 배수 데이터',
    'itemListElement': [
      {
        '@type': 'Offer',
        'itemOffered': {
          '@type': 'Service',
          'name': 'SaaS 산업 배수 분석'
        }
      },
      {
        '@type': 'Offer',
        'itemOffered': {
          '@type': 'Service',
          'name': '이커머스 산업 배수 분석'
        }
      },
      {
        '@type': 'Offer',
        'itemOffered': {
          '@type': 'Service',
          'name': '핀테크 산업 배수 분석'
        }
      }
    ]
  }
}

export default function ChartsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ChartsPageClient />
    </>
  )
}