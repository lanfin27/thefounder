import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseYouTubeUrl } from '@/lib/youtube-url-parser'
import { getYouTubeChannelInfo } from '@/lib/youtube/channel-info-helper'
import { identifyCategory } from '@/lib/category-mapper'
import type {
  ExcelChannelRow,
  ChannelValidationResult,
  BulkValidationResponse
} from '@/types/bulk-upload'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channels }: { channels: ExcelChannelRow[] } = body

    console.log('[BulkValidate] 📊 Validating', channels.length, 'channels')

    // 1. 카테고리 목록 가져오기 (code 필드 포함)
    const { data: categories, error: catError } = await supabase
      .from('youtube_categories')
      .select('id, name, code')

    if (catError) {
      console.error('[BulkValidate] ❌ Category fetch error:', catError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    const categoryMap = new Map(
      categories?.map(cat => [cat.name.toLowerCase().trim(), { id: cat.id, code: cat.code }]) || []
    )

    console.log('[BulkValidate] 📂 Categories:', Array.from(categoryMap.keys()))

    // 2. 기존 채널 목록 (중복 체크)
    const { data: existingChannels } = await supabase
      .from('youtube_channels')
      .select('channel_id, custom_url')

    const existingChannelIds = new Set(
      existingChannels?.map(ch => ch.channel_id) || []
    )

    console.log('[BulkValidate] 🔍 Existing channels:', existingChannelIds.size)

    // 3. 각 채널 검증 (병렬 처리, 배치 5개씩)
    const results: ChannelValidationResult[] = []
    const batchSize = 5

    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize)

      const batchResults = await Promise.all(
        batch.map(async (row, batchIndex) => {
          const rowIndex = i + batchIndex + 2

          try {
            // 필수 필드 체크
            if (!row['YouTube URL']) {
              return {
                rowIndex,
                channelName: row.채널명 || '',
                categoryName: row.카테고리 || '',
                youtubeUrl: '',
                status: 'error' as const,
                errorType: 'missing-field' as const,
                errorMessage: 'YouTube URL이 누락되었습니다.'
              }
            }

            // 카테고리 식별 (번호 우선)
            const categoryInfo = identifyCategory({
              카테고리: row.카테고리,
              카테고리번호: row.카테고리번호
            })

            if (!categoryInfo) {
              return {
                rowIndex,
                channelName: row.채널명,
                categoryName: row.카테고리 || row.카테고리번호 || '',
                youtubeUrl: row['YouTube URL'],
                status: 'error' as const,
                errorType: 'invalid-category' as const,
                errorMessage: `카테고리를 인식할 수 없습니다. (입력: "${row.카테고리 || row.카테고리번호}")`
              }
            }

            // 카테고리 ID 찾기 (코드 기반)
            let categoryId: string | null = null

            // 먼저 코드로 찾기
            for (const [, data] of categoryMap.entries()) {
              if (data.code === categoryInfo.code) {
                categoryId = data.id
                break
              }
            }

            // 코드로 못 찾으면 이름으로 찾기
            if (!categoryId) {
              const entry = categoryMap.get(categoryInfo.name.toLowerCase().trim())
              if (entry) {
                categoryId = entry.id
              }
            }

            if (!categoryId) {
              return {
                rowIndex,
                channelName: row.채널명,
                categoryName: `${categoryInfo.name} (${categoryInfo.code})`,
                youtubeUrl: row['YouTube URL'],
                status: 'error' as const,
                errorType: 'invalid-category' as const,
                errorMessage: `DB에서 카테고리를 찾을 수 없습니다: ${categoryInfo.code} - ${categoryInfo.name}`
              }
            }

            // URL 파싱
            const parsedUrl = parseYouTubeUrl(row['YouTube URL'])
            if (!parsedUrl) {
              return {
                rowIndex,
                channelName: row.채널명,
                categoryName: `${categoryInfo.name} (${categoryInfo.code})`,
                youtubeUrl: row['YouTube URL'],
                status: 'error' as const,
                errorType: 'invalid-url' as const,
                errorMessage: '유효하지 않은 YouTube URL입니다.'
              }
            }

            // YouTube API로 채널 정보 가져오기
            const channelInfo = await getYouTubeChannelInfo(row['YouTube URL'])

            if (!channelInfo) {
              return {
                rowIndex,
                channelName: row.채널명,
                categoryName: `${categoryInfo.name} (${categoryInfo.code})`,
                youtubeUrl: row['YouTube URL'],
                status: 'error' as const,
                errorType: 'api-error' as const,
                errorMessage: 'YouTube API에서 채널을 찾을 수 없습니다.'
              }
            }

            // 중복 체크
            if (existingChannelIds.has(channelInfo.channelId)) {
              return {
                rowIndex,
                channelName: row.채널명,
                categoryName: `${categoryInfo.name} (${categoryInfo.code})`,
                youtubeUrl: row['YouTube URL'],
                status: 'error' as const,
                errorType: 'duplicate' as const,
                errorMessage: '이미 등록된 채널입니다.'
              }
            }

            // 검증 성공
            return {
              rowIndex,
              channelName: row.채널명,
              categoryName: `${categoryInfo.name} (${categoryInfo.code})`,
              youtubeUrl: row['YouTube URL'],
              status: 'success' as const,
              channelData: channelInfo
            }

          } catch (error: any) {
            console.error('[BulkValidate] ❌ Row', rowIndex, 'error:', error)
            return {
              rowIndex,
              channelName: row.채널명,
              categoryName: row.카테고리 || row.카테고리번호 || '',
              youtubeUrl: row['YouTube URL'],
              status: 'error' as const,
              errorType: 'api-error' as const,
              errorMessage: error.message || '알 수 없는 오류'
            }
          }
        })
      )

      results.push(...batchResults)
      console.log(`[BulkValidate] 📊 Progress: ${results.length}/${channels.length}`)
    }

    // 4. 통계
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    const response: BulkValidationResponse = {
      success: true,
      total: results.length,
      successCount,
      errorCount,
      results
    }

    console.log('[BulkValidate] ✅ Done - Success:', successCount, 'Error:', errorCount)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[BulkValidate] ❌ Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
