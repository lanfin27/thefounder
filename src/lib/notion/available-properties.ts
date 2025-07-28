/**
 * Available Notion properties based on the actual database
 * 실제 Notion 데이터베이스에서 사용 가능한 속성들
 */

export const AVAILABLE_NOTION_PROPERTIES = {
  TITLE: '제목',
  SUMMARY: '요약',
  CATEGORY: '카테고리',
  TAGS: '태그',
  COVER: '커버이미지',
  PREMIUM: '프리미엄',
  STATUS: '상태',
  PUBLISHED_DATE: '발행일',
  AUTHOR: '작성자'
} as const

// Property value options
export const CATEGORY_OPTIONS = ['뉴스레터', 'SaaS', '블로그', '창업'] as const
export const STATUS_OPTIONS = ['초안', '검토중', '발행'] as const

// Default values
export const DEFAULT_AUTHOR = '조휘'
export const DEFAULT_READING_TIME = 1

/**
 * Map available properties to expected structure
 */
export function mapAvailableProperties(page: any) {
  const properties = page.properties || {}
  
  return {
    title: properties[AVAILABLE_NOTION_PROPERTIES.TITLE],
    summary: properties[AVAILABLE_NOTION_PROPERTIES.SUMMARY],
    category: properties[AVAILABLE_NOTION_PROPERTIES.CATEGORY],
    tags: properties[AVAILABLE_NOTION_PROPERTIES.TAGS],
    cover: properties[AVAILABLE_NOTION_PROPERTIES.COVER],
    premium: properties[AVAILABLE_NOTION_PROPERTIES.PREMIUM],
    status: properties[AVAILABLE_NOTION_PROPERTIES.STATUS],
    publishedDate: properties[AVAILABLE_NOTION_PROPERTIES.PUBLISHED_DATE],
    author: properties[AVAILABLE_NOTION_PROPERTIES.AUTHOR]
  }
}