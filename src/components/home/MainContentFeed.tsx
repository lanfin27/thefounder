'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Heart, Bookmark } from 'lucide-react'

// 더미 데이터 생성 함수
const generateDummyPosts = (category: string, count: number) => {
  const dummyData: Record<string, any[]> = {
    trend: [
      { title: "2025년 1인 창업가가 주목해야 할 AI 트렌드 5가지", summary: "ChatGPT를 넘어선 새로운 AI 도구들과 창업 기회", author: "김창업", readTime: 5 },
      { title: "정부 지원금 1억원 받는 스타트업의 비밀", summary: "성공적인 정부 지원 사업 신청 노하우 대공개", author: "이스타트", readTime: 8 },
      { title: "MZ세대가 열광하는 구독 비즈니스 모델", summary: "월 1000만원 매출 달성한 구독 서비스 분석", author: "박구독", readTime: 6 }
    ],
    insight: [
      { title: "토스 이승건 대표가 말하는 Product-Market Fit", summary: "유니콘 기업으로 성장한 토스의 초기 전략", author: "The Founder", readTime: 15 },
      { title: "당근마켓은 어떻게 지역 커뮤니티를 장악했나", summary: "하이퍼로컬 비즈니스의 성공 방정식", author: "The Founder", readTime: 12 },
      { title: "배달의민족 김봉진 의장의 브랜딩 철학", summary: "B급 감성으로 1등 앱이 된 비결", author: "The Founder", readTime: 10 }
    ],
    casestudy: [
      { title: "월 매출 5억, 직원 0명 - 노코드로 만든 SaaS 성공기", summary: "개발자 없이 글로벌 SaaS를 만든 1인 창업가의 여정", author: "최노코드", readTime: 20 },
      { title: "인스타그램 팔로워 10만으로 연 매출 10억 달성", summary: "SNS 마케팅만으로 성장한 패션 브랜드 스토리", author: "김인스타", readTime: 18 }
    ],
    blog: [
      { title: "스타트업 3년차, 실패에서 배운 5가지 교훈", summary: "첫 창업 실패 후 두 번째 도전으로 성공하기까지", author: "정창업", readTime: 7 },
      { title: "개발자에서 창업가로, 마인드셋 전환하기", summary: "기술 중심 사고에서 비즈니스 사고로의 변화", author: "개발자K", readTime: 9 }
    ]
  }

  const categoryData = dummyData[category] || dummyData.trend
  return Array(count).fill(null).map((_, i) => ({
    id: `dummy-${category}-${i}`,
    ...categoryData[i % categoryData.length],
    category,
    published_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    view_count: Math.floor(Math.random() * 10000),
    like_count: Math.floor(Math.random() * 500),
    cover_image: `/api/placeholder/200/134`
  }))
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    trend: '트렌드',
    insight: '인사이트',
    casestudy: '사례',
    blog: '블로그'
  }
  return labels[category] || category
}

interface MainContentFeedProps {
  selectedCategory?: string | null
}

export default function MainContentFeed({ selectedCategory }: MainContentFeedProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { ref, inView } = useInView()

  const loadPosts = useCallback(async (pageNum: number, category?: string | null) => {
    setLoading(true)

    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range((pageNum - 1) * 10, pageNum * 10 - 1)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        const dummyPosts = [
          ...generateDummyPosts('trend', 3),
          ...generateDummyPosts('insight', 3),
          ...generateDummyPosts('casestudy', 2),
          ...generateDummyPosts('blog', 2)
        ].sort(() => Math.random() - 0.5)

        if (pageNum === 1) {
          setPosts(dummyPosts)
        } else {
          setPosts(prev => [...prev, ...dummyPosts])
        }

        if (pageNum >= 3) {
          setHasMore(false)
        }
      } else {
        if (pageNum === 1) {
          setPosts(data)
        } else {
          setPosts(prev => [...prev, ...data])
        }

        if (data.length < 10) {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      const dummyPosts = generateDummyPosts('trend', 10)
      setPosts(dummyPosts)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    loadPosts(1, selectedCategory)
  }, [selectedCategory, loadPosts])

  useEffect(() => {
    if (inView && !loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadPosts(nextPage, selectedCategory)
    }
  }, [inView, loading, hasMore, page, selectedCategory, loadPosts])

  return (
    <div className="space-y-10">
      {posts.map((post, index) => (
        <article key={post.id} className="group">
          <Link href={`/${post.category}/${post.slug || post.id}`}>
            <div className="flex gap-8">
              {/* Content - Left */}
              <div className="flex-1 min-w-0">
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-100)]" />
                  <span className="text-sm font-medium" style={{ color: 'var(--ink-700)' }}>
                    {post.author || '더파운더'}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--ink-400)' }}>
                    {post.published_at ? formatDistanceToNow(new Date(post.published_at), { locale: ko, addSuffix: true }) : '방금 전'}
                  </span>
                </div>

                {/* Title */}
                <h2
                  className="font-bold mb-2 group-hover:text-[var(--primary-600)] transition-colors line-clamp-2"
                  style={{
                    fontSize: 'clamp(18px, 2.5vw, 22px)',
                    color: 'var(--ink-900)',
                    lineHeight: 1.3
                  }}
                >
                  {post.title}
                </h2>

                {/* Summary */}
                <p
                  className="mb-4 line-clamp-2 hidden md:block"
                  style={{
                    fontSize: 'var(--font-body)',
                    color: 'var(--ink-600)',
                    lineHeight: 1.5
                  }}
                >
                  {post.summary}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: 'var(--surface-100)',
                        color: 'var(--ink-600)'
                      }}
                    >
                      {getCategoryLabel(post.category)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--ink-500)' }}>
                      {post.reading_time || post.readTime || 5} min read
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <Heart size={18} style={{ color: 'var(--ink-400)' }} />
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <Bookmark size={18} style={{ color: 'var(--ink-400)' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thumbnail - Right */}
              {post.cover_image && (
                <div className="w-[112px] h-[112px] md:w-[200px] md:h-[134px] rounded flex-shrink-0 overflow-hidden">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ backgroundColor: 'var(--surface-100)' }}
                  />
                </div>
              )}
            </div>
          </Link>

          {/* Divider */}
          {index < posts.length - 1 && (
            <hr className="mt-10" style={{ borderColor: 'var(--border-100)' }} />
          )}
        </article>
      ))}

      {/* Loading Indicator */}
      <div ref={ref} className="py-8">
        {loading && (
          <div className="flex justify-center">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: 'var(--primary-600)' }}
            />
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center" style={{ color: 'var(--ink-500)' }}>
            더 이상 글이 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
