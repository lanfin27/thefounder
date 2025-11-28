/**
 * 구조화된 데이터 (Schema.org JSON-LD) 컴포넌트들
 * SEO 최적화를 위한 구조화된 데이터를 생성합니다.
 */

interface SchemaProps {
  children?: React.ReactNode
}

/**
 * 조직 스키마 - 사이트 전체 정보
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'The Founder',
    url: 'https://thefounder.co.kr',
    logo: 'https://thefounder.co.kr/logo.png',
    description: '한국 1인 창업가를 위한 인사이트 플랫폼',
    foundingDate: '2024',
    sameAs: [
      // 실제 소셜 미디어 URL로 교체
      'https://www.instagram.com/thefounder.kr',
      'https://www.facebook.com/thefounder.kr',
      'https://www.linkedin.com/company/thefounder',
      'https://www.youtube.com/@thefounder',
      'https://twitter.com/thefounder_kr'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@thefounder.co.kr',
      contactType: 'Customer Service',
      areaServed: 'KR',
      availableLanguage: ['Korean']
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * 웹사이트 스키마 - 검색 기능 포함
 */
export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'The Founder',
    url: 'https://thefounder.co.kr',
    description: '한국 1인 창업가를 위한 인사이트 플랫폼',
    inLanguage: 'ko-KR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://thefounder.co.kr/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Founder',
      logo: {
        '@type': 'ImageObject',
        url: 'https://thefounder.co.kr/logo.png'
      }
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * 블로그/기사 포스팅 스키마
 */
interface ArticleSchemaProps {
  post: {
    title: string
    summary: string
    author: string
    publishedDate: string
    updatedAt?: string
    cover?: string
    slug: string
    category: string
    tags?: string[]
  }
}

export function ArticleSchema({ post }: ArticleSchemaProps) {
  const baseUrl = 'https://thefounder.co.kr'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    image: post.cover ? (post.cover.startsWith('http') ? post.cover : `${baseUrl}${post.cover}`) : `${baseUrl}/og-image.png`,
    url: `${baseUrl}/posts/${post.slug}`,
    datePublished: new Date(post.publishedDate).toISOString(),
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : new Date(post.publishedDate).toISOString(),
    author: {
      '@type': 'Person',
      name: post.author || 'The Founder'
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Founder',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
        width: 600,
        height: 60
      }
    },
    articleSection: post.category,
    keywords: post.tags?.join(', ') || post.category,
    inLanguage: 'ko-KR',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/posts/${post.slug}`
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * 빵부스러기 스키마 - 네비게이션 경로
 */
interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const baseUrl = 'https://thefounder.co.kr'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * FAQ 스키마 - 자주 묻는 질문
 */
interface FAQItem {
  question: string
  answer: string
}

interface FAQSchemaProps {
  faqs: FAQItem[]
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * 전체 스키마를 감싸는 래퍼 컴포넌트 (선택사항)
 */
export function StructuredDataWrapper({ children }: SchemaProps) {
  return <>{children}</>
}
