import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseYouTubeUrl } from '@/lib/youtube-url-parser'
import { getYouTubeChannelInfo } from '@/lib/youtube/channel-info-helper'
import { identifyCategory } from '@/lib/category-mapper'
import type { BulkInsertRequest } from '@/types/bulk-upload'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

/**
 * 실제 youtube_channels 테이블의 컬럼 구조를 조회
 */
async function getActualTableSchema() {
  try {
    console.log('[Schema] 🔍 Analyzing actual database schema...')

    // 1. 샘플 데이터로 실제 컬럼 확인
    const { data: sampleRows, error } = await supabase
      .from('youtube_channels')
      .select('*')
      .limit(1)

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[Schema] ❌ Error fetching sample:', error)
      return null
    }

    // 2. 실제 존재하는 컬럼 목록
    const actualColumns = sampleRows && sampleRows.length > 0 ? Object.keys(sampleRows[0]) : []

    console.log('[Schema] 📊 Detected columns:', actualColumns.join(', '))

    // 3. 필요한 컬럼들의 존재 여부 확인
    const schema = {
      // Primary key
      channel_id: actualColumns.includes('channel_id'),
      id: actualColumns.includes('id'),

      // Category fields (하나만 있으면 됨)
      category_code: actualColumns.includes('category_code'),
      category_id: actualColumns.includes('category_id'),
      category: actualColumns.includes('category'),

      // Basic info fields
      name: actualColumns.includes('name'),
      title: actualColumns.includes('title'),

      // Handle/URL fields
      handle: actualColumns.includes('handle'),
      custom_url: actualColumns.includes('custom_url'),
      youtube_handle: actualColumns.includes('youtube_handle'),

      // Stats fields
      subscribers: actualColumns.includes('subscribers'),
      subscriber_count: actualColumns.includes('subscriber_count'),

      total_views: actualColumns.includes('total_views'),
      view_count: actualColumns.includes('view_count'),

      video_count: actualColumns.includes('video_count'),
      total_videos: actualColumns.includes('total_videos'),

      // Other fields
      description: actualColumns.includes('description'),
      thumbnail_url: actualColumns.includes('thumbnail_url'),
      published_at: actualColumns.includes('published_at'),
      country: actualColumns.includes('country'),
      is_active: actualColumns.includes('is_active'),
      created_at: actualColumns.includes('created_at'),
      updated_at: actualColumns.includes('updated_at'),

      // All columns for reference
      allColumns: actualColumns
    }

    console.log('[Schema] ✅ Schema analysis complete:')
    console.log('[Schema]    Category field:', schema.category_code ? 'category_code' : schema.category_id ? 'category_id' : schema.category ? 'category' : 'NONE')
    console.log('[Schema]    Handle field:', schema.handle ? 'handle' : schema.custom_url ? 'custom_url' : schema.youtube_handle ? 'youtube_handle' : 'NONE')
    console.log('[Schema]    Name field:', schema.name ? 'name' : schema.title ? 'title' : 'NONE')
    console.log('[Schema]    Subscribers field:', schema.subscribers ? 'subscribers' : schema.subscriber_count ? 'subscriber_count' : 'NONE')

    return schema

  } catch (error) {
    console.error('[Schema] ❌ Failed to get schema:', error)
    return null
  }
}

/**
 * 스키마에 맞춰 데이터 매핑
 */
