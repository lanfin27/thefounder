/**
 * Korean property names for Notion database
 * 한글 속성명 설정
 */

export const NOTION_PROPERTIES = {
  TITLE: '제목',
  SUMMARY: '요약',
  CATEGORY: '카테고리',
  TAGS: '태그',
  COVER: '커버이미지',
  PREMIUM: '프리미엄',
  STATUS: '상태',
  PUBLISHED_DATE: '발행일', // Changed from 발행날짜 to 발행일
  AUTHOR: '작성자',
  SLUG: 'Slug' // Keep in English as it's a technical term
} as const

export const NOTION_STATUS = {
  DRAFT: '초안',
  REVIEW: '검토중',
  PUBLISHED: '발행'
} as const

export const NOTION_CATEGORIES = {
  NEWSLETTER: '뉴스레터',
  SAAS: 'SaaS',
  BLOG: '블로그',
  STARTUP: '창업'
} as const

// Type guards for Korean text handling
export function isValidStatus(status: string): status is '초안' | '검토중' | '발행' {
  return Object.values(NOTION_STATUS).includes(status as any)
}

export function isValidCategory(category: string): category is '뉴스레터' | 'SaaS' | '블로그' | '창업' {
  return Object.values(NOTION_CATEGORIES).includes(category as any)
}