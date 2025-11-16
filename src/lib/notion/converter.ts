import { NotionToMarkdown } from 'notion-to-md'
import { Client } from '@notionhq/client'
import { NotionPage, BlogPost } from '@/types'
import readingTime from 'reading-time'
import { NOTION_PROPERTIES, NOTION_STATUS } from './korean-properties'
import { getFlexibleProperty, extractPropertyValue } from './flexible-property-getter'
import { generateKoreanSlug } from '@/lib/utils/korean-slug'
import { AVAILABLE_NOTION_PROPERTIES, DEFAULT_AUTHOR, DEFAULT_READING_TIME, mapAvailableProperties } from './available-properties'
import { renderBlockToHtml } from './renderer-html'
import { notionCache, getCacheKey } from '@/lib/cache/notion-cache'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const n2m = new NotionToMarkdown({ notionClient: notion })

// Category mapping - Keep Korean categories as-is for database
const CATEGORY_MAPPING: Record<string, string> = {
  // Notion categories → Database categories (Korean)
  '트렌드': '트렌드',
  '인사이트': '인사이트',
  '블로그': '블로그',
  '성공사례': '성공사례',
  // Legacy mappings for old Notion/DB values
  '뉴스레터': '트렌드',
  'SaaS': '인사이트',
  '창업': '성공사례',
  '사례': '성공사례',
  // English fallbacks
  'Trend': '트렌드',
  'Insight': '인사이트',
  'Blog': '블로그',
  'Case': '성공사례',
  'Startup': '성공사례'
}

