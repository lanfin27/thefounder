import Link from 'next/link'
import { BlogPost } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, Tag } from 'lucide-react'

interface PostCardProps {
  post: BlogPost
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300">
      <Link href={`/posts/${post.slug}`}>
        {post.cover && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={post.cover}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {post.isPremium && (
              <div className="absolute top-4 right-4 bg-founder-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                Premium
              </div>
            )}
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs font-medium text-founder-primary">
              {post.category}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(post.publishedDate), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-founder-primary transition-colors">
            {post.title}
          </h3>
          
          <p className="text-gray-600 line-clamp-2 mb-4">
            {post.summary}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{post.author}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.readingTime}분
              </span>
              {post.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {post.tags.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}