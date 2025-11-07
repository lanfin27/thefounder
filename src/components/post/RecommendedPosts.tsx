import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/types'

interface RecommendedPostsProps {
  posts: BlogPost[]
  currentPostSlug: string
}

export default function RecommendedPosts({
  posts,
  currentPostSlug
}: RecommendedPostsProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/posts/${post.slug}`}
          className="group flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 hover:opacity-80 transition-opacity"
        >
          {/* Text Area (Left) */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
              {post.title}
            </h3>

            {/* Summary */}
            {post.summary && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                {post.summary}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <time dateTime={post.publishedDate}>
                {new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </time>
              {post.readingTime && (
                <>
                  <span>·</span>
                  <span>{post.readingTime}분</span>
                </>
              )}
            </div>
          </div>

          {/* Thumbnail Image (Right) */}
          {post.cover && (
            <div className="flex-shrink-0 w-28 h-28 relative overflow-hidden rounded bg-gray-100">
              <Image
                src={post.cover}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
