import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Post {
  id: string
  title: string
  slug: string
  category: string
  cover_image?: string | null
  summary?: string | null
  published_at?: string
}

interface FeaturedCardProps {
  category: string
  emoji: string
  post: Post | null
  bgColor: string
}

export default function FeaturedCard({ category, emoji, post, bgColor }: FeaturedCardProps) {
  if (!post) {
    return (
      <div className={`${bgColor} rounded-xl p-6 flex flex-col justify-center items-center min-h-[300px]`}>
        <span className="text-4xl mb-3">{emoji}</span>
        <p className="text-gray-600 text-center">곧 업데이트됩니다</p>
      </div>
    )
  }

  const categorySlug = post.category.toLowerCase()

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ko,
      })
    } catch {
      return ''
    }
  }

  return (
    <Link href={`/${categorySlug}/${post.slug}`}>
      <article className={`${bgColor} rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{emoji}</span>
          <span className="font-bold text-lg">{category}</span>
        </div>

        {post.cover_image && (
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          </div>
        )}

        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-green-primary transition-colors flex-grow">
          {post.title}
        </h3>

        {post.summary && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {post.summary}
          </p>
        )}

        {post.published_at && (
          <p className="text-gray-500 text-xs mt-auto">
            {formatDate(post.published_at)}
          </p>
        )}
      </article>
    </Link>
  )
}
