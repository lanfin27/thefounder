'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Clock, MessageCircle, Heart } from 'lucide-react'

interface Post {
  id: string
  title: string
  slug: string
  summary: string
  cover?: string
  tags: string[]
  publishedDate: string
  readingTime: number
  category: string
  author: string
  clapsCount: number
  commentsCount: number
}

export default function TopicPage() {
  const params = useParams()
  const topicSlug = params.slug as string
  const topicName = decodeURIComponent(topicSlug)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopicPosts()
  }, [topicSlug])

  const fetchTopicPosts = async () => {
    try {
      const response = await fetch(`/api/topics/${topicSlug}/posts`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      } else {
        console.error('Failed to fetch posts:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-8"></div>
          <div className="h-12 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-12"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl font-sans">
      {/* Header */}
      <div className="mb-12">
        <Link
          href="/topics"
          className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-green-primary mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          모든 토픽
        </Link>

        <h1 className="text-4xl font-bold text-ink-900 mb-4">{topicName}</h1>
        <p className="text-lg text-ink-600">
          {posts.length > 0
            ? `${posts.length}개의 포스트`
            : '이 토픽에 해당하는 포스트가 없습니다.'}
        </p>
      </div>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="group"
            >
              <article className="space-y-4">
                {/* Cover Image */}
                {post.cover && (
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-ink-100">
                    <Image
                      src={post.cover}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Category Badge */}
                {post.category && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-2 py-0.5 bg-ink-100 text-ink-700 text-xs font-medium rounded">
                      {post.category}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div>
                  <h2 className="text-xl font-bold text-ink-900 mb-2 group-hover:text-green-primary line-clamp-2 transition-colors">
                    {post.title}
                  </h2>

                  {post.summary && (
                    <p className="text-ink-600 text-sm line-clamp-2 mb-3">
                      {post.summary}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-ink-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{post.readingTime}분</span>
                    </div>

                    {post.clapsCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>{post.clapsCount}</span>
                      </div>
                    )}

                    {post.commentsCount > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{post.commentsCount}</span>
                      </div>
                    )}

                    <span className="text-ink-400">·</span>
                    <span>
                      {new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs text-ink-600 bg-ink-50 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-ink-400">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-ink-50 rounded-lg">
          <p className="text-ink-500 mb-4">이 토픽에 해당하는 포스트가 없습니다.</p>
          <Link
            href="/topics"
            className="inline-flex items-center gap-2 text-sm text-green-primary hover:text-green-hover font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            다른 토픽 둘러보기
          </Link>
        </div>
      )}

      {/* Related Topics (Optional - can be added later) */}
      {posts.length > 0 && (
        <div className="mt-16 pt-8 border-t border-divider">
          <h3 className="text-xl font-bold text-ink-900 mb-4">관련 토픽</h3>
          <div className="flex flex-wrap gap-2">
            {/* Extract unique tags from posts */}
            {Array.from(
              new Set(
                posts
                  .flatMap(p => p.tags)
                  .filter(tag => tag !== topicName)
              )
            )
              .slice(0, 10)
              .map(tag => (
                <Link
                  key={tag}
                  href={`/topics/${encodeURIComponent(tag)}`}
                  className="px-3 py-1.5 bg-ink-100 hover:bg-ink-200 text-ink-900 text-sm font-medium rounded-full transition-colors"
                >
                  {tag}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
