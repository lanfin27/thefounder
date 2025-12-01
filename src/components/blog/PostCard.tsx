import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import PremiumBadge from '@/components/ui/PremiumBadge'
import BookmarkButton from '@/components/posts/BookmarkButton'
import { ThumbsUp, MessageCircle } from 'lucide-react'

// 🔥 이미지 프록시 URL 생성
function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '/images/placeholder.jpg'

  // Notion S3 URL인 경우 프록시 사용
  if (originalUrl.includes('prod-files-secure.s3') || originalUrl.includes('amazonaws.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`
  }

  return originalUrl
}

interface PostCardProps {
  post: BlogPost
  variant?: 'default' | 'compact' | 'list'
}

export default function PostCard({ post, variant = 'default' }: PostCardProps) {
  if (variant === 'list') {
    return (
      <article className="group">
        <Link href={`/posts/${post.slug}`} className="flex gap-6 items-start">
          {/* 왼쪽: 텍스트 영역 */}
          <div className="flex-1 min-w-0">
            {/* 제목 */}
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors line-clamp-2">
              {post.title}
            </h3>

            {/* 요약 */}
            <p className="text-base text-gray-600 mb-4 line-clamp-2 hidden sm:block">
              {post.summary}
            </p>

            {/* 메타 정보 */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium">{post.categoryLabel || post.category}</span>
              <span>·</span>
              <span>{new Date(post.publishedDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{post.readingTime}분 읽기</span>

              {/* 👍 좋아요 개수 */}
              {post.clapsCount !== undefined && post.clapsCount > 0 && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline-flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {post.clapsCount}
                  </span>
                </>
              )}

              {/* 💬 댓글 개수 */}
              {post.commentsCount !== undefined && post.commentsCount > 0 && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline-flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.commentsCount}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 오른쪽: 썸네일 이미지 */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {post.cover && (
              <Image
                src={post.cover}
                alt={post.title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 96px, 128px"
              />
            )}
          </div>
        </Link>

        {/* 북마크 버튼 */}
        <div className="flex justify-end mt-4">
          <BookmarkButton postId={post.slug} />
        </div>

        {/* 구분선 */}
        <div className="mt-8 border-b border-gray-200" />
      </article>
    )
  }

  if (variant === 'compact') {
    return (
      <article className="article-card group">
        <Link href={`/posts/${post.slug}`} className="block">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-caption font-medium text-medium-green">
                {post.category}
              </span>
              {post.isPremium && (
                <span className="text-caption font-medium text-medium-green">
                  Premium
                </span>
              )}
            </div>
            
            <h3 className="text-heading-4 font-serif text-medium-black line-clamp-2 group-hover:text-medium-green transition-colors text-korean">
              {post.title}
            </h3>
            
            <p className="text-body-small text-medium-black-secondary line-clamp-3 text-korean">
              {post.summary}
            </p>
            
            <div className="flex items-center gap-3 text-caption text-medium-black-tertiary">
              <span className="font-medium text-medium-black">{post.author}</span>
              <span>·</span>
              <span>{post.readingTime}분 읽기</span>
            </div>
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article className="article-card group">
      <Link href={`/posts/${post.slug}`}>
        {post.cover && (
          <div className="relative h-52 overflow-hidden rounded-lg mb-4">
            <Image
              src={getProxiedImageUrl(post.cover)}
              alt={post.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
            {post.isPremium && (
              <div className="absolute top-4 left-4 z-10">
                <PremiumBadge variant="small" />
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-caption font-medium text-medium-green">
              {post.category}
            </span>
            <span className="text-caption text-medium-black-tertiary">
              {formatDistanceToNow(new Date(post.publishedDate), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          
          <h3 className="text-heading-4 font-serif text-medium-black line-clamp-2 group-hover:text-medium-green transition-colors text-korean">
            {post.title}
          </h3>
          
          <p className="text-body-small text-medium-black-secondary line-clamp-3 text-korean">
            {post.summary}
          </p>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-medium-gray" />
              <div>
                <p className="text-body-small font-medium text-medium-black">
                  {post.author}
                </p>
                <p className="text-caption text-medium-black-tertiary">
                  {post.readingTime}분 읽기
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}