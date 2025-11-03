'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronRight, Clock, Eye, Heart, Play, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Post {
  id: string
  slug?: string
  title: string
  excerpt?: string
  cover?: string
  author: string
  publishedAt?: string
  readingTime: number
  viewCount?: number
  likeCount?: number
  category: string
  youtubeId?: string
}

interface CategorySectionProps {
  title: string
  description: string
  emoji: string
  posts: Post[]
  category: string
  variant?: 'grid' | 'list' | 'masonry'
  columns?: 2 | 3 | 4
}

export default function CategorySection({
  title,
  description,
  emoji,
  posts,
  category,
  variant = 'grid',
  columns = 3
}: CategorySectionProps) {

  const getGridClass = () => {
    if (variant === 'masonry') {
      return `columns-1 md:columns-2 lg:columns-${columns} gap-6 space-y-6`
    }
    if (variant === 'list') {
      return 'grid grid-cols-1 gap-6'
    }
    return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`
  }

  return (
    <section className="py-16 bg-[var(--surface-50)]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
              style={{
                fontSize: 'var(--font-h2)',
                fontWeight: 700,
                color: 'var(--ink-900)'
              }}
            >
              <span style={{ fontSize: '2rem' }}>{emoji}</span>
              {title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                fontSize: 'var(--font-body-lg)',
                color: 'var(--ink-500)'
              }}
            >
              {description}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link href={`/${category}`}>
              <Button variant="ghost" size="md" rightIcon={<ChevronRight size={20} />}>
                더보기
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Posts Grid */}
        <div className={getGridClass()}>
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className={variant === 'masonry' ? 'break-inside-avoid' : ''}
            >
              <Link href={`/${post.category}/${post.slug || post.id}`}>
                <div className="h-full bg-[var(--surface-0)] rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer border border-[var(--border-100)]">
                  {/* Thumbnail */}
                  {post.cover && (
                    <div className="relative w-full aspect-video overflow-hidden bg-[var(--surface-100)]">
                      <Image
                        src={post.cover}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Video Play Button for Insights */}
                      {post.youtubeId && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play size={24} className="text-[var(--ink-900)] ml-1" fill="currentColor" />
                          </div>
                        </div>
                      )}

                      {/* Bookmark Button */}
                      <button
                        className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <Bookmark size={18} className="text-[var(--ink-700)]" />
                      </button>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <h3
                      className="mb-3 group-hover:text-[var(--primary-600)] transition-colors line-clamp-2"
                      style={{
                        fontSize: 'var(--font-body-lg)',
                        fontWeight: 700,
                        lineHeight: 'var(--line-body-lg)',
                        color: 'var(--ink-900)'
                      }}
                    >
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p
                        className="mb-4 line-clamp-2"
                        style={{
                          fontSize: 'var(--font-body-sm)',
                          color: 'var(--ink-500)',
                          lineHeight: 'var(--line-body-sm)'
                        }}
                      >
                        {post.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-100)]">
                      <div
                        className="flex items-center gap-2"
                        style={{
                          fontSize: 'var(--font-body-sm)',
                          color: 'var(--ink-500)'
                        }}
                      >
                        <span>{post.author}</span>
                        <span className="inline-flex items-center">
                          <Clock size={14} className="mr-1" />
                          {post.readingTime}분
                        </span>
                      </div>

                      {/* Stats */}
                      <div
                        className="flex items-center gap-3"
                        style={{
                          fontSize: 'var(--font-body-sm)',
                          color: 'var(--ink-400)'
                        }}
                      >
                        {post.viewCount && (
                          <span className="inline-flex items-center">
                            <Eye size={14} className="mr-1" />
                            {post.viewCount.toLocaleString()}
                          </span>
                        )}
                        {post.likeCount && (
                          <span className="inline-flex items-center">
                            <Heart size={14} className="mr-1" />
                            {post.likeCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Load More Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mt-12"
        >
          <Link href={`/${category}`}>
            <Button variant="outline" size="lg" rightIcon={<ChevronRight size={20} />}>
              더 많은 {title} 보기
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
