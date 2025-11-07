import { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Lightbulb, BarChart3, PenTool } from 'lucide-react'
import { CATEGORIES } from '@/types/post'

export const metadata: Metadata = {
  title: '카테고리 | The Founder',
  description: '창업과 비즈니스 관련 다양한 카테고리를 탐색하세요',
}

const CATEGORY_ICONS = {
  trends: TrendingUp,
  insights: Lightbulb,
  cases: BarChart3,
  blog: PenTool,
}

const CATEGORY_COLORS = {
  trends: 'bg-blue-500',
  insights: 'bg-green-500',
  cases: 'bg-purple-500',
  blog: 'bg-orange-500',
}

export default function CategoryPage() {
  const categories = Object.values(CATEGORIES)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          카테고리
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          관심 있는 주제를 선택하여 다양한 콘텐츠를 탐색해보세요
        </p>
      </div>

      {/* 카테고리 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.slug]
          const colorClass = CATEGORY_COLORS[category.slug]

          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group block p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300"
            >
              {/* 아이콘 */}
              <div className={`inline-flex items-center justify-center w-12 h-12 ${colorClass} rounded-lg mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* 카테고리 정보 */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                {category.label}
              </h3>
              <p className="text-sm text-gray-600">
                {category.description}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
