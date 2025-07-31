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
    <div className="flex items-center gap-6 border-b border-medium-gray-border mb-8 overflow-x-auto scrollbar-hide">
      {categories.map((category) => {
        const isActive = category.value === (currentCategory || '')
        const href = category.value ? `${pathname}?category=${category.value}` : pathname
        
        return (
          <Link
            key={category.id}
            href={href}
            className={`
              pb-3 text-body-small font-medium transition-all duration-medium whitespace-nowrap
              ${isActive
                ? 'text-medium-black border-b-2 border-medium-black'
                : 'text-medium-black-secondary hover:text-medium-black'
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