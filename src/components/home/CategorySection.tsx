'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, Cpu, Wallet, Users } from 'lucide-react'

const categories = [
  {
    id: 'startup',
    name: '스타트업',
    description: '창업 스토리와 성장 전략',
    icon: TrendingUp,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'tech',
    name: '테크',
    description: '최신 기술 트렌드와 혁신',
    icon: Cpu,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'investment',
    name: '투자',
    description: 'VC 인사이트와 투자 전략',
    icon: Wallet,
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'interview',
    name: '인터뷰',
    description: '창업가들의 진솔한 이야기',
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
                href={`/blog/category/${category.id}`}
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