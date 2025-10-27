import { NotionToMarkdown } from 'notion-to-md'
import { Client } from '@notionhq/client'
import { NotionPage, BlogPost } from '@/types'
import readingTime from 'reading-time'
import { NOTION_PROPERTIES, NOTION_STATUS } from './korean-properties'
import { getFlexibleProperty, extractPropertyValue } from './flexible-property-getter'
import { generateKoreanSlug } from '@/lib/utils/korean-slug'
import { AVAILABLE_NOTION_PROPERTIES, DEFAULT_AUTHOR, DEFAULT_READING_TIME, mapAvailableProperties } from './available-properties'
import { renderBlockToHtml } from './renderer-html'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const n2m = new NotionToMarkdown({ notionClient: notion })

// Category mapping from Korean to English
const CATEGORY_MAPPING: Record<string, string> = {
  // Korean categories → English categories
  '트렌드': 'trend',
  '뉴스레터': 'trend',
  '인사이트': 'insight',
  'SaaS': 'insight',
  '블로그': 'blog',
  'Blog': 'blog',
  '성공사례': 'casestudy',
  '창업': 'casestudy',
  'Startup': 'casestudy',
  // Fallback for unmapped categories
  'trend': 'trend',
  'insight': 'insight',
  'blog': 'blog',
  'casestudy': 'casestudy'
}

// Status mapping from Korean to English
const STATUS_MAPPING: Record<string, string> = {
  '초안': 'draft',
  '검토중': 'review',
  '발행': 'published',
  'Draft': 'draft',
  'Review': 'review',
  'Published': 'published',
  // Fallback for already English statuses
  'draft': 'draft',
  'review': 'review',
  'published': 'published'
}

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

// Recursively fetch all blocks from a page
async function getBlocks(blockId: string): Promise<any[]> {
  const blocks: any[] = []
  let cursor: string | undefined = undefined

  do {
    const { results, next_cursor } = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    })

    blocks.push(...results)

    // Fetch children for blocks that have them
    for (const block of results) {
      // 이미지 블록 감지 로그만 추가
      if ((block as any).type === 'image') {
        console.log('📸 Image block found in Notion response')
        console.log('Image block ID:', block.id)
        console.log('Image data structure:', JSON.stringify((block as any).image, null, 2))
      }

      if ((block as any).has_children) {
        const children = await getBlocks(block.id)
        ;(block as any).children = children
      }
    }

    cursor = next_cursor || undefined
  } while (cursor)

  return blocks
}

// Convert blocks to HTML string
function blocksToHtml(blocks: any[]): string {
  // 모든 블록 타입 확인 (디버깅용)
  blocks.forEach((block, index) => {
    if (block.type === 'video' || block.type === 'embed' || block.type === 'image') {
      console.log(`Found ${block.type} block at index ${index}:`, JSON.stringify(block, null, 2))
    }
  })

  const htmlParts = blocks.map(block => renderBlockToHtml(block))
  return htmlParts.join('')
}

