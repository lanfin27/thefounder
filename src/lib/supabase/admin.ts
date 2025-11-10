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
 */
export async function savePostsToSupabase(posts: any[]) {
  console.log(`\n========== SAVE POSTS TO SUPABASE ==========`)
  console.log(`[SavePosts] 💾 Attempting to save ${posts.length} posts...`)

  const adminClient = createAdminClient()

  // Transform BlogPost format to match database schema
  const dbPosts = posts.map((post, index) => {
    console.log(`[SavePosts] 📝 Transforming post ${index + 1}:`)
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

    return {
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
  })

  console.log(`\n[SavePosts] 🔄 Upserting ${dbPosts.length} posts to database...`)
  console.log(`[SavePosts] 📊 Using upsert with conflict resolution on 'id'`)

  try {
    const { data, error } = await adminClient
      .from('posts')
      .upsert(dbPosts, {
        onConflict: 'id',
        ignoreDuplicates: false // Update existing posts
      })
      .select()

    if (error) {
      console.error('[SavePosts] ❌ Database error:', error)
      throw error
    }

    console.log(`[SavePosts] ✅ Successfully saved ${data?.length || 0} posts`)
    console.log(`[SavePosts] 📄 Saved post IDs:`)
    data?.forEach((post, idx) => {
      console.log(`  ${idx + 1}. ${post.id} - "${post.title}" (slug: ${post.slug})`)
    })
    console.log(`===========================================\n`)

    return {
      success: true,
      count: data?.length || 0,
      posts: data
    }
  } catch (error: any) {
    console.error('[SavePosts] ❌ Failed to save posts:', error.message)
    console.error('[SavePosts] ❌ Error stack:', error.stack)
    throw error
  }
}