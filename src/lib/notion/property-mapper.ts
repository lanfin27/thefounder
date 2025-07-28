import { NotionPage } from '@/types'

// Map of potential property name variations (Korean first)
const PROPERTY_MAPPINGS = {
  title: ['제목', 'Title', 'title'],
  summary: ['요약', 'Summary', 'summary', 'Description'],
  category: ['카테고리', 'Category', 'category'],
  tags: ['태그', 'Tags', 'tags'],
  cover: ['커버이미지', 'Cover', '커버', 'cover', 'Cover Image'],
  isPremium: ['프리미엄', 'Is Premium', 'Premium', 'isPremium'],
  status: ['상태', 'Status', 'status'],
  publishedDate: ['발행일', '발행날짜', 'Published Date', 'PublishedDate', 'published_date'],
  slug: ['Slug', 'slug', 'URL'],
  author: ['작성자', 'Author', 'author']
}

export function getPropertyValue(page: any, propertyType: keyof typeof PROPERTY_MAPPINGS): any {
  const possibleNames = PROPERTY_MAPPINGS[propertyType]
  
  for (const name of possibleNames) {
    if (page.properties[name]) {
      return page.properties[name]
    }
  }
  
  // Log missing property for debugging
  console.warn(`Property not found: ${propertyType}. Available properties:`, Object.keys(page.properties))
  return null
}

export function mapNotionProperties(page: any): NotionPage['properties'] {
  const title = getPropertyValue(page, 'title')
  const summary = getPropertyValue(page, 'summary')
  const category = getPropertyValue(page, 'category')
  const tags = getPropertyValue(page, 'tags')
  const cover = getPropertyValue(page, 'cover')
  const isPremium = getPropertyValue(page, 'isPremium')
  const status = getPropertyValue(page, 'status')
  const publishedDate = getPropertyValue(page, 'publishedDate')
  const slug = getPropertyValue(page, 'slug')
  const author = getPropertyValue(page, 'author')

  return {
    '제목': title || { title: [{ plain_text: '' }] },
    '요약': summary || { rich_text: [{ plain_text: '' }] },
    '카테고리': category || { select: null },
    '태그': tags || { multi_select: [] },
    '커버이미지': cover || { files: [] },
    '프리미엄': isPremium || { checkbox: false },
    '상태': status || { select: null },
    '발행일': publishedDate || { date: null },
    'Slug': slug || { rich_text: [{ plain_text: '' }] },
    '작성자': author || { select: null }
  }
}