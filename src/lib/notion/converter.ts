import { NotionToMarkdown } from 'notion-to-md'
import { Client } from '@notionhq/client'
import { NotionPage, BlogPost } from '@/types'
import readingTime from 'reading-time'
import slugify from 'github-slugger'

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
  // Convert Korean title to slug-friendly format
  const slug = slugify.slug(title)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    
  return slug || Date.now().toString()
}

export async function convertPageToPost(page: NotionPage): Promise<BlogPost | null> {
  try {
    const title = page.properties.Title.title[0]?.plain_text || ''
    const summary = page.properties.Summary.rich_text[0]?.plain_text || ''
    const category = page.properties.Category.select?.name
    const status = page.properties.Status.select?.name
    
    // Skip if not published
    if (status !== '발행') return null
    
    // Get slug or generate from title
    let slug = page.properties.Slug.rich_text[0]?.plain_text || ''
    if (!slug) {
      slug = generateSlugFromKorean(title)
    }
    
    // Get cover image
    const coverFromProp = page.properties.Cover.files[0]
    const coverUrl = coverFromProp?.external?.url || 
                    coverFromProp?.file?.url || 
                    page.cover?.external?.url || 
                    page.cover?.file?.url
    
    // Convert blocks to markdown
    const mdblocks = await n2m.pageToMarkdown(page.id)
    const mdString = n2m.toMarkdownString(mdblocks)
    
    // Calculate reading time
    const { minutes } = readingTime(mdString.parent)
    
    const post: BlogPost = {
      id: page.id,
      title,
      slug,
      summary,
      content: mdString.parent,
      cover: coverUrl,
      author: page.properties.Author.select?.name || '조휘',
      category: category as BlogPost['category'],
      tags: page.properties.Tags.multi_select.map(tag => tag.name),
      isPremium: page.properties['Is Premium'].checkbox,
      status: status as BlogPost['status'],
      publishedDate: page.properties['Published Date']?.date?.start || page.created_time,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      readingTime: Math.ceil(minutes),
    }
    
    return post
  } catch (error) {
    console.error('Error converting page:', error)
    return null
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const pages = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: {
      property: 'Status',
      select: {
        equals: '발행'
      }
    },
    sorts: [
      {
        property: 'Published Date',
        direction: 'descending'
      }
    ]
  })
  
  const posts = await Promise.all(
    pages.results.map(page => convertPageToPost(page as NotionPage))
  )
  
  return posts.filter(Boolean) as BlogPost[]
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: {
      and: [
        {
          property: 'Slug',
          rich_text: {
            equals: slug
          }
        },
        {
          property: 'Status',
          select: {
            equals: '발행'
          }
        }
      ]
    }
  })
  
  if (response.results.length === 0) return null
  
  return convertPageToPost(response.results[0] as NotionPage)
}

export async function getPostsByCategory(category: BlogPost['category']): Promise<BlogPost[]> {
  const pages = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: {
      and: [
        {
          property: 'Category',
          select: {
            equals: category
          }
        },
        {
          property: 'Status',
          select: {
            equals: '발행'
          }
        }
      ]
    },
    sorts: [
      {
        property: 'Published Date',
        direction: 'descending'
      }
    ]
  })
  
  const posts = await Promise.all(
    pages.results.map(page => convertPageToPost(page as NotionPage))
  )
  
  return posts.filter(Boolean) as BlogPost[]
}