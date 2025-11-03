'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, TrendingUp, Lightbulb, BookOpen, Pen } from 'lucide-react'

const categories = [
  {
    id: 'trend',
    name: '트렌드',
    emoji: '🔥',
    icon: TrendingUp,
    description: '최신 스타트업 트렌드와 산업 동향',
    color: 'from-red-500 to-orange-500',
    count: 24,
  },
  {
    id: 'insight',
    name: '인사이트',
    emoji: '💡',
    icon: Lightbulb,
    description: '성공한 창업가들의 깊이 있는 인사이트',
    color: 'from-yellow-500 to-amber-500',
    count: 18,
  },
  {
    id: 'casestudy',
    name: '사례',
    emoji: '📚',
    icon: BookOpen,
    description: '실전 창업 사례와 성공/실패 스토리',
    color: 'from-blue-500 to-cyan-500',
    count: 32,
  },
  {
    id: 'blog',
    name: '블로그',
    emoji: '✍️',
    icon: Pen,
    description: '창업 여정의 솔직한 이야기들',
    color: 'from-purple-500 to-pink-500',
    count: 15,
  },
]

const trendingPosts = [
  {
    id: 1,
    title: '2025년 주목해야 할 AI 스타트업 트렌드 10가지',
    category: '트렌드',
    readTime: 8,
  },
  {
    id: 2,
    title: '토스 이승건 대표가 말하는 Product-Market Fit 찾기',
    category: '인사이트',
    readTime: 12,
  },
  {
    id: 3,
    title: '월 매출 0원에서 1억까지, 6개월의 여정',
    category: '사례',
    readTime: 15,
  },
]

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    // Simulate subscription
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubscribed(true)
    setEmail('')

    setTimeout(() => setIsSubscribed(false), 4000)
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-surface-0 to-surface-50 border-b border-border-100">
        <div className="container mx-auto px-4 max-w-container py-section-lg">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-h1 font-bold text-ink-900 mb-6"
            >
              한국 1인 창업가를 위한{' '}
              <span className="text-primary-600">깊이 있는 인사이트</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-body-lg text-ink-700 mb-10"
            >
              실제로 성공한 창업가들의 인터뷰, 최신 트렌드 분석, 실전 사례를 매주 이메일로 받아보세요
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onSubmit={handleNewsletterSubmit}
              className="max-w-md mx-auto"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소를 입력하세요"
                    required
                    className="w-full h-14 pl-12 pr-4 rounded-full border-2 border-border-200 bg-surface-0 text-body text-ink-900 focus:border-primary-600 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 px-8 bg-primary-600 text-white font-semibold rounded-full hover:bg-primary-700 transition-colors whitespace-nowrap"
                >
                  무료 구독하기
                </button>
              </div>
            </motion.form>

            {isSubscribed && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 text-body text-semantic-success font-medium"
              >
                ✓ 구독해주셔서 감사합니다!
              </motion.p>
            )}
          </div>
        </div>
      </section>

      {/* Trending Posts */}
      <section className="border-b border-border-100 bg-surface-0">
        <div className="container mx-auto px-4 max-w-container py-section">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <h2 className="text-h2 font-bold text-ink-900">지금 뜨는 글</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {trendingPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Link href={`/posts/${post.id}`}>
                  <div className="p-6 rounded-lg border border-border-100 bg-surface-0 hover:border-primary-600 hover:shadow-md transition-all">
                    <span className="text-body-sm font-medium text-primary-600 mb-2 block">
                      {post.category}
                    </span>
                    <h3 className="text-body-lg font-semibold text-ink-900 mb-3 group-hover:text-primary-600 transition-colors">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 text-body-sm text-ink-500">
                      <span>{post.readTime}분</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        더 읽기 <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="bg-surface-50">
        <div className="container mx-auto px-4 max-w-container py-section-lg">
          <h2 className="text-h2 font-bold text-ink-900 mb-4 text-center">
            카테고리별로 둘러보기
          </h2>
          <p className="text-body-lg text-ink-700 mb-12 text-center">
            관심 있는 주제를 선택하여 더 많은 콘텐츠를 만나보세요
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/${category.id}`}>
                  <div className="group h-full p-8 rounded-xl border border-border-100 bg-surface-0 hover:border-primary-600 hover:shadow-lg transition-all">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <category.icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-h3 font-bold text-ink-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>

                    <p className="text-body-sm text-ink-600 mb-4">
                      {category.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-ink-500">
                        {category.count}개의 글
                      </span>
                      <ArrowRight className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container mx-auto px-4 max-w-container py-section">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-h2 font-bold text-white mb-4">
              매주 화요일, 당신의 인박스에서 만나요
            </h2>
            <p className="text-body-lg text-primary-100 mb-8">
              5,000명이 넘는 창업가들이 The Founder 뉴스레터를 구독하고 있습니다
            </p>

            <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  required
                  className="flex-1 h-14 px-6 rounded-full border-2 border-transparent bg-white text-body text-ink-900 focus:border-primary-300 focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-14 px-8 bg-ink-900 text-white font-semibold rounded-full hover:bg-ink-700 transition-colors whitespace-nowrap"
                >
                  무료 구독
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
