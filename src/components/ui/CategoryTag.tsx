'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CategoryTagProps {
  koreanName: string
  englishName: string
  slug: string
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export default function CategoryTag({
  koreanName,
  englishName,
  slug,
  className = '',
  size = 'medium'
}: CategoryTagProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    small: 'px-3 py-1.5 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-5 py-2.5 text-base'
  }

  return (
    <Link
      href={`/posts?category=${slug}`}
      className={cn(
        'inline-block rounded-full',
        'bg-gray-100 hover:bg-gray-200',
        'transition-all duration-200 ease-in-out',
        'font-medium relative overflow-hidden',
        'hover:shadow-md',
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="relative block">
        <span className={cn(
          'transition-all duration-200 inline-block',
          isHovered ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
        )}>
          {koreanName}
        </span>
        <span className={cn(
          'absolute inset-0 flex items-center justify-center',
          'transition-all duration-200',
          isHovered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        )}>
          {englishName}
        </span>
      </span>
    </Link>
  )
}