// Category label mapping (for display)
const CATEGORY_LABELS: Record<string, string> = {
  '트렌드': '트렌드',
  '인사이트': '인사이트',
  '블로그': '블로그',
  '성공사례': '성공사례'
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

/**
 * Convert Notion image URLs to use our proxy to avoid 403 errors
 * Notion S3 URLs have temporary AWS tokens that expire after 1 hour
 *
 * @param notionUrl - The original Notion image URL
 * @param pageId - The Notion page ID (required for fetching fresh URLs)
 * @returns Proxied URL or original URL for external images
 */
export function getProxiedImageUrl(notionUrl: string | undefined, pageId?: string): string {
  if (!notionUrl) return ''

  // If it's already a proxied URL, return as-is
  // This means we're reading from cache/database, which is OK
  if (notionUrl.startsWith('/api/image-proxy')) {
    return notionUrl
  }

  // Check if it's a Notion S3 URL (these URLs expire)
  const isNotionS3 = notionUrl.includes('prod-files-secure.s3') ||
                     notionUrl.includes('amazonaws.com') ||
                     notionUrl.includes('X-Amz')

  if (isNotionS3) {
    // Extract timestamp from URL for logging
    const timestampMatch = notionUrl.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
    const timestamp = timestampMatch ? timestampMatch[1] : 'unknown'

    // Proxy through our server to avoid 403 errors
    const encodedUrl = encodeURIComponent(notionUrl)
    const pageIdParam = pageId ? `&pageId=${encodeURIComponent(pageId)}` : ''

    console.log(`[Converter] 🔄 Converting Notion S3 URL to proxy`)
    console.log(`[Converter]    Page: ${pageId?.substring(0, 8) || 'none'}`)
    console.log(`[Converter]    Timestamp: ${timestamp}`)
    console.log(`[Converter]    URL (first 80): ${notionUrl.substring(0, 80)}...`)

    return `/api/image-proxy?url=${encodedUrl}${pageIdParam}`
  }

  // For external URLs (like Unsplash), use directly
  console.log(`[Converter] ℹ️ Using external URL directly: ${notionUrl.substring(0, 80)}...`)
  return notionUrl
}

// Custom transformer for Korean content
n2m.setCustomTransformer('image', async (block: any) => {
  const imageUrl = block.image?.external?.url || block.image?.file?.url
  if (!imageUrl) return ''

  // Use image proxy to avoid 403 errors from expired AWS tokens
  const proxiedUrl = getProxiedImageUrl(imageUrl)

  return `![${block.image?.caption?.[0]?.plain_text || ''}](${proxiedUrl})`
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
    // 🔥 IMPORTANT: Always fetch children for callout/toggle blocks, even if has_children is false
    for (const block of results) {
      const blockType = (block as any).type

      // 이미지 블록 감지 로그만 추가
      if (blockType === 'image') {
        console.log('📸 Image block found in Notion response')
        console.log('Image block ID:', block.id)
        console.log('Image data structure:', JSON.stringify((block as any).image, null, 2))
      }

      // 🔥 Fetch children for blocks that have them OR are callout/toggle types
      const shouldFetchChildren =
        (block as any).has_children ||
        blockType === 'callout' ||
        blockType === 'toggle' ||
        blockType === 'synced_block'

      if (shouldFetchChildren) {
        console.log(`🔍 [getBlocks] Fetching children for ${blockType} block (has_children: ${(block as any).has_children})`)
        const children = await getBlocks(block.id)
        ;(block as any).children = children
        console.log(`✅ [getBlocks] Found ${children.length} children for ${blockType} block`)
      }
    }

    cursor = next_cursor || undefined
  } while (cursor)

  return blocks
}

// Group consecutive numbered_list_item and bulleted_list_item blocks
function groupBlocks(blocks: any[]): any[] {
  const grouped: any[] = []
  let currentNumberedList: any[] = []
  let currentBulletedList: any[] = []

  for (const block of blocks) {
    if (block.type === 'numbered_list_item') {
      // Close any open bulleted list
      if (currentBulletedList.length > 0) {
        grouped.push({
          type: 'bulleted_list_group',
          items: currentBulletedList
        })
        currentBulletedList = []
      }
      // Add to numbered list
      currentNumberedList.push(block)
    } else if (block.type === 'bulleted_list_item') {
      // Close any open numbered list
      if (currentNumberedList.length > 0) {
        grouped.push({
          type: 'numbered_list_group',
          items: currentNumberedList
        })
        currentNumberedList = []
      }
      // Add to bulleted list
      currentBulletedList.push(block)
    } else {
      // Close any open lists
      if (currentNumberedList.length > 0) {
        grouped.push({
          type: 'numbered_list_group',
          items: currentNumberedList
        })
        currentNumberedList = []
      }
      if (currentBulletedList.length > 0) {
        grouped.push({
          type: 'bulleted_list_group',
          items: currentBulletedList
        })
        currentBulletedList = []
      }
      // Add regular block
      grouped.push(block)
    }
  }

  // Close any remaining lists
  if (currentNumberedList.length > 0) {
    grouped.push({
      type: 'numbered_list_group',
      items: currentNumberedList
    })
  }
  if (currentBulletedList.length > 0) {
    grouped.push({
      type: 'bulleted_list_group',
      items: currentBulletedList
    })
  }

  return grouped
}

// Convert blocks to HTML string
function blocksToHtml(blocks: any[], pageId: string): string {
  // 모든 블록 타입 확인 (디버깅용)
  blocks.forEach((block, index) => {
    if (block.type === 'video' || block.type === 'embed' || block.type === 'image') {
      console.log(`Found ${block.type} block at index ${index}:`, JSON.stringify(block, null, 2))
    }
  })

  // Group consecutive list items
  const groupedBlocks = groupBlocks(blocks)

  const htmlParts = groupedBlocks.map(item => {
    if (item.type === 'numbered_list_group') {
      // Render numbered list group with <ol> wrapper
      console.log('\n[NumberedListGroup] Rendering', item.items.length, 'items')
      const listItems = item.items
        .map((block: any) => renderBlockToHtml(block, pageId))
        .join('')
      console.log('[NumberedListGroup] ✅ Using padding-left: 0, position: inside')
      return `
        <ol style="
          margin: 8px 0;
          padding-left: 0;
          list-style-type: decimal;
          list-style-position: inside;
        ">${listItems}</ol>
      `
    } else if (item.type === 'bulleted_list_group') {
      // Render bulleted list group with <ul> wrapper
      console.log('\n[BulletedListGroup] Rendering', item.items.length, 'items')
      const listItems = item.items
        .map((block: any) => renderBlockToHtml(block, pageId))
        .join('')
      console.log('[BulletedListGroup] ✅ Using padding-left: 0, position: inside')
      return `
        <ul style="
          margin: 8px 0;
          padding-left: 0;
          list-style-type: disc;
          list-style-position: inside;
        ">${listItems}</ul>
      `
    } else {
      // Render regular block
      return renderBlockToHtml(item, pageId)
    }
  })

  return htmlParts.join('')
}

export async function getPageContent(pageId: string): Promise<string> {
  try {
    // 🔥 캐시 확인
    const cacheKey = getCacheKey('page-content', pageId)
    const cached = notionCache.get(cacheKey)
    if (cached) {
      console.log(`✅ [getPageContent] Using cached content for page: ${pageId}`)
      return cached
    }

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

    // 🔥 콜아웃 및 토글 블록 children 분석
    const callouts = blocks.filter(b => (b as any).type === 'callout')
    const toggles = blocks.filter(b => (b as any).type === 'toggle')

    console.log(`\n🔍 [getPageContent] Callout Analysis:`)
    console.log(`   Total callouts: ${callouts.length}`)
    if (callouts.length > 0) {
      callouts.forEach((callout, index) => {
        const childrenCount = (callout as any).children?.length || 0
        console.log(`   Callout ${index + 1}: ${childrenCount} children`)
      })
    }

    console.log(`\n🔍 [getPageContent] Toggle Analysis:`)
    console.log(`   Total toggles: ${toggles.length}`)
    if (toggles.length > 0) {
      toggles.forEach((toggle, index) => {
        const childrenCount = (toggle as any).children?.length || 0
        console.log(`   Toggle ${index + 1}: ${childrenCount} children`)
      })
    }

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
      .map(block => renderBlockToHtml(block, pageId))
      .join('')

    // 생성된 HTML에 img 태그가 있는지 확인
    const imgCount = (htmlContent.match(/<img/g) || []).length
    console.log(`Generated HTML contains ${imgCount} <img> tags`)

    if (imageBlocks.length > 0 && imgCount === 0) {
      console.error('⚠️ Image blocks exist but no <img> tags generated!')
    }

    console.log(`=== Content generation complete ===\n`)

    // 🔥 캐시에 저장 (이미 선언된 cacheKey 재사용)
    notionCache.set(cacheKey, htmlContent)

    return htmlContent
  } catch (error) {
    console.error('Error getting page content:', error)
    return ''
  }
}

export async function convertPageToPost(page: any, loadContent: boolean = false): Promise<BlogPost | null> {
  const pageId = page.id.replace(/-/g, '').substring(0, 8)
  console.log(`\n🔄 [convertPageToPost] ========== CONVERTING PAGE ${pageId} ==========`)

  try {
    // Log available properties for debugging
    console.log(`[convertPageToPost ${pageId}] Available properties:`, Object.keys(page.properties || {}))

    // Map available properties
    const props = mapAvailableProperties(page)

    // Extract values using exact property names
    const title = extractPropertyValue(props.title) || ''
    console.log(`[convertPageToPost ${pageId}] Title: "${title}"`)

    if (!title) {
      console.error(`❌ [convertPageToPost ${pageId}] NO TITLE - Skipping (page ID: ${page.id})`)
      return null
    }
    
    const summary = extractPropertyValue(props.summary) || ''

    // Map category from Korean to English
    const originalCategory = extractPropertyValue(props.category) || '블로그'
    console.log(`\n🔄 [Converter] Original category from Notion: "${originalCategory}"`)

    const category = CATEGORY_MAPPING[originalCategory] || originalCategory.toLowerCase()
    console.log(`🔄 [Converter] Mapped to category: "${category}"`)

    const categoryLabel = CATEGORY_LABELS[category] || originalCategory
    console.log(`🔄 [Converter] Category label: "${categoryLabel}"`)

    // Map status from Korean to English
    const originalStatus = extractPropertyValue(props.status) || '발행'
    const status = STATUS_MAPPING[originalStatus] || 'published'
    console.log(`[convertPageToPost ${pageId}] Status: "${originalStatus}" → "${status}"`)

    // Log mapping for debugging
    console.log(`✅ [convertPageToPost ${pageId}] Category: "${originalCategory}" → "${category}" (label: "${categoryLabel}")`)

    // Verify the category is valid (Korean categories)
    const validCategories = ['트렌드', '인사이트', '블로그', '성공사례']
    if (!validCategories.includes(category)) {
      console.warn(`⚠️  [convertPageToPost ${pageId}] Invalid category "${category}" for post "${title}". Should be one of: ${validCategories.join(', ')}`)
    }

    // Skip if not published
    if (status !== 'published') {
      console.warn(`❌ [convertPageToPost ${pageId}] NOT PUBLISHED - Skipping "${title}" (status: "${originalStatus}" → "${status}")`)
      return null
    }
    console.log(`✅ [convertPageToPost ${pageId}] Status check PASSED - "${title}" is published`)
    
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

    // 🔥 Only load full content when explicitly requested
    if (loadContent) {
      try {
        // Use the enhanced getPageContent function for better debugging
        console.log(`📄 [Converter] Loading FULL content for: ${title}`)
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
    } else {
      console.log(`📋 [Converter] Loading METADATA only for: ${title}`)
      // For list views, just use summary as content placeholder
      content = ''
    }
    
    const author = extractPropertyValue(props.author) || DEFAULT_AUTHOR
    const tags = extractPropertyValue(props.tags) || []
    const isPremium = extractPropertyValue(props.premium) || false
    const publishedDate = extractPropertyValue(props.publishedDate) || page.created_time
    
    const post: BlogPost = {
      id: page.id,
      notionId: page.id,  // 🔥 명시적으로 Notion UUID 저장
      title,
      slug,
      summary,
      content,
      cover: getProxiedImageUrl(coverUrl, page.id),  // 🖼️ Use proxy with page ID to fetch fresh URLs
      author,
      category: category as BlogPost['category'],
      categoryLabel,
      tags,
      isPremium,
      status: status as BlogPost['status'],
      publishedDate,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      readingTime: Math.ceil(minutes),
      featured: extractPropertyValue(props.featured) || false,
    }

    console.log(`✅ [convertPageToPost ${pageId}] SUCCESS - Converted "${title}"`)
    console.log(`   Slug: ${slug}`)
    console.log(`   Category: ${categoryLabel}`)
    console.log(`   ID: ${page.id}`)
    console.log(`====================================================================\n`)

    return post
  } catch (error) {
    console.error(`❌ [convertPageToPost ${pageId}] EXCEPTION:`, error)
    console.error('Page properties:', Object.keys(page.properties || {}))
    return null
  }
}

export async function getAllPosts(loadContent: boolean = false): Promise<BlogPost[]> {
  const startTime = Date.now()

  // 🔥 캐시 확인 - loadContent 상태에 따라 다른 캐시 키 사용
  const cacheKey = getCacheKey('all-posts', loadContent ? 'full' : 'metadata')
  const cached = notionCache.get(cacheKey)
  if (cached) {
    const elapsed = Date.now() - startTime
    console.log(`✅ [getAllPosts] Returned from cache in ${elapsed}ms (${cached.length} posts, loadContent: ${loadContent})`)
    return cached
  }

  console.log(`🔍 [getAllPosts] Fetching from Notion... (loadContent: ${loadContent})`)

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
    pages.results.map(page => convertPageToPost(page, loadContent))
  )

  const filteredPosts = posts.filter(Boolean) as BlogPost[]

  // 🔥 캐시에 저장
  notionCache.set(cacheKey, filteredPosts)

  const elapsed = Date.now() - startTime
  console.log(`✅ [getAllPosts] Fetched ${filteredPosts.length} posts from Notion in ${elapsed}ms (loadContent: ${loadContent})`)

  // Debug: Verify slug exists in posts
  if (filteredPosts.length > 0) {
    console.log('📝 [getAllPosts] Sample post structure:', {
      id: filteredPosts[0]?.id,
      slug: filteredPosts[0]?.slug,
      hasSlug: !!filteredPosts[0]?.slug,
      title: filteredPosts[0]?.title?.substring(0, 30)
    })
  }

  return filteredPosts
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
        const post = await convertPageToPost(page, true)  // 🔥 Load full content for individual posts
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

export async function getPostsByCategory(category: BlogPost['category'], loadContent: boolean = false): Promise<BlogPost[]> {
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
    pages.results.map(page => convertPageToPost(page, loadContent))
  )

  return posts.filter(Boolean) as BlogPost[]
}

/**
 * Get posts from a specific Notion database with custom credentials
 * Used by the multi-source sync feature
 */
export async function getPostsFromSource(
  notionToken: string,
  notionDatabaseId: string,
  loadContent: boolean = false
): Promise<BlogPost[]> {
  const startTime = Date.now()

  console.log(`\n🔍 [getPostsFromSource] ========== STARTING CUSTOM SOURCE FETCH ==========`)
  console.log(`🔍 [getPostsFromSource] Token (first 30): ${notionToken.substring(0, 30)}...`)
  console.log(`🔍 [getPostsFromSource] Token length: ${notionToken.length}`)
  console.log(`🔍 [getPostsFromSource] Database ID (FULL): ${notionDatabaseId}`)
  console.log(`🔍 [getPostsFromSource] Database ID length: ${notionDatabaseId.length}`)
  console.log(`🔍 [getPostsFromSource] Load content: ${loadContent}`)
  console.log(`====================================================================\n`)

  try {
    // Create Notion client with custom token
    const customNotion = new Client({ auth: notionToken })
    console.log(`✅ [getPostsFromSource] Created Notion client with custom token`)

    // Query the specific database with the same filter as getAllPosts()
    console.log(`📡 [getPostsFromSource] Querying database: ${notionDatabaseId}`)
    const pages = await customNotion.databases.query({
      database_id: notionDatabaseId,
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

    console.log(`✅ [getPostsFromSource] Query returned ${pages.results.length} pages from Notion`)

    // Log all page titles from Notion BEFORE conversion
    console.log(`\n📋 [getPostsFromSource] Pages from Notion (before conversion):`)
    pages.results.forEach((page: any, idx: number) => {
      const rawTitle = page.properties?.제목?.title?.[0]?.plain_text ||
                       page.properties?.Title?.title?.[0]?.plain_text ||
                       page.properties?.이름?.title?.[0]?.plain_text ||
                       'No title'
      console.log(`  ${idx + 1}. "${rawTitle}" (ID: ${page.id.substring(0, 8)})`)
    })

    // Use the EXACT SAME conversion logic as getAllPosts()
    console.log(`\n🔄 [getPostsFromSource] Converting ${pages.results.length} pages to posts...`)
    const posts = await Promise.all(
      pages.results.map(page => convertPageToPost(page, loadContent))
    )

    const filteredPosts = posts.filter(Boolean) as BlogPost[]
    const nullCount = posts.length - filteredPosts.length

    const elapsed = Date.now() - startTime
    console.log(`\n📊 [getPostsFromSource] CONVERSION SUMMARY:`)
    console.log(`   Total pages from Notion: ${pages.results.length}`)
    console.log(`   Successfully converted: ${filteredPosts.length}`)
    console.log(`   Filtered out (null): ${nullCount}`)
    console.log(`   Time elapsed: ${elapsed}ms`)

    if (filteredPosts.length > 0) {
      console.log(`\n✅ [getPostsFromSource] Successfully converted posts:`)
      filteredPosts.forEach((post, idx) => {
        console.log(`  ${idx + 1}. "${post.title}" (slug: ${post.slug})`)
      })
    }

    if (nullCount > 0) {
      console.warn(`\n⚠️  [getPostsFromSource] WARNING: ${nullCount} pages were filtered out!`)
      console.warn(`   Check logs above for reasons (no title, not published, etc.)`)
    }

    console.log(`\n====================================================================\n`)

    return filteredPosts
  } catch (error) {
    console.error('[getPostsFromSource] ❌ Error:', error)
    if (error instanceof Error) {
      console.error('[getPostsFromSource] ❌ Error message:', error.message)
      console.error('[getPostsFromSource] ❌ Error stack:', error.stack)
    }
    throw error
  }
}