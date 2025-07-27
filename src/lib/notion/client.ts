import { Client } from '@notionhq/client'
import { NotionPage } from '@/types'

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

const databaseId = process.env.NOTION_DATABASE_ID!

export async function getPublishedPosts() {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'PublishedAt',
      date: {
        is_not_empty: true,
      },
    },
    sorts: [
      {
        property: 'PublishedAt',
        direction: 'descending',
      },
    ],
  })

  return response.results as NotionPage[]
}

export async function getPostBySlug(slug: string) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Slug',
      rich_text: {
        equals: slug,
      },
    },
  })

  if (response.results.length === 0) {
    return null
  }

  const page = response.results[0] as NotionPage
  const blocks = await getPageBlocks(page.id)

  return {
    page,
    blocks,
  }
}

export async function getPageBlocks(pageId: string) {
  const blocks = []
  let cursor = undefined

  while (true) {
    const { results, next_cursor }: any = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    })

    blocks.push(...results)

    if (!next_cursor) {
      break
    }

    cursor = next_cursor
  }

  return blocks
}

export async function getPostsByCategory(category: string) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'PublishedAt',
          date: {
            is_not_empty: true,
          },
        },
        {
          property: 'Category',
          select: {
            equals: category,
          },
        },
      ],
    },
    sorts: [
      {
        property: 'PublishedAt',
        direction: 'descending',
      },
    ],
  })

  return response.results as NotionPage[]
}