export async function getPageContent(pageId: string): Promise<string> {
  try {
    console.log(`\n=== Getting content for page: ${pageId} ===`)

    // 먼저 페이지 정보 확인
    const page = await notion.pages.retrieve({ page_id: pageId })
    console.log('Page title:', (page as any).properties?.['제목']?.title?.[0]?.text?.content)

    // 블록 가져오기
    const blocks = await getBlocks(pageId)

    // 블록 타입 분석
    const blockTypes = blocks.reduce((acc, block) => {
      const type = (block as any).type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('Block type summary:', blockTypes)

    // 이미지 블록 확인
    const imageBlocks = blocks.filter(b => (b as any).type === 'image')
    console.log(`Found ${imageBlocks.length} image blocks`)

    if (imageBlocks.length > 0) {
      console.log('Image blocks found:')
      imageBlocks.forEach((block: any, i: number) => {
        console.log(`  Image ${i + 1}:`, {
          id: block.id,
          hasFile: !!block.image?.file,
          hasExternal: !!block.image?.external,
          fileUrl: block.image?.file?.url?.substring(0, 50) + '...',
          externalUrl: block.image?.external?.url?.substring(0, 50) + '...'
        })
      })
    }

    // HTML 변환
    const htmlContent = blocks
      .map(block => renderBlockToHtml(block))
      .join('')

    // 생성된 HTML에 img 태그가 있는지 확인
    const imgCount = (htmlContent.match(/<img/g) || []).length
    console.log(`Generated HTML contains ${imgCount} <img> tags`)

    if (imageBlocks.length > 0 && imgCount === 0) {
      console.error('⚠️ Image blocks exist but no <img> tags generated!')
    }

    console.log(`=== Content generation complete ===\n`)

    return htmlContent
  } catch (error) {
    console.error('Error getting page content:', error)
    return ''
  }
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

    // Map category from Korean to English
    const originalCategory = extractPropertyValue(props.category) || '블로그'
    const category = CATEGORY_MAPPING[originalCategory] || originalCategory.toLowerCase()

    // Map status from Korean to English
    const originalStatus = extractPropertyValue(props.status) || '발행'
    const status = STATUS_MAPPING[originalStatus] || 'published'

    // Log mapping for debugging
    console.log(`Category mapping: ${originalCategory} → ${category}`)
    console.log(`Status mapping: ${originalStatus} → ${status}`)

    // Skip if not published
    if (status !== 'published') {
      console.log(`Skipping draft/review post: ${title}`)
      return null
    }
    
    // Generate consistent slug from title + page ID for uniqueness
    // Use the first 8 chars of page ID (without dashes) as a unique suffix
    const shortId = page.id.replace(/-/g, '').substring(0, 8)
    const baseSlug = generateSlugFromKorean(title)

    // Combine readable slug with short ID for consistency and uniqueness
    const slug = `${baseSlug}-${shortId}`
    console.log(`Generated consistent slug: ${slug} from title: ${title}`)
    
    // Get cover image (improved extraction)
    const coverFiles = extractPropertyValue(props.cover) || []
    const coverFromProp = coverFiles[0]
    let coverUrl = coverFromProp?.external?.url ||
                   coverFromProp?.file?.url ||
                   page.cover?.external?.url ||
                   page.cover?.file?.url ||
                   ''

    // Handle Notion S3 URLs
    if (coverUrl && (coverUrl.includes('s3.us-west') || coverUrl.includes('amazonaws.com'))) {
      console.log(`Cover image using S3 URL: ${coverUrl}`)
    }
    
    // Convert blocks to rich HTML
    let content = ''
    let markdownContent = ''
    let minutes = DEFAULT_READING_TIME

    try {
      // Use the enhanced getPageContent function for better debugging
      console.log(`Fetching blocks for page: ${title}`)
      content = await getPageContent(page.id)
      console.log(`Generated ${content.length} characters of HTML content`)

      // Also generate markdown for reading time calculation
      try {
        const mdblocks = await n2m.pageToMarkdown(page.id)
        const mdString = n2m.toMarkdownString(mdblocks)
        markdownContent = mdString?.parent || ''

        // Calculate reading time from markdown
        if (markdownContent && markdownContent.trim().length > 0) {
          const result = readingTime(markdownContent)
          minutes = Math.ceil(result.minutes) || DEFAULT_READING_TIME
        }
      } catch (mdError) {
        console.error('Error generating markdown for reading time:', mdError)
        // Estimate reading time from HTML content
        const plainText = content.replace(/<[^>]*>/g, ' ')
        if (plainText.trim().length > 0) {
          const result = readingTime(plainText)
          minutes = Math.ceil(result.minutes) || DEFAULT_READING_TIME
        }
      }
    } catch (error) {
      console.error('Error converting page content:', error)
      content = `<p>${summary}</p>` || '' // Fallback to summary if content conversion fails
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
      or: [
        {
          property: NOTION_PROPERTIES.STATUS,
          select: {
            equals: '발행'
          }
        },
        {
          property: NOTION_PROPERTIES.STATUS,
          select: {
            equals: 'Published'
          }
        },
        {
          property: NOTION_PROPERTIES.STATUS,
          select: {
            equals: 'published'
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

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    // Decode the URL-encoded slug
    const decodedSlug = decodeURIComponent(slug)
    console.log(`Looking for post with slug: ${slug} (decoded: ${decodedSlug})`)
    
    const allPosts = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      filter: {
        or: [
          {
            property: NOTION_PROPERTIES.STATUS,
            select: {
              equals: '발행'
            }
          },
          {
            property: NOTION_PROPERTIES.STATUS,
            select: {
              equals: 'Published'
            }
          },
          {
            property: NOTION_PROPERTIES.STATUS,
            select: {
              equals: 'published'
            }
          }
        ]
      }
    })
    
    console.log(`Found ${allPosts.results.length} published posts`)
    
    // Find post by matching generated slug from title + ID
    for (const page of allPosts.results) {
      const props = mapAvailableProperties(page)
      const title = extractPropertyValue(props.title) || ''
      const shortId = page.id.replace(/-/g, '').substring(0, 8)
      const baseSlug = generateSlugFromKorean(title)
      const generatedSlug = `${baseSlug}-${shortId}`

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