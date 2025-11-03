'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Clock, Eye, Heart } from 'lucide-react'

interface FeaturedPost {
  id: string
  category: 'trend' | 'insight' | 'case' | 'blog'
  title: string
  excerpt: string
  author: string
  readingTime: number
  cover?: string
  publishedAt?: string
  viewCount?: number
  likeCount?: number
}

const categoryConfig = {
  trend: {
    emoji: '🔥',
    label: '트렌드',
    gradient: 'from-red-50 to-orange-50',
    badgeVariant: 'error' as const
  },
  insight: {
    emoji: '🎬',
    label: '인사이트',
    gradient: 'from-blue-50 to-indigo-50',
    badgeVariant: 'info' as const
  },
  case: {
    emoji: '📚',
    label: '사례',
    gradient: 'from-purple-50 to-pink-50',
    badgeVariant: 'default' as const
  },
  blog: {
    emoji: '✍️',
    label: '블로그',
    gradient: 'from-green-50 to-emerald-50',
    badgeVariant: 'success' as const
  },
}

// 더미 데이터 생성 함수
const generateDummyFeatured = (): FeaturedPost[] => [
  {
    id: 'featured-1',
    category: 'trend',
    title: '2025년 AI 스타트업이 주목해야 할 5가지 트렌드',
    excerpt: 'OpenAI를 넘어선 새로운 AI 모델들과 함께 찾아온 창업 기회를 분석합니다.',
    author: '김트렌드',
    readingTime: 5,
    viewCount: 1234,
    likeCount: 89
  },
  {
    id: 'featured-2',
    category: 'insight',
    title: '토스 이승건 대표가 말하는 Product-Market Fit',
    excerpt: '유니콘 기업으로 성장한 토스의 초기 전략과 PMF 찾기 과정을 상세히 들여다봅니다.',
    author: 'The Founder',
    readingTime: 12,
    viewCount: 3456,
    likeCount: 234
  },
  {
    id: 'featured-3',
    category: 'case',
    title: '월 매출 5억, 직원 0명 - 1인 SaaS 창업 성공기',
    excerpt: '개발자 없이 노코드 툴만으로 글로벌 SaaS를 만든 실제 사례를 공개합니다.',
    author: '박노코드',
    readingTime: 18,
    viewCount: 5678,
    likeCount: 456
  },
  {
    id: 'featured-4',
    category: 'blog',
    title: '스타트업 3년차, 실패에서 배운 5가지 교훈',
    excerpt: '첫 창업 실패 후 두 번째 도전으로 성공하기까지의 생생한 경험을 공유합니다.',
    author: '이창업',
    readingTime: 8,
    viewCount: 2345,
    likeCount: 167
  }
]

interface FeaturedGridProps {
  posts?: FeaturedPost[]
}

export default function FeaturedGrid({ posts }: FeaturedGridProps) {
  // 데이터가 없으면 더미 데이터 사용
  const featuredPosts = posts && posts.length > 0 ? posts : generateDummyFeatured()

  return (
    <section className="py-16 bg-[var(--surface-0)]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              fontSize: 'var(--font-h2)',
              fontWeight: 700,
              color: 'var(--ink-900)',
              marginBottom: 'var(--space-md)'
            }}
          >
            ⭐ Featured Content
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: 'var(--font-body-lg)',
              color: 'var(--ink-500)'
            }}
          >
            엄선된 콘텐츠를 만나보세요
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredPosts.map((post, index) => {
            const config = categoryConfig[post.category]

            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
              >
                <Link href={`/${post.category}/${post.id}`}>
                  <div
                    className={`h-full p-6 rounded-xl bg-gradient-to-br ${config.gradient} hover:shadow-lg transition-all duration-300 cursor-pointer group`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span style={{ fontSize: '2rem' }}>{config.emoji}</span>
                      <Badge variant={config.badgeVariant} size="sm">
                        {config.label}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3
                      className="mb-3 group-hover:text-[var(--primary-600)] transition-colors"
                      style={{
                        fontSize: 'var(--font-body-lg)',
                        fontWeight: 700,
                        lineHeight: 'var(--line-body-lg)',
                        color: 'var(--ink-900)'
                      }}
                    >
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p
                      className="mb-4 line-clamp-2"
                      style={{
                        fontSize: 'var(--font-body-sm)',
                        color: 'var(--ink-500)',
                        lineHeight: 'var(--line-body-sm)'
                      }}
                    >
                      {post.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-100)]">
                      <div style={{
                        fontSize: 'var(--font-body-sm)',
                        color: 'var(--ink-500)'
                      }}>
                        {post.author}
                        ·
                        <span className="inline-flex items-center ml-1">
                          <Clock size={14} className="mr-1" />
                          {post.readingTime}분
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3" style={{
                        fontSize: 'var(--font-body-sm)',
                        color: 'var(--ink-400)'
                      }}>
                        {post.viewCount && (
                          <span className="inline-flex items-center">
                            <Eye size={14} className="mr-1" />
                            {post.viewCount.toLocaleString()}
                          </span>
                        )}
                        {post.likeCount && (
                          <span className="inline-flex items-center">
                            <Heart size={14} className="mr-1" />
                            {post.likeCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
