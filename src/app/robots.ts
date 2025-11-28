import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://thefounder.co.kr'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/error',
          '/auth/debug',
          '/_next/',
          '/private/',
          '/*.json$',
          '/library/*/edit'
        ],
        crawlDelay: 1
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
        crawlDelay: 0
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
        disallow: ['/admin/', '/private/']
      },
      {
        userAgent: 'Yeti', // 네이버 크롤러
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
        crawlDelay: 1
      },
      {
        userAgent: 'Daumoa', // 다음 크롤러
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
        crawlDelay: 1
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
        crawlDelay: 1
      },
      {
        userAgent: 'Slurp', // Yahoo 크롤러
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/']
      }
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`
    ],
    host: baseUrl
  }
}
