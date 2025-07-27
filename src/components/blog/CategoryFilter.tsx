'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface CategoryFilterProps {
  currentCategory?: string
}

const categories = [
  { id: 'all', name: '전체', value: '' },
  { id: 'newsletter', name: '뉴스레터', value: '뉴스레터' },
  { id: 'saas', name: 'SaaS', value: 'SaaS' },
  { id: 'blog', name: '블로그', value: '블로그' },
  { id: 'startup', name: '창업', value: '창업' },
]

export default function CategoryFilter({ currentCategory }: CategoryFilterProps) {
  const pathname = usePathname()
  
  return (
    <div className="flex flex-wrap gap-2 justify-center mb-8">
      {categories.map((category) => {
        const isActive = category.value === (currentCategory || '')
        const href = category.value ? `${pathname}?category=${category.value}` : pathname
        
        return (
          <Link
            key={category.id}
            href={href}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${isActive
                ? 'bg-founder-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            {category.name}
          </Link>
        )
      })}
    </div>
  )
}