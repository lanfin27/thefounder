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
  author?: string | null
  reading_time?: number | null
}

interface PostCardProps {
  post: Post
  category: string
}

export default function PostCard({ post, category }: PostCardProps) {
  const getCategoryStyles = () => {
    switch(category) {
      case 'trend':
        return 'aspect-square' // 정사각형 이미지
      case 'insight':
        return 'aspect-video' // 16:9 비디오
      case 'casestudy':
        return 'aspect-[16/10]' // 가로 직사각형
      default:
        return 'aspect-[4/3]'
    }
  }

  const getCategoryEmoji = () => {
    switch(category) {
      case 'trend':
        return '🔥'
      case 'insight':
        return '🎬'
      case 'casestudy':
        return '📚'
      case 'blog':
        return '✍️'
      default:
        return '📄'
    }
  }

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
    <article className="group cursor-pointer">
      <Link href={`/${category}/${post.slug}`}>
        <div className="space-y-3">
          {/* 이미지/썸네일 */}
          <div className={`${getCategoryStyles()} overflow-hidden rounded-lg bg-gray-100 relative`}>
            {post.cover_image ? (
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {getCategoryEmoji()}
              </div>
            )}
          </div>

          {/* 콘텐츠 */}
          <div>
            <h3 className="font-bold text-lg group-hover:text-green-600 transition-colors line-clamp-2">
              {post.title}
            </h3>
            {post.summary && (
              <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                {post.summary}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
              <span>{post.author || 'The Founder'}</span>
              {post.published_at && (
                <>
                  <span>·</span>
                  <span>{formatDate(post.published_at)}</span>
                </>
              )}
              {post.reading_time && (
                <>
                  <span>·</span>
                  <span>{post.reading_time}분 읽기</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}
