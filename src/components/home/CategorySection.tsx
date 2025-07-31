'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, Cpu, Briefcase, Users } from 'lucide-react'

const categories = [
  {
    id: 'newsletter',
    name: '뉴스레터',
    description: '주간 스타트업 인사이트',
    icon: TrendingUp,
    count: 24,
  },
  {
    id: 'saas',
    name: 'SaaS',
    description: 'SaaS 비즈니스와 전략',
    icon: Cpu,
    count: 18,
  },
  {
    id: 'blog',
    name: '블로그',
    description: '창업가들의 경험담',
    icon: Briefcase,
    count: 32,
  },
  {
    id: 'startup',
    name: '창업',
    description: '스타트업 성장 이야기',
    icon: Users,
    count: 15,
  },
]

export default function CategorySection() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-heading-2 font-serif text-medium-black mb-4 text-korean">
            관심사에 맞는 콘텐츠 찾기
          </h2>
          <p className="text-body-large text-medium-black-secondary text-korean">
            카테고리별로 선별된 인사이트를 만나보세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={`/posts?category=${category.name}`}
                className="block p-6 bg-white border border-medium-gray-border rounded-lg hover:border-medium-green transition-all duration-medium group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-medium-green-light flex items-center justify-center group-hover:bg-medium-green transition-colors">
                    <category.icon className="w-5 h-5 text-medium-green group-hover:text-white" />
                  </div>
                  <span className="text-caption text-medium-black-tertiary">
                    {category.count} 글
                  </span>
                </div>
                <h3 className="text-heading-4 font-serif text-medium-black mb-2 group-hover:text-medium-green transition-colors text-korean">
                  {category.name}
                </h3>
                <p className="text-body-small text-medium-black-secondary text-korean">
                  {category.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}