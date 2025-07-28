/**
 * Flexible property getter that handles multiple property name variations
 * 유연한 속성 getter - 다양한 속성명 변형 처리
 */

interface PropertyVariations {
  [key: string]: string[]
}

const PROPERTY_VARIATIONS: PropertyVariations = {
  title: ['제목', 'Title', 'title', '타이틀'],
  summary: ['요약', 'Summary', 'summary', 'Description', '설명'],
  category: ['카테고리', 'Category', 'category', '분류'],
  tags: ['태그', 'Tags', 'tags', '태그들'],
  cover: ['커버이미지', '커버', 'Cover', 'cover', 'Cover Image', '대표이미지'],
  premium: ['프리미엄', 'Premium', 'Is Premium', 'isPremium', '유료'],
  status: ['상태', 'Status', 'status', '상태값'],
  publishedDate: ['발행일', '발행날짜', 'Published Date', 'PublishedDate', 'published_date', '게시일'],
  author: ['작성자', 'Author', 'author', '저자', '글쓴이'],
  slug: ['Slug', 'slug', '슬러그', 'URL슬러그', 'URL', 'url', '주소', '속리', 'URL주소']
}

/**
 * Get property value with multiple fallbacks
 * Returns the first matching property found
 */
export function getFlexibleProperty(page: any, propertyType: keyof typeof PROPERTY_VARIATIONS): any {
  if (!page?.properties) {
    console.warn('No properties found in page object')
    return null
  }

  const variations = PROPERTY_VARIATIONS[propertyType]
  if (!variations) {
    console.warn(`Unknown property type: ${propertyType}`)
    return null
  }

  // Try each variation
  for (const variation of variations) {
    if (page.properties[variation]) {
      return page.properties[variation]
    }
  }

  // If not found, try case-insensitive search
  const propertyKeys = Object.keys(page.properties)
  for (const variation of variations) {
    const found = propertyKeys.find(key => 
      key.toLowerCase() === variation.toLowerCase()
    )
    if (found) {
      return page.properties[found]
    }
  }

  // Log available properties for debugging
  console.warn(
    `Property '${propertyType}' not found. Tried: ${variations.join(', ')}. ` +
    `Available properties: ${Object.keys(page.properties).join(', ')}`
  )
  
  return null
}

/**
 * Get all property values with fallbacks
 */
export function getAllFlexibleProperties(page: any) {
  return {
    title: getFlexibleProperty(page, 'title'),
    summary: getFlexibleProperty(page, 'summary'),
    category: getFlexibleProperty(page, 'category'),
    tags: getFlexibleProperty(page, 'tags'),
    cover: getFlexibleProperty(page, 'cover'),
    premium: getFlexibleProperty(page, 'premium'),
    status: getFlexibleProperty(page, 'status'),
    publishedDate: getFlexibleProperty(page, 'publishedDate'),
    author: getFlexibleProperty(page, 'author'),
    slug: getFlexibleProperty(page, 'slug')
  }
}

/**
 * Extract property value based on Notion property type
 */
export function extractPropertyValue(property: any): any {
  if (!property) return null

  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || ''
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || ''
    case 'select':
      return property.select?.name || null
    case 'multi_select':
      return property.multi_select?.map((item: any) => item.name) || []
    case 'checkbox':
      return property.checkbox || false
    case 'date':
      return property.date?.start || null
    case 'files':
      return property.files || []
    case 'url':
      return property.url || ''
    case 'email':
      return property.email || ''
    case 'phone_number':
      return property.phone_number || ''
    case 'number':
      return property.number || 0
    default:
      return null
  }
}