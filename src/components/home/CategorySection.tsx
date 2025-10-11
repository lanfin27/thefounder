'use client'

import { motion } from 'framer-motion'
import CategoryTag from '@/components/ui/CategoryTag'
import { CATEGORIES } from '@/constants/categories'
import { TrendingUp, Lightbulb, BookOpen, Trophy } from 'lucide-react'

// Icon mapping for categories
const categoryIcons = {
  trend: TrendingUp,
  insight: Lightbulb,
  blog: BookOpen,
  casestudy: Trophy
}

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

        {/* Category Tags with hover animation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {CATEGORIES.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <CategoryTag
                koreanName={category.koreanName}
                englishName={category.englishName}
                slug={category.slug}
                size="large"
              />
            </motion.div>
          ))}
        </div>

        {/* Category Cards with descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((category, index) => {
            const Icon = categoryIcons[category.id as keyof typeof categoryIcons]

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="group"
              >
                <div className="p-6 bg-white border border-medium-gray-border rounded-lg hover:border-medium-green transition-all duration-medium h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-medium-green-light flex items-center justify-center group-hover:bg-medium-green transition-colors">
                      <Icon className="w-5 h-5 text-medium-green group-hover:text-white" />
                    </div>
                  </div>
                  <h3 className="text-heading-4 font-serif text-medium-black mb-2 group-hover:text-medium-green transition-colors text-korean">
                    {category.koreanName}
                  </h3>
                  <p className="text-body-small text-medium-black-secondary text-korean">
                    {category.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}