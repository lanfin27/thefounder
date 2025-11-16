import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Admin client for server-side operations with service role key
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-application-name': 'the-founder-admin'
        }
      }
    }
  )
}

// Alias for backward compatibility
export const createClient = createAdminClient

// Default export
export default createAdminClient

/**
 * Save posts to Supabase database
 * Uses upsert to handle duplicates by ID
 * Implements batch processing for reliability
 */
export async function savePostsToSupabase(posts: any[]) {
  console.log(`\n========== SAVE POSTS TO SUPABASE ==========`)
  console.log(`[SavePosts] 💾 Attempting to save ${posts.length} posts...`)

  const adminClient = createAdminClient()
  const BATCH_SIZE = 5 // Process 5 posts at a time for safety

  // Transform BlogPost format to match database schema with error handling
  const dbPosts = []

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const index = i + 1

    try {
      console.log(`\n[SavePosts] 📝 Transforming post ${index}/${posts.length}:`)
      console.log(`  - Title: "${post.title}"`)
      console.log(`  - Slug: ${post.slug}`)
      console.log(`  - ID: ${post.id}`)
      console.log(`  - Category: ${post.categoryLabel}`)
      console.log(`  - Tags: [${post.tags?.join(', ')}]`)
      console.log(`  - Status: ${post.status}`)
      console.log(`  - Published Date: ${post.publishedDate}`)

      // 🔥 Verify URL timestamps
      if (post.cover) {
        const timestampMatch = post.cover.match(/X-Amz-Date=(\d{8}T\d{6}Z)/)
        if (timestampMatch) {
          console.log(`  - Cover URL Timestamp: ${timestampMatch[1]}`)
        }
        console.log(`  - Cover URL (first 100): ${post.cover.substring(0, 100)}`)
      } else {
        console.log(`  - Cover: none`)
      }

      const dbPost = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        summary: post.summary || null,
        content: post.content || null,
        cover: post.cover || null,
        author: post.author || null,
        category: post.categoryLabel || null,
        tags: post.tags || [],
        is_premium: post.isPremium || false,
        status: post.status || '발행',
        published_date: post.publishedDate || null,
        reading_time: post.readingTime || null
      }

      dbPosts.push(dbPost)
      console.log(`  ✅ Post ${index} transformed successfully`)

    } catch (error: any) {
      console.error(`\n❌ [SavePosts] Error transforming post ${index}:`, {
        title: post.title,
        error: error.message,
        stack: error.stack
      })
      // Continue with other posts instead of failing completely
      console.log(`⚠️  [SavePosts] Skipping post ${index} and continuing...`)
    }
  }

  console.log(`\n[SavePosts] ✅ Successfully transformed ${dbPosts.length}/${posts.length} posts`)

  if (dbPosts.length === 0) {
    console.error(`[SavePosts] ❌ No posts to save after transformation`)
    return {
      success: false,
      count: 0,
      posts: [],
      error: 'All posts failed during transformation'
    }
  }

  // Split into batches for reliability
  const batches = []
  for (let i = 0; i < dbPosts.length; i += BATCH_SIZE) {
    batches.push(dbPosts.slice(i, i + BATCH_SIZE))
  }

  console.log(`\n[SavePosts] 📦 Split into ${batches.length} batches (${BATCH_SIZE} posts each)`)

  let totalSaved = 0
  const savedPosts = []

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchNum = batchIndex + 1

    console.log(`\n[SavePosts] 🔄 Processing batch ${batchNum}/${batches.length} (${batch.length} posts)...`)

    try {
      const { data, error } = await adminClient
        .from('posts')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false // Update existing posts
        })
        .select()

      if (error) {
        console.error(`[SavePosts] ❌ Batch ${batchNum} database error:`, error)
        console.error(`[SavePosts] ❌ Error details:`, JSON.stringify(error, null, 2))
        throw error
      }

      const savedCount = data?.length || 0
      totalSaved += savedCount
      if (data) savedPosts.push(...data)

      console.log(`[SavePosts] ✅ Batch ${batchNum} saved successfully (${savedCount} posts)`)

      // Log saved post details
      data?.forEach((post, idx) => {
        console.log(`  ${idx + 1}. ${post.id} - "${post.title}" (slug: ${post.slug})`)
      })

    } catch (error: any) {
      console.error(`\n❌ [SavePosts] Batch ${batchNum} failed:`, {
        batchSize: batch.length,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })

      // Continue with next batch instead of failing completely
      console.log(`⚠️  [SavePosts] Continuing with next batch...`)
    }
  }

  console.log(`\n[SavePosts] 📊 FINAL RESULTS:`)
  console.log(`  - Total posts processed: ${posts.length}`)
  console.log(`  - Successfully transformed: ${dbPosts.length}`)
  console.log(`  - Successfully saved: ${totalSaved}`)
  console.log(`  - Batches processed: ${batches.length}`)
  console.log(`===========================================\n`)

  return {
    success: totalSaved > 0,
    count: totalSaved,
    posts: savedPosts
  }
}