function mapDataToSchema(channelInfo: any, categoryCode: string, schema: any) {
  console.log('[Mapping] 🔧 Mapping data to schema...')

  const data: any = {}

  // 1. Channel ID (필수)
  if (schema.channel_id) {
    data.channel_id = channelInfo.channelId
    console.log('[Mapping]    ✅ channel_id:', channelInfo.channelId)
  } else if (schema.id) {
    data.id = channelInfo.channelId
    console.log('[Mapping]    ✅ id:', channelInfo.channelId)
  }

  // 2. Category (필수)
  if (schema.category_code) {
    data.category_code = categoryCode
    console.log('[Mapping]    ✅ category_code:', categoryCode)
  } else if (schema.category) {
    data.category = categoryCode
    console.log('[Mapping]    ✅ category:', categoryCode)
  } else if (schema.category_id) {
    console.log('[Mapping]    ⚠️  category_id field exists but requires UUID (skipping)')
  }

  // 3. Name (필수)
  if (schema.name) {
    data.name = channelInfo.title
    console.log('[Mapping]    ✅ name:', channelInfo.title)
  } else if (schema.title) {
    data.title = channelInfo.title
    console.log('[Mapping]    ✅ title:', channelInfo.title)
  }

  // 4. Handle/Custom URL (선택사항)
  const handleValue = channelInfo.customUrl || null
  if (handleValue) {
    if (schema.handle) {
      data.handle = handleValue
      console.log('[Mapping]    ✅ handle:', handleValue)
    } else if (schema.custom_url) {
      data.custom_url = handleValue
      console.log('[Mapping]    ✅ custom_url:', handleValue)
    } else if (schema.youtube_handle) {
      data.youtube_handle = handleValue
      console.log('[Mapping]    ✅ youtube_handle:', handleValue)
    } else {
      console.log('[Mapping]    ℹ️  No handle field in schema, skipping')
    }
  } else {
    console.log('[Mapping]    ℹ️  No handle value available')
  }

  // 5. Subscribers (선택사항)
  const subscriberCount = channelInfo.subscriberCount || 0
  if (schema.subscribers) {
    data.subscribers = subscriberCount
    console.log('[Mapping]    ✅ subscribers:', subscriberCount.toLocaleString())
  } else if (schema.subscriber_count) {
    data.subscriber_count = subscriberCount
    console.log('[Mapping]    ✅ subscriber_count:', subscriberCount.toLocaleString())
  }

  // 6. Views (선택사항)
  const viewCount = channelInfo.viewCount || 0
  if (schema.total_views) {
    data.total_views = viewCount
    console.log('[Mapping]    ✅ total_views:', viewCount.toLocaleString())
  } else if (schema.view_count) {
    data.view_count = viewCount
    console.log('[Mapping]    ✅ view_count:', viewCount.toLocaleString())
  }

  // 7. Video Count (선택사항)
  const videoCount = channelInfo.videoCount || 0
  if (schema.video_count) {
    data.video_count = videoCount
    console.log('[Mapping]    ✅ video_count:', videoCount)
  } else if (schema.total_videos) {
    data.total_videos = videoCount
    console.log('[Mapping]    ✅ total_videos:', videoCount)
  }

  // 8. Description (선택사항)
  if (schema.description && channelInfo.description) {
    data.description = channelInfo.description
    console.log('[Mapping]    ✅ description: (', channelInfo.description.length, 'chars)')
  }

  // 9. Thumbnail (선택사항)
  if (schema.thumbnail_url && channelInfo.thumbnailUrl) {
    data.thumbnail_url = channelInfo.thumbnailUrl
    console.log('[Mapping]    ✅ thumbnail_url:', channelInfo.thumbnailUrl.substring(0, 50) + '...')
  }

  // 10. Published Date (선택사항)
  if (schema.published_at && channelInfo.publishedAt) {
    data.published_at = channelInfo.publishedAt
    console.log('[Mapping]    ✅ published_at:', channelInfo.publishedAt)
  }

  // 11. Country (선택사항)
  if (schema.country && channelInfo.country) {
    data.country = channelInfo.country
    console.log('[Mapping]    ✅ country:', channelInfo.country)
  }

  // 12. is_active (선택사항)
  if (schema.is_active) {
    data.is_active = true
    console.log('[Mapping]    ✅ is_active: true')
  }

  // 13. Timestamps (선택사항)
  const now = new Date().toISOString()
  if (schema.created_at) {
    data.created_at = now
  }
  if (schema.updated_at) {
    data.updated_at = now
  }

  console.log('[Mapping] ✅ Mapped', Object.keys(data).length, 'fields')

  return data
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkInsertRequest = await request.json()
    const { channels } = body

    console.log('[BulkInsert] 📊 Starting bulk insert for', channels.length, 'channels')
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ═══════════════════════════════════════════════════════
    // STEP 1: 실제 테이블 스키마 확인 (가장 중요!)
    // ═══════════════════════════════════════════════════════
    console.log('[BulkInsert] 🔍 STEP 1: Checking actual database schema...\n')

    const schema = await getActualTableSchema()

    if (!schema) {
      console.error('[BulkInsert] ❌ Failed to get database schema!')
      return NextResponse.json({
        success: false,
        error: 'Failed to analyze database schema'
      }, { status: 500 })
    }

    console.log('[BulkInsert] ✅ Schema analysis complete')
    console.log('[BulkInsert] 📋 Total columns:', schema.allColumns.length)
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ═══════════════════════════════════════════════════════
    // STEP 2: 카테고리 데이터 로드
    // ═══════════════════════════════════════════════════════
    console.log('[BulkInsert] 🔍 STEP 2: Loading categories...\n')

    const { data: categories, error: categoriesError } = await supabase
      .from('youtube_categories')
      .select('id, code, name, icon')

    if (categoriesError) {
      console.error('[BulkInsert] ❌ Failed to fetch categories:', categoriesError)
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }

    console.log('[BulkInsert] 📂 Available categories:')
    categories?.forEach(cat => {
      console.log(`[BulkInsert]    - ${cat.name} (${cat.code})`)
    })
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ═══════════════════════════════════════════════════════
    // STEP 3: 기존 채널 확인 (중복 방지)
    // ═══════════════════════════════════════════════════════
    console.log('[BulkInsert] 🔍 STEP 3: Checking existing channels...\n')

    const { data: existingChannels } = await supabase
      .from('youtube_channels')
      .select('channel_id, name')

    const existingChannelIds = new Set(
      existingChannels?.map(c => c.channel_id) || []
    )

    console.log('[BulkInsert] 🔍 Existing channels in DB:', existingChannelIds.size)
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ═══════════════════════════════════════════════════════
    // STEP 4: 각 채널 처리
    // ═══════════════════════════════════════════════════════
    const results = {
      success: [] as any[],
      failed: [] as any[],
      skipped: [] as any[]
    }

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i]

      console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`[BulkInsert] 📊 Progress: ${i + 1}/${channels.length}`)
      console.log(`[BulkInsert] 🔍 Processing:`, channel.youtubeUrl)
      console.log()

      try {
        // ─────────────────────────────────────────────────────
        // 4-1. URL 파싱
        // ─────────────────────────────────────────────────────
        const parsedUrl = parseYouTubeUrl(channel.youtubeUrl)
        if (!parsedUrl) {
          results.failed.push({
            url: channel.youtubeUrl,
            reason: 'Invalid YouTube URL format'
          })
          console.log(`[BulkInsert] ❌ Invalid URL format`)
          console.log()
          continue
        }

        // ─────────────────────────────────────────────────────
        // 4-2. YouTube API로 채널 정보 조회
        // ─────────────────────────────────────────────────────
        console.log('[BulkInsert] 🌐 Fetching channel info from YouTube API...')
        const channelInfo = await getYouTubeChannelInfo(channel.youtubeUrl)

        if (!channelInfo) {
          results.failed.push({
            url: channel.youtubeUrl,
            reason: 'Channel not found or YouTube API error'
          })
          console.log(`[BulkInsert] ❌ Channel not found`)
          console.log()
          continue
        }

        console.log('[BulkInsert] ✅ Channel found:', channelInfo.title)
        console.log('[BulkInsert]    Channel ID:', channelInfo.channelId)
        console.log('[BulkInsert]    Subscribers:', channelInfo.subscriberCount?.toLocaleString() || '0')
        console.log('[BulkInsert]    Videos:', channelInfo.videoCount?.toLocaleString() || '0')
        console.log()

        // ─────────────────────────────────────────────────────
        // 4-3. 중복 확인
        // ─────────────────────────────────────────────────────
        if (existingChannelIds.has(channelInfo.channelId)) {
          results.skipped.push({
            url: channel.youtubeUrl,
            channel_id: channelInfo.channelId,
            name: channelInfo.title,
            reason: 'Channel already exists in database'
          })
          console.log(`[BulkInsert] ⏭️  Skipped (already exists):`, channelInfo.title)
          console.log()
          continue
        }

        // ─────────────────────────────────────────────────────
        // 4-4. 카테고리 파싱 및 매칭
        // ─────────────────────────────────────────────────────
        const categoryInput = channel.categoryName // 예: "요리 (Y14)"

        console.log('[BulkInsert] 🏷️  Category parsing:')
        console.log('[BulkInsert]    Input:', categoryInput)

        // 카테고리 이름과 코드 추출 (예: "요리 (Y14)" → name: "요리", code: "Y14")
        let categoryCode: string | undefined = undefined
        let categoryName = categoryInput

        const codeMatch = categoryInput.match(/\(([A-Z]\d{2})\)$/)
        if (codeMatch) {
          categoryCode = codeMatch[1]
          categoryName = categoryInput.replace(/\s*\([A-Z]\d{2}\)$/, '').trim()
        }

        console.log('[BulkInsert]    Extracted name:', categoryName)
        console.log('[BulkInsert]    Extracted code:', categoryCode)

        // identifyCategory 함수로 카테고리 식별
        const categoryInfo = identifyCategory({
          카테고리: categoryName,
          카테고리번호: categoryCode
        })

        if (!categoryInfo) {
          results.failed.push({
            url: channel.youtubeUrl,
            channel_id: channelInfo.channelId,
            name: channelInfo.title,
            reason: `Category not identified: ${categoryInput}`
          })
          console.log('[BulkInsert] ❌ Category identification failed')
          console.log('[BulkInsert]    Input:', categoryInput)
          console.log('[BulkInsert]    Parsed:', { name: categoryName, code: categoryCode })
          console.log()
          continue
        }

        console.log('[BulkInsert] ✅ Category identified:')
        console.log('[BulkInsert]    Name:', categoryInfo.name)
        console.log('[BulkInsert]    Code:', categoryInfo.code)
        console.log()

        // ─────────────────────────────────────────────────────
        // 4-5. 스키마에 맞춰 데이터 매핑 (핵심!)
        // ─────────────────────────────────────────────────────
        const insertData = mapDataToSchema(
          channelInfo,
          categoryInfo.code,
          schema
        )
        console.log()

        // ─────────────────────────────────────────────────────
        // 4-6. 데이터베이스에 삽입
        // ─────────────────────────────────────────────────────
        console.log('[BulkInsert] 🚀 Inserting into database...')

        const { data: insertedData, error: insertError } = await supabase
          .from('youtube_channels')
          .insert(insertData)
          .select()

        if (insertError) {
          results.failed.push({
            url: channel.youtubeUrl,
            channel_id: channelInfo.channelId,
            name: channelInfo.title,
            reason: insertError.message,
            error_code: insertError.code,
            error_details: insertError.details
          })
          console.error('[BulkInsert] ❌ Insert failed!')
          console.error('[BulkInsert]    Error:', insertError.message)
          console.error('[BulkInsert]    Code:', insertError.code)
          console.error('[BulkInsert]    Details:', insertError.details)
          console.error('[BulkInsert]    Hint:', insertError.hint)
          console.log()
          continue
        }

        // ─────────────────────────────────────────────────────
        // 4-7. 성공!
        // ─────────────────────────────────────────────────────
        results.success.push({
          url: channel.youtubeUrl,
          channel_id: channelInfo.channelId,
          name: channelInfo.title,
          category: `${categoryInfo.name} (${categoryInfo.code})`,
          subscribers: channelInfo.subscriberCount || 0,
          data: insertedData?.[0]
        })

        console.log('[BulkInsert] ✅ Success!')
        console.log('[BulkInsert]    Name:', channelInfo.title)
        console.log('[BulkInsert]    Category:', `${categoryInfo.name} (${categoryInfo.code})`)
        console.log('[BulkInsert]    Subscribers:', (channelInfo.subscriberCount || 0).toLocaleString())
        console.log()

      } catch (err: any) {
        results.failed.push({
          url: channel.youtubeUrl,
          reason: err.message,
          error: err.toString()
        })
        console.error('[BulkInsert] ❌ Exception occurred!')
        console.error('[BulkInsert]    Error:', err.message)
        console.error('[BulkInsert]    Stack:', err.stack)
        console.log()
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 5: 최종 결과 출력
    // ═══════════════════════════════════════════════════════
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[BulkInsert] 🎯 FINAL RESULTS')
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`[BulkInsert]    ✅ Success: ${results.success.length}`)
    console.log(`[BulkInsert]    ❌ Failed: ${results.failed.length}`)
    console.log(`[BulkInsert]    ⏭️  Skipped: ${results.skipped.length}`)
    console.log('[BulkInsert] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (results.success.length > 0) {
      console.log('[BulkInsert] 🎉 Successfully added channels:')
      results.success.forEach(item => {
        console.log(`[BulkInsert]    ✓ ${item.name}`)
        console.log(`[BulkInsert]      └─ ${item.category} · ${item.subscribers.toLocaleString()} subscribers`)
      })
      console.log()
    }

    if (results.failed.length > 0) {
      console.log('[BulkInsert] ❌ Failed channels:')
      results.failed.forEach(item => {
        console.log(`[BulkInsert]    ✗ ${item.name || item.url}`)
        console.log(`[BulkInsert]      └─ ${item.reason}`)
      })
      console.log()
    }

    if (results.skipped.length > 0) {
      console.log('[BulkInsert] ⏭️  Skipped channels:')
      results.skipped.forEach(item => {
        console.log(`[BulkInsert]    - ${item.name}`)
        console.log(`[BulkInsert]      └─ ${item.reason}`)
      })
      console.log()
    }

    return NextResponse.json({
      success: true,
      total: channels.length,
      successful: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      results: {
        success: results.success,
        failed: results.failed,
        skipped: results.skipped
      }
    })

  } catch (error: any) {
    console.error('[BulkInsert] ❌ Fatal error:', error)
    console.error('[BulkInsert]    Message:', error.message)
    console.error('[BulkInsert]    Stack:', error.stack)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
