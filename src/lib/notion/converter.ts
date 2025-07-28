import { NotionToMarkdown } from 'notion-to-md'
import { Client } from '@notionhq/client'
import { NotionPage, BlogPost } from '@/types'
import readingTime from 'reading-time'
import { NOTION_PROPERTIES, NOTION_STATUS } from './korean-properties'
import { getFlexibleProperty, extractPropertyValue } from './flexible-property-getter'
import { generateKoreanSlug } from '@/lib/utils/korean-slug'
import { AVAILABLE_NOTION_PROPERTIES, DEFAULT_AUTHOR, DEFAULT_READING_TIME, mapAvailableProperties } from './available-properties'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const n2m = new NotionToMarkdown({ notionClient: notion })

// Custom transformer for Korean content
n2m.setCustomTransformer('image', async (block: any) => {
  const imageUrl = block.image?.external?.url || block.image?.file?.url
  if (!imageUrl) return ''
  
  // Optimize Notion images
  const optimizedUrl = imageUrl.includes('notion.so') 
    ? imageUrl.replace('https://www.notion.so', 'https://notion.so')
    : imageUrl
    
  return `![${block.image?.caption?.[0]?.plain_text || ''}](${optimizedUrl})`
})

export function generateSlugFromKorean(title: string): string {
  return generateKoreanSlug(title)
}

export async function convertPageToPost(page: any): Promise<BlogPost | null> {
  try {
    // Log available properties for debugging
    console.log('Converting page with properties:', Object.keys(page.properties || {}))
    
    // Map available properties
    const props = mapAvailableProperties(page)
    
    // Extract values using exact property names
    const title = extractPropertyValue(props.title) || ''
    
    if (!title) {
      console.error('Page has no title, skipping:', page.id)
      return null
    }
    
    const summary = extractPropertyValue(props.summary) || ''
    const category = extractPropertyValue(props.category)
    const status = extractPropertyValue(props.status)
    
    // Skip if not published
    if (status !== NOTION_STATUS.PUBLISHED) {
      console.log(`Skipping draft/review post: ${title}`)
      return null
    }
    
    // Always generate slug from title (no Slug property in Notion)
    const slug = generateSlugFromKorean(title)
    console.log(`Generated slug: ${slug} from title: ${title}`)
    
    // Get cover image
    const coverFiles = extractPropertyValue(props.cover) || []
    const coverFromProp = coverFiles[0]
    const coverUrl = coverFromProp?.external?.url || 
                    coverFromProp?.file?.url || 
                    page.cover?.external?.url || 
                    page.cover?.file?.url || 
                    ''
    
    // Convert blocks to markdown
    let content = ''
    let minutes = DEFAULT_READING_TIME
    
    try {
      const mdblocks = await n2m.pageToMarkdown(page.id)
      const mdString = n2m.toMarkdownString(mdblocks)
      content = mdString?.parent || ''
      
      // Calculate reading time only if content exists
      if (content && content.trim().length > 0) {
        const result = readingTime(content)
        minutes = Math.ceil(result.minutes) || DEFAULT_READING_TIME
      }
    } catch (error) {
      console.error('Error converting page content:', error)
      content = summary || '' // Fallback to summary if content conversion fails
    }
    
    const author = extractPropertyValue(props.author) || DEFAULT_AUTHOR
    const tags = extractPropertyValue(props.tags) || []
    const isPremium = extractPropertyValue(props.premium) || false
    const publishedDate = extractPropertyValue(props.publishedDate) || page.created_time
    
    const post: BlogPost = {
      id: page.id,
      title,
      slug,
      summary,
      content,
      cover: coverUrl,
      author,
      category: category as BlogPost['category'],
      tags,
      isPremium,
      status: status as BlogPost['status'],
      publishedDate,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      readingTime: Math.ceil(minutes),
    }
    
    return post
  } catch (error) {
    console.error('Error converting page:', error)
    console.error('Page properties:', Object.keys(page.properties || {}))
    return null
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const pages = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: {
      property: NOTION_PROPERTIES.STATUS,
      select: {
        equals: NOTION_STATUS.PUBLISHED
      }
    },
    sorts: [
      {
        property: NOTION_PROPERTIES.PUBLISHED_DATE,
        direction: 'descending'
      }
    ]
  })
  
  const posts = await Promise.all(
    pages.results.map(page => convertPageToPost(page))
  )
  
  return posts.filter(Boolean) as BlogPost[]
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    // Decode the URL-encoded slug
    const decodedSlug = decodeURIComponent(slug)
    console.log(`Looking for post with slug: ${slug} (decoded: ${decodedSlug})`)
    
    const allPosts = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      filter: {
        property: NOTION_PROPERTIES.STATUS,
        select: {
          equals: NOTION_STATUS.PUBLISHED
        }
      }
    })
    
    console.log(`Found ${allPosts.results.length} published posts`)
    
    // Find post by matching generated slug from title
    for (const page of allPosts.results) {
      const props = mapAvailableProperties(page)
      const title = extractPropertyValue(props.title) || ''
      const generatedSlug = generateKoreanSlug(title)
      
      // Check against both encoded and decoded versions
      if (slug === generatedSlug || 
          decodedSlug === generatedSlug ||
          slug.toLowerCase() === generatedSlug.toLowerCase() ||
          decodedSlug.toLowerCase() === generatedSlug.toLowerCase()) {
        console.log(`Found matching post: ${title}`)
        const post = await convertPageToPost(page)
        if (post) return post
      }
    }
    
    console.log(`No post found with slug: ${slug} (decoded: ${decodedSlug})`)
    return null
  } catch (error) {
    console.error('Error in getPostBySlug:', error)
    return null
  }
}

export async function getPostsByCategory(category: BlogPost['category']): Promise<BlogPost[]> {
  const pages = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: {
      and: [
        {
          property: NOTION_PROPERTIES.CATEGORY,
          select: {
            equals: category
          }
        },
        {
          property: '상태',
          select: {
            equals: '발행'
          }
        }
      ]
    },
    sorts: [
      {
        property: NOTION_PROPERTIES.PUBLISHED_DATE,
        direction: 'descending'
      }
    ]
  })
  
  const posts = await Promise.all(
    pages.results.map(page => convertPageToPost(page))
  )
  
  return posts.filter(Boolean) as BlogPost[]
}