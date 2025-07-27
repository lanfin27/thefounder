'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, Cpu, Wallet, Users } from 'lucide-react'

const categories = [
  {
    id: 'newsletter',
    name: '뉴스레터',
    description: '주간 스타트업 인사이트',
    icon: TrendingUp,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'saas',
    name: 'SaaS',
    description: 'SaaS 비즈니스와 전략',
    icon: Cpu,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'blog',
    name: '블로그',
    description: '창업가들의 경험담',
    icon: Wallet,
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'startup',
    name: '창업',
    description: '스타트업 성장 이야기',
    icon: Users,
    color: 'from-orange-500 to-orange-600',
  },
]

export default function CategorySection() {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            관심사에 맞는 콘텐츠 찾기
          </h2>
          <p className="text-lg text-gray-600">
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
                className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-600">
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