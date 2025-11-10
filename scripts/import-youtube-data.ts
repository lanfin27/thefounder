/**
 * YouTube Industry Index - Initial Data Import Script
 *
 * Supabase 데이터베이스에 초기 데이터를 임포트합니다:
 * 1. 15개 카테고리 데이터
 * 2. 기획안의 Appendix A 채널 데이터
 *
 * 사용법: npm run yt:import-data
 */

// 파일 최상단에서 환경변수 로드
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// 환경변수 확인
console.log('\n🔍 Environment Check:')
console.log('NEXT_PUBLIC_YT_SUPABASE_URL:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL ? '✓ Set' : '✗ Missing')
if (process.env.NEXT_PUBLIC_YT_SUPABASE_URL) {
  console.log('  -> URL:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL.substring(0, 40) + '...')
}
console.log('NEXT_PUBLIC_YT_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing')
if (process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY) {
  console.log('  -> Key length:', process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY.length)
}
console.log('YT_SUPABASE_SERVICE_KEY:', process.env.YT_SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing')
if (process.env.YT_SUPABASE_SERVICE_KEY) {
  console.log('  -> Key length:', process.env.YT_SUPABASE_SERVICE_KEY.length)
}
console.log('')

// 환경변수가 없으면 종료
if (!process.env.NEXT_PUBLIC_YT_SUPABASE_URL || !process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Required environment variables are missing!\n')
  console.error('Please check your .env.local file contains:')
  console.error('  - NEXT_PUBLIC_YT_SUPABASE_URL')
  console.error('  - NEXT_PUBLIC_YT_SUPABASE_ANON_KEY')
  console.error('  - YT_SUPABASE_SERVICE_KEY\n')
  process.exit(1)
}

// URL 검증
const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL!
const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!

console.log('🔍 Validating Supabase URL format...')

// URL 형식 검증
if (!supabaseUrl.startsWith('https://')) {
  console.error('❌ Error: Supabase URL must start with https://')
  console.error('Current URL:', supabaseUrl)
  process.exit(1)
}

// .supabase.co로 끝나는지 확인
if (!supabaseUrl.endsWith('.supabase.co')) {
  console.error('❌ Error: Invalid Supabase URL format')
  console.error('Expected format: https://[project-id].supabase.co')
  console.error('Current URL:', supabaseUrl)
  process.exit(1)
}

console.log('✅ URL format is valid\n')

// 이제 나머지 import
import { createClient } from '@supabase/supabase-js'
import type { YCategoryCode } from '../src/types/youtube-industry'

// 연결 테스트 함수
async function testSupabaseConnection() {
  console.log('📡 Testing Supabase connection...')
  console.log('   URL:', supabaseUrl)

  try {
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })

    console.log('   HTTP Status:', testResponse.status, testResponse.statusText)

    if (!testResponse.ok) {
      console.error('❌ Supabase connection test failed')
      const errorText = await testResponse.text()
      console.error('   Response body:', errorText)

      if (testResponse.status === 404) {
        console.error('\n💡 Tip: The Supabase project might not exist or the URL is incorrect')
      } else if (testResponse.status === 401 || testResponse.status === 403) {
        console.error('\n💡 Tip: The API key might be invalid or expired')
      }

      return false
    } else {
      console.log('✅ Supabase connection successful\n')
      return true
    }
  } catch (error: any) {
    console.error('❌ Failed to connect to Supabase:')
    console.error('   Error type:', error.constructor.name)
    console.error('   Error message:', error.message)

    if (error.cause) {
      console.error('   Cause:', error.cause)
    }

    console.error('\n💡 Possible issues:')
    console.error('   - Network connectivity problem')
    console.error('   - Firewall blocking the connection')
    console.error('   - Supabase service is down')
    console.error('   - Invalid project URL\n')

    return false
  }
}

// Supabase 클라이언트 직접 생성 (환경변수 로드 후)
const ytSupabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

// Appendix A - 카테고리별 대표 채널 데이터
const INITIAL_CHANNELS: Record<YCategoryCode, Array<{ channelId: string; name: string }>> = {
  Y01: [
    { channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', name: 'Alexandr Wang' },
    { channelId: 'UCFVDp4GmJ_JN9W68EccuEfA', name: 'GentleMonster' },
    { channelId: 'UC_hm0aUSK6OYr2lBF4yg7_g', name: 'Get Ready With Me Korea' }
  ],
  Y02: [
    { channelId: 'UCZnRWE6NKfTyxn7RBWD8Ttw', name: 'Lamuqe' },
    { channelId: 'UCGl9JkNTn_dTLwj83QKW9hQ', name: 'SSIN' },
    { channelId: 'UC4y-rjM8mAJcD59rN0WMFYQ', name: 'RISABAE' }
  ],
  Y03: [
    { channelId: 'UCbqTlj5i9KWMkNaPXE9v3EA', name: 'tzuyang쯔양' },
    { channelId: 'UCxTHwPz3DcS1SJxcQ6bWYRQ', name: '복다방' },
    { channelId: 'UCpvUqDLh38_z2qgJQYpO-KQ', name: '문복희 Eat with Boki' }
  ],
  Y04: [
    { channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', name: 'Faker' },
    { channelId: 'UCvFyujGKD2FPK5JjN_1iGzw', name: '김재원 도티' },
    { channelId: 'UCcqKAd2D2NvwLY7yPphcLDQ', name: '악어' }
  ],
  Y05: [
    { channelId: 'UCWj2KdxuS2EjqDE4yOLi_DQ', name: '김계란' },
    { channelId: 'UC-Mbt1jwLv1N3JWm4BPZA8w', name: '홍민영' },
    { channelId: 'UCQo0BT9JG_8dR9dXTCwEGzQ', name: '하시모토 리나' }
  ],
  Y06: [
    { channelId: 'UCODjhc_6QIjcnpPY9V1XDLQ', name: '탑현' },
    { channelId: 'UCupZRaW3vHRU0CkuPLGCjvA', name: '문명진' },
    { channelId: 'UCwbAaWfZzLUhOW6jEf74BaA', name: 'Jeong Yun-ju' }
  ],
  Y07: [
    { channelId: 'UC3SyT4_WLHzN7JmHQwKQZww', name: '쯔양' },
    { channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', name: '밴쯔' },
    { channelId: 'UC-i2ywiuvjvpTy2zW-tXfkw', name: '햄지' }
  ],
  Y08: [
    { channelId: 'UChfy6181eyD-qRWhGGpmZrQ', name: '1분과학' },
    { channelId: 'UCxq_kqY1t5pNoYLzM-Ny4Xw', name: '김박사넷' },
    { channelId: 'UCN0sKnE8fnxTq7-2LXlSowQ', name: '책그림' }
  ],
  Y09: [
    { channelId: 'UCfQ_tDEqhb9M1BI_SGaLNTw', name: '잇섭' },
    { channelId: 'UCpvFX1XVWwhb-DgdijmRscQ', name: 'itSub잇섭' },
    { channelId: 'UCWRlsJ-WGVWYpihRjdMARPw', name: '딩고 뮤직' }
  ],
  Y10: [
    { channelId: 'UCKRn_APc61K6jphbmGWIaOA', name: '침착맨' },
    { channelId: 'UCq_RCvUGbU1Wo-vr2j3k0-Q', name: '보겸' },
    { channelId: 'UCdmJZdcSxBxSHPsi7koPBbQ', name: 'EN 오원진' }
  ],
  Y11: [
    { channelId: 'UCZEmS7PNr7lx_yUSuMpHrzg', name: '슈퍼조조 - Super JoJo Korean' },
    { channelId: 'UCZPluWrU7TjJzCIKxNqOHmQ', name: 'Pororo' },
    { channelId: 'UCbmTVfwxFxPbIrSxCjWuOPw', name: 'Tayo Korean' }
  ],
  Y12: [
    { channelId: 'UCk21BSB4jcDZWG1RVmSJ2kw', name: 'K-Explorer' },
    { channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', name: '구독왕콩' },
    { channelId: 'UC9I3HVDPUjjvJKqx4ZMEk-g', name: 'JaneDoe' }
  ],
  Y13: [
    { channelId: 'UCXcTjFRoMDR2H7zPvjqRVEw', name: '크림히어로즈' },
    { channelId: 'UCO5Rt6GzOizWX90lc6ZgdJQ', name: 'SuriNoel' },
    { channelId: 'UCKYNsaBlHbkvVpyOJ0Gp3UA', name: '바둑이TV' }
  ],
  Y14: [
    { channelId: 'UCZrXS6bgIIJU3_hZk5a3kog', name: 'Moneylism' },
    { channelId: 'UCXkXgyw0bVJu3PwPxT3F5Ig', name: '슈카월드' },
    { channelId: 'UCX1d27LhWxNRMPsKkK7nRnw', name: 'DGDR' }
  ],
  Y15: [
    { channelId: 'UCUpJs89fSBXNolQGOYKn0YQ', name: 'Goodnight Moon' },
    { channelId: 'UC4M-t21gLOZ4qf1h-lHgCsQ', name: 'Healing Space' },
    { channelId: 'UC9I3HVDPUjjvJKqx4ZMEk-g', name: 'Nature Sounds' }
  ]
}

async function importCategories() {
  console.log('[Import] Starting categories import...')

  // 데이터베이스 스키마에 맞는 15개 카테고리 정의
  const categories = [
    {
      code: 'Y01',
      name: '패션',
      icon: '👗',
      description: '스타일링, 룩북, 브랜드 협업',
      avg_views_per_video: 0
    },
    {
      code: 'Y02',
      name: '뷰티',
      icon: '💄',
      description: '메이크업, 헤어, 스킨케어',
      avg_views_per_video: 0
    },
    {
      code: 'Y03',
      name: '먹방',
      icon: '🍜',
      description: '음식 리뷰, 리얼사운드, ASMR',
      avg_views_per_video: 0
    },
    {
      code: 'Y04',
      name: '코미디',
      icon: '😂',
      description: '예능, 밈, 드라마형 콘텐츠',
      avg_views_per_video: 0
    },
    {
      code: 'Y05',
      name: '여행',
      icon: '✈️',
      description: '여행 브이로그, 관광, 숙소 리뷰',
      avg_views_per_video: 0
    },
    {
      code: 'Y06',
      name: '게임',
      icon: '🎮',
      description: '게임 플레이, 리뷰, 공략',
      avg_views_per_video: 0
    },
    {
      code: 'Y07',
      name: '펫·동물',
      icon: '🐕',
      description: '반려동물, 동물 관찰',
      avg_views_per_video: 0
    },
    {
      code: 'Y08',
      name: 'IT·과학기술',
      icon: '💻',
      description: '테크리뷰, AI, 디지털 기기',
      avg_views_per_video: 0
    },
    {
      code: 'Y09',
      name: '키즈·영화·애니메이션',
      icon: '🎬',
      description: '어린이 채널, 동화, 영화 요약',
      avg_views_per_video: 0
    },
    {
      code: 'Y10',
      name: '음악',
      icon: '🎵',
      description: '가수·밴드, 커버, 음원 유통',
      avg_views_per_video: 0
    },
    {
      code: 'Y11',
      name: '스포츠',
      icon: '⚽',
      description: '경기 하이라이트, 해설',
      avg_views_per_video: 0
    },
    {
      code: 'Y12',
      name: '헬스·다이어트',
      icon: '💪',
      description: '운동 루틴, 식단, 피트니스',
      avg_views_per_video: 0
    },
    {
      code: 'Y13',
      name: '투자·경제',
      icon: '📈',
      description: '주식·부동산·재테크',
      avg_views_per_video: 0
    },
    {
      code: 'Y14',
      name: '요리',
      icon: '🍳',
      description: '레시피, 조리과정',
      avg_views_per_video: 0
    },
    {
      code: 'Y15',
      name: 'V-Tube·버추얼',
      icon: '🎭',
      description: '버튜버, 캐릭터 방송',
      avg_views_per_video: 0
    }
  ]

  console.log(`[Import] Inserting ${categories.length} categories...`)

  const { data, error } = await ytSupabaseAdmin
    .from('youtube_categories')
    .upsert(categories, {
      onConflict: 'code',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('[Import] Error inserting categories:', error)
    console.error('[Import] Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  console.log(`[Import] Successfully imported ${categories.length} categories`)
  return true
}

async function importInitialChannels() {
  console.log('[Import] Starting initial channels import...')

  const allChannels: any[] = []

  // 모든 채널 데이터 수집
  for (const [categoryCode, channels] of Object.entries(INITIAL_CHANNELS)) {
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i]

      // 데이터베이스 스키마에 맞는 필드만 포함
      allChannels.push({
        channel_id: channel.channelId,
        name: channel.name,
        name_en: null, // 초기에는 null, YouTube API에서 업데이트
        category_code: categoryCode,
        subscribers: 0, // YouTube API에서 업데이트
        total_views: 0, // YouTube API에서 업데이트
        video_count: 0, // YouTube API에서 업데이트
        views_per_video: 0, // YouTube API에서 계산 후 업데이트
        daily_change_rate: 0,
        weekly_change_rate: 0,
        monthly_change_rate: 0,
        engagement_rate: 0,
        shorts_ratio: 0,
        last_updated: new Date().toISOString()
      })
    }
  }

  console.log(`[Import] Total channels before deduplication: ${allChannels.length}`)

  // 중복 제거 - channel_id 기준으로 첫 번째 항목만 유지
  const channelMap = new Map()
  const duplicates: string[] = []

  for (const channel of allChannels) {
    if (channelMap.has(channel.channel_id)) {
      duplicates.push(channel.channel_id)
    } else {
      channelMap.set(channel.channel_id, channel)
    }
  }

  const uniqueChannels = Array.from(channelMap.values())

  console.log(`[Import] Unique channels after deduplication: ${uniqueChannels.length}`)

  if (duplicates.length > 0) {
    console.log(`[Import] ⚠️  Removed ${duplicates.length} duplicate channel(s)`)
    console.log('[Import] Duplicate channel IDs:', Array.from(new Set(duplicates)).join(', '))
  }

  // Insert in batches of 50
  const batchSize = 50
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < uniqueChannels.length; i += batchSize) {
    const batch = uniqueChannels.slice(i, i + batchSize)

    const { data, error } = await ytSupabaseAdmin
      .from('youtube_channels')
      .upsert(batch, {
        onConflict: 'channel_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error(`[Import] ❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error)
      console.error('[Import] Error details:', JSON.stringify(error, null, 2))
      console.error('[Import] Sample channel from failed batch:', JSON.stringify(batch[0], null, 2))
      errorCount += batch.length
    } else {
      successCount += batch.length
      console.log(`[Import] ✅ Batch ${Math.floor(i / batchSize) + 1}: Imported ${batch.length} channels`)
    }
  }

  console.log(`\n[Import] Import Summary:`)
  console.log(`  - Success: ${successCount} channels`)
  console.log(`  - Errors: ${errorCount} channels`)
  console.log(`  - Total unique: ${uniqueChannels.length} channels`)

  return true
}

async function main() {
  console.log('='.repeat(60))
  console.log('YouTube Industry Index - Initial Data Import')
  console.log('='.repeat(60))
  console.log('')

  try {
    // 0. Test Supabase connection first
    const connectionOk = await testSupabaseConnection()
    if (!connectionOk) {
      console.error('❌ Cannot proceed without valid Supabase connection')
      process.exit(1)
    }

    // 1. Import categories
    await importCategories()

    // 2. Import initial channels
    await importInitialChannels()

    console.log('\n' + '='.repeat(60))
    console.log('✓ Import completed successfully!')
    console.log('='.repeat(60))
    console.log('\nNext steps:')
    console.log('1. Run: npm run yt:update')
    console.log('   to fetch real data from YouTube API')
    console.log('2. Visit: http://localhost:3000/youtube-industry')
    console.log('   to view the dashboard')
  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('✗ Import failed:')
    console.error('='.repeat(60))

    if (error.message) {
      console.error('Error message:', error.message)
    }
    if (error.details) {
      console.error('Error details:', error.details)
    }
    if (error.hint) {
      console.error('Hint:', error.hint)
    }

    console.error('\nFull error object:')
    console.error(error)

    process.exit(1)
  }
}

main()
