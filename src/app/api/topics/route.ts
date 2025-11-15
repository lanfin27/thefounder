import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Topics API
 *
 * GET /api/topics - Get all topics with post counts
 * GET /api/topics?featured=true - Get featured topics only (8 topics for homepage)
 *
 * Returns topics sorted by post count (all) or display order (featured)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured') === 'true'

    const supabase = await createClient()

    console.log(`[Topics API] Fetching ${featured ? 'featured' : 'all'} topics...`)

    if (featured) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Featured Topics for Homepage (8 topics)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const { data: featuredTopics, error: featuredError } = await supabase
        .from('featured_topics')
        .select('topic_name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(8)

      if (featuredError) {
        console.error('[Topics API] Featured topics error:', featuredError)
        return NextResponse.json(
          { error: 'Failed to fetch featured topics' },
          { status: 500 }
        )
      }

      if (!featuredTopics || featuredTopics.length === 0) {
        console.log('[Topics API] No featured topics found')
        return NextResponse.json({
          topics: [],
          total: 0
        })
      }

      // Get post count for each featured topic
      const topicsWithCounts = await Promise.all(
        featuredTopics.map(async (topic) => {
          const { data: countData } = await supabase
            .from('topic_counts')
            .select('post_count')
            .eq('topic_name', topic.topic_name)
            .maybeSingle()

          return {
            id: topic.topic_name.toLowerCase().replace(/\s+/g, '-'),
            label: topic.topic_name,
            count: countData?.post_count || 0,
            order: topic.display_order
          }
        })
      )

      console.log(`[Topics API] ✅ Returned ${topicsWithCounts.length} featured topics`)

      return NextResponse.json({
        topics: topicsWithCounts,
        total: topicsWithCounts.length
      })

    } else {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // All Topics for /topics page
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const { data: allTopics, error: allError } = await supabase
        .from('topic_counts')
        .select('*')
        .order('topic_name', { ascending: true })

      if (allError) {
        console.error('[Topics API] All topics error:', allError)
        return NextResponse.json(
          { error: 'Failed to fetch all topics' },
          { status: 500 }
        )
      }

      if (!allTopics || allTopics.length === 0) {
        console.log('[Topics API] No topics found')
        return NextResponse.json({
          topics: [],
          grouped: {},
          total: 0
        })
      }

      // Group topics by first character (Korean chosung or English letter)
      const grouped = groupTopicsByFirstChar(allTopics)

      console.log(`[Topics API] ✅ Returned ${allTopics.length} topics in ${Object.keys(grouped).length} groups`)

      return NextResponse.json({
        topics: allTopics,
        grouped: grouped,
        total: allTopics.length
      })
    }

  } catch (error) {
    console.error('[Topics API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Group topics by first character
 * - Korean: Group by chosung (ㄱ, ㄴ, ㄷ, ...)
 * - English: Group by letter (A, B, C, ...)
 * - Other: Group by '#'
 */
function groupTopicsByFirstChar(topics: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}

  topics.forEach(topic => {
    const firstChar = topic.topic_name.charAt(0).toUpperCase()

    // Korean: Group by chosung
    if (/[ㄱ-ㅎ가-힣]/.test(firstChar)) {
      const chosung = getChosung(firstChar)
      if (!grouped[chosung]) grouped[chosung] = []
      grouped[chosung].push(topic)
    }
    // English: Group by letter
    else if (/[A-Z]/.test(firstChar)) {
      if (!grouped[firstChar]) grouped[firstChar] = []
      grouped[firstChar].push(topic)
    }
    // Other: Group by '#'
    else {
      if (!grouped['#']) grouped['#'] = []
      grouped['#'].push(topic)
    }
  })

  return grouped
}

/**
 * Extract Korean chosung (초성)
 * 가 → ㄱ, 나 → ㄴ, 다 → ㄷ, ...
 */
function getChosung(char: string): string {
  const chosungList = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ]

  const code = char.charCodeAt(0) - 44032
  if (code < 0 || code > 11171) return '#'

  return chosungList[Math.floor(code / 588)]
}
