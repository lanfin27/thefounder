import { NextRequest, NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/notion/converter'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== Starting Notion Sync ===')
    console.log('Timestamp:', new Date().toISOString())

    // Fetch all posts from Notion
    console.log('Fetching posts from Notion...')
    const posts = await getAllPosts()
    console.log(`Found ${posts.length} posts from Notion`)

    // Create admin client
    let supabase
    try {
      supabase = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json({
        error: 'Failed to create Supabase admin client',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // Debug: Log sample post structure
    if (posts.length > 0) {
      console.log('Sample post structure:', {
        id: posts[0].id,
        title: posts[0].title,
        category: posts[0].category,
        status: posts[0].status,
        author: posts[0].author
      })
    }

    // Prepare posts data for upsert
    const postsData = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary || null,
      content: post.content || null,
      cover: post.cover || null,
      author: post.author || null,
      category: post.category || null,
      tags: post.tags || [],
      is_premium: post.isPremium || false,
      status: post.status || null,
      published_date: post.publishedDate || null,
      reading_time: post.readingTime || null,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
    }))

    console.log('Upserting posts to database...')

    // Batch processing for better performance
    const batchSize = 10
    let successCount = 0
    let failedPosts: string[] = []
    let syncedPosts: any[] = []

    for (let i = 0; i < postsData.length; i += batchSize) {
      const batch = postsData.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(postsData.length / batchSize)

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} posts)`)

      try {
        const { data, error } = await supabase
          .from('posts')
          .upsert(batch, { onConflict: 'id' })
          .select()

        if (error) {
          console.error(`Batch ${batchNumber} error:`, error.message)

          // Try individual upserts for failed batch
          for (const post of batch) {
            try {
              const { data: singleData, error: singleError } = await supabase
                .from('posts')
                .upsert(post, { onConflict: 'id' })
                .select()
                .single()

              if (singleError) {
                console.error(`Failed to sync: ${post.title}`, singleError.message)
                failedPosts.push(post.title)
              } else {
                successCount++
                syncedPosts.push(singleData)
                console.log(`✓ Synced: ${post.title}`)
              }
            } catch (err) {
              console.error(`Exception syncing: ${post.title}`, err)
              failedPosts.push(post.title)
            }
          }
        } else {
          successCount += batch.length
          if (data) syncedPosts.push(...data)
          console.log(`✓ Batch ${batchNumber} synced successfully`)
        }
      } catch (err) {
        console.error(`Batch ${batchNumber} exception:`, err)
        batch.forEach(post => failedPosts.push(post.title))
      }
    }

    console.log('=== Sync Complete ===')
    console.log(`Success: ${successCount}/${postsData.length} posts`)
    if (failedPosts.length > 0) {
      console.log('Failed posts:', failedPosts)
    }

    return NextResponse.json({
      success: true,
      total: posts.length,
      synced: successCount,
      failed: failedPosts.length,
      failedPosts: failedPosts,
      posts: posts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category
      }))
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method to sync posts' },
    { status: 405 }
  )
}