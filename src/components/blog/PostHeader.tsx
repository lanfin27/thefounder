import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PostHeaderProps {
  title: string
  category: string
  publishedAt: string
  author: {
    name: string
    avatar?: string
  }
  readingTime: number
}

export default function PostHeader({
  title,
  category,
  publishedAt,
  author,
  readingTime,
}: PostHeaderProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-founder-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </Link>
          
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-founder-primary/10 text-founder-primary text-sm font-medium rounded-full">
              {category}
            </span>
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            {title}
          </h1>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-300" />
              <span className="font-medium">{author.name}</span>
            </div>
            
            <span>
              {formatDistanceToNow(new Date(publishedAt), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
            
            <span>{readingTime}분 읽기</span>
          </div>
        </div>
      </div>
    </div>
  )
}