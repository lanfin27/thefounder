import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import PremiumBadge from '@/components/ui/PremiumBadge'

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
      <article className="article-card group py-6 border-b border-medium-gray-border last:border-0">
        <Link href={`/posts/${post.slug}`} className="block">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-caption font-medium text-medium-green">
                  {post.category}
                </span>
                {post.isPremium && (
                  <span className="text-caption font-medium text-medium-green">
                    Premium
                  </span>
                )}
              </div>
              
              <h3 className="text-heading-4 font-serif text-medium-black mb-2 line-clamp-2 group-hover:text-medium-green transition-colors text-korean">
                {post.title}
              </h3>
              
              <p className="text-body-small text-medium-black-secondary line-clamp-2 mb-3 text-korean">
                {post.summary}
              </p>
              
              <div className="flex items-center gap-3 text-caption text-medium-black-tertiary">
                <span className="font-medium text-medium-black">{post.author}</span>
                <span>·</span>
                <span>{post.readingTime}분 읽기</span>
                <span>·</span>
                <span>
                  {formatDistanceToNow(new Date(post.publishedDate), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
            
            {post.cover && (
              <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={getProxiedImageUrl(post.cover)}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="128px"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </Link>
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