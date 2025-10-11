import { Client } from '@notionhq/client'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

/**
 * Debug function to inspect Notion database properties
 * This helps identify the exact property names in Korean
 */
export async function debugNotionProperties() {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID!
    
    // Get database schema
    const database = await notion.databases.retrieve({
      database_id: databaseId
    })
    
    console.log('=== Notion Database Properties ===')
    console.log('Database Title:', database.title[0]?.plain_text || 'Untitled')
    console.log('\nProperties:')
    
    Object.entries(database.properties).forEach(([key, value]) => {
      console.log(`- "${key}":`, {
        type: value.type,
        ...(value.type === 'select' && { options: (value as any).select?.options }),
        ...(value.type === 'multi_select' && { options: (value as any).multi_select?.options })
      })
    })
    
    // Get a sample page to see actual property values
    const pages = await notion.databases.query({
      database_id: databaseId,
      page_size: 1
    })
    
    if (pages.results.length > 0) {
      const samplePage = pages.results[0] as any
      console.log('\n=== Sample Page Properties ===')
      console.log('Page ID:', samplePage.id)
      console.log('\nProperty Values:')
      
      Object.entries(samplePage.properties).forEach(([key, value]: [string, any]) => {
        let displayValue = 'N/A'
        
        switch (value.type) {
          case 'title':
            displayValue = value.title[0]?.plain_text || ''
            break
          case 'rich_text':
            displayValue = value.rich_text[0]?.plain_text || ''
            break
          case 'select':
            displayValue = value.select?.name || ''
            break
          case 'multi_select':
            displayValue = value.multi_select.map((s: any) => s.name).join(', ')
            break
          case 'checkbox':
            displayValue = value.checkbox ? 'true' : 'false'
            break
          case 'date':
            displayValue = value.date?.start || ''
            break
          case 'files':
            displayValue = `${value.files.length} file(s)`
            break
        }
        
        console.log(`- "${key}": ${displayValue}`)
      })
    }
    
    return database.properties
  } catch (error) {
    console.error('Debug error:', error)
    throw error
  }
}

/**
 * Validate that all required Korean properties exist
 */
export async function validateKoreanProperties() {
  const requiredProperties = [
    '제목',
    '요약',
    '카테고리',
    '태그',
    '커버이미지',
    '프리미엄',
    '상태',
    '발행일',
    '작성자'
  ]
  
  try {
    const properties = await debugNotionProperties()
    const propertyNames = Object.keys(properties)
    
    console.log('\n=== Property Validation ===')
    
    const missing = requiredProperties.filter(prop => !propertyNames.includes(prop))
    const extra = propertyNames.filter(prop => !requiredProperties.includes(prop) && prop !== 'Slug')
    
    if (missing.length > 0) {
      console.log('❌ Missing properties:', missing)
    } else {
      console.log('✅ All required Korean properties found')
    }
    
    if (extra.length > 0) {
      console.log('ℹ️  Additional properties found:', extra)
    }
    
    return {
      valid: missing.length === 0,
      missing,
      extra
    }
  } catch (error) {
    console.error('Validation error:', error)
    throw error
  }
}