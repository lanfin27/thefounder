'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Flame } from 'lucide-react'
import { motion } from 'framer-motion'

interface TrendingItem {
  id: string
  number: string
  category: string
  title: string
  author: string
  readTime: number
  date: string
}

const trendingItems: TrendingItem[] = [
  {
    id: '01',
    number: '01',
    category: '트렌드',
    title: 'ChatGPT를 활용한 콘텐츠 자동화로 월 1억 달성',
    author: '김창업',
    readTime: 4,
    date: '10월 전'
  },
  {
    id: '02',
    number: '02',
    category: '인사이트',
    title: '정부 지원금 없이 부트스트래핑으로 유니콘 달성',
    author: '이스타트',
    readTime: 5,
    date: '10일 전'
  },
  {
    id: '03',
    number: '03',
    category: '사례',
    title: 'Z세대 겨냥 숏폼 콘텐츠로 매출 10배 성장',
    author: '박마케팅',
    readTime: 6,
    date: '14일 전'
  },
  {
    id: '04',
    number: '04',
    category: '블로그',
    title: '노코드 툴로 3개월 만에 SaaS 런칭하기',
    author: '김노코드',
    readTime: 7,
    date: '17일 전'
  },
  {
    id: '05',
    number: '05',
    category: '트렌드',
    title: '인스타그램 릴스로 고객 1만명 모으기',
    author: '정인스타',
    readTime: 8,
    date: '18일 전'
  },
  {
    id: '06',
    number: '06',
    category: '인사이트',
    title: '뉴스레터 구독자 5만명 만든 비결',
    author: '이뉴스',
    readTime: 9,
    date: '26일 전'
  }
]

export default function TrendingSection() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <section className="border-b border-[var(--border-100)] bg-[var(--surface-0)] py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Flame size={20} className="text-[var(--error)]" />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
            Trending on The Founder
          </h2>
        </div>

        {/* Trending Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingItems.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group"
            >
              <Link href={`/${item.category}/${item.id}`}>
                <div className="flex gap-4">
                  {/* Number */}
                  <div
                    className="text-3xl font-bold flex-shrink-0"
                    style={{
                      color: 'var(--border-200)',
                      width: '32px'
                    }}
                  >
                    {item.number}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs" style={{ color: 'var(--ink-500)' }}>
                        {item.author}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ink-400)' }}>
                        in
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ink-500)' }}>
                        {item.category}
                      </span>
                    </div>

                    <h3
                      className="font-bold mb-2 line-clamp-2 group-hover:text-[var(--primary-600)] transition-colors"
                      style={{
                        fontSize: 'var(--font-body)',
                        color: 'var(--ink-900)',
                        lineHeight: '1.4'
                      }}
                    >
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-400)' }}>
                      <span>{item.date}</span>
                      <span>·</span>
                      <span>{item.readTime} min read</span>
                      {hoveredId === item.id && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="ml-auto"
                        >
                          ★
                        </motion.